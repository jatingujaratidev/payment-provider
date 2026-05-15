import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { createHash } from 'crypto';
import { ClsService } from 'nestjs-cls';
import { Transaction } from '../transactions/transaction.entity';
import { TransactionStatus } from '../transactions/transaction-status.enum';
import { TransactionStateMachine } from '../transactions/transaction-state-machine';
import { TransactionsRepository } from '../transactions/transactions.repository';
import { CardsService } from '../cards/cards.service';
import {
  MockBankService,
  BankFailureResponse,
  BankResponse,
  BankSuccessResponse,
  BankTransportError,
} from '../bank/mock-bank.service';
import {
  retryWithBackoff,
  DEFAULT_RETRY_CONFIG,
} from '../../common/utils/retry.util';
import { IDEMPOTENCY_TTL_HOURS } from '../../common/constants/app.constants';
import { IdempotencyKey } from './idempotency-key.entity';
import { AppLoggerService } from '../../common/logging/logger.service';
import { CLS_TRANSACTION_ID } from '../../common/cls/cls.constants';
import { ErrorCodes } from '../../common/errors/error-codes';
import { MetricsService } from '../metrics/metrics.service';
import { isUuid } from '../../common/utils/uuid.util';
class RetryableBankError extends Error {
  constructor(public readonly failure: BankFailureResponse) {
    super(failure.error_code);
    this.name = 'RetryableBankError';
  }
}
function advisoryPair(key: string): [number, number] {
  const h = createHash('sha256').update(key, 'utf8').digest();
  return [h.readInt32BE(0), h.readInt32BE(4)];
}
function inProgress(status: TransactionStatus): boolean {
  return (
    status === TransactionStatus.INITIATED ||
    status === TransactionStatus.PROCESSING ||
    status === TransactionStatus.AUTHORIZED ||
    status === TransactionStatus.RETRYING
  );
}
@Injectable()
export class PaymentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly cardsService: CardsService,
    private readonly bank: MockBankService,
    private readonly stateMachine: TransactionStateMachine,
    private readonly logger: AppLoggerService,
    private readonly cls: ClsService,
    private readonly metrics: MetricsService,
  ) {}
  async processPayment(
    userId: string,
    input: {
      cardToken: string;
      amount: number;
      currency: string;
      idempotencyKey: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<
    | Record<string, unknown>
    | {
        idempotencyReplay: true;
        data: Record<string, unknown>;
      }
  > {
    if (!isUuid(input.idempotencyKey)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'idempotency_key must be a UUID',
      });
    }
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const [k1, k2] = advisoryPair(input.idempotencyKey);
      await qr.query('SELECT pg_advisory_xact_lock($1, $2)', [k1, k2]);
      await this.transactionsRepository.deleteExpiredIdempotency(
        qr,
        input.idempotencyKey,
      );
      const existing =
        await this.transactionsRepository.findIdempotencyWithTransaction(
          qr,
          input.idempotencyKey,
        );
      if (existing && existing.expiresAt > new Date()) {
        const linked = existing.transaction;
        if (linked.userId !== userId) {
          throw new ConflictException({
            code: ErrorCodes.DUPLICATE_IDEMPOTENCY_KEY,
            message: 'Idempotency key already used by another user',
          });
        }
        if (existing.responseSnapshot) {
          await qr.commitTransaction();
          return {
            idempotencyReplay: true,
            data: existing.responseSnapshot,
          };
        }
        if (inProgress(linked.status)) {
          throw new ConflictException({
            code: ErrorCodes.PAYMENT_PROCESSING_IN_PROGRESS,
            message: 'Payment is still processing for this idempotency key',
          });
        }
      }
      const card = await this.cardsService.getActiveByTokenForUser(
        input.cardToken,
        userId,
      );
      this.cardsService.assertCardPayable(card, userId);
      const amountStr = input.amount.toFixed(2);
      const tx = new Transaction();
      tx.userId = userId;
      tx.cardId = card.id;
      tx.idempotencyKey = input.idempotencyKey;
      tx.amount = amountStr;
      tx.currency = input.currency.toUpperCase();
      tx.status = TransactionStatus.INITIATED;
      tx.metadata = input.metadata ?? null;
      const savedTx = await this.transactionsRepository.saveTransaction(qr, tx);
      this.stateMachine.assertTransition(null, TransactionStatus.INITIATED);
      await this.transactionsRepository.appendHistory(qr, {
        transactionId: savedTx.id,
        fromStatus: null,
        toStatus: TransactionStatus.INITIATED,
        reason: 'Payment created',
        metadata: { amount: amountStr, currency: tx.currency },
      });
      this.stateMachine.emitTransition({
        transactionId: savedTx.id,
        from: null,
        to: TransactionStatus.INITIATED,
        reason: 'Payment created',
        metadata: { amount: amountStr },
      });
      const idRow = new IdempotencyKey();
      idRow.key = input.idempotencyKey;
      idRow.transactionId = savedTx.id;
      idRow.expiresAt = new Date(
        Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000,
      );
      await this.transactionsRepository.saveIdempotency(qr, idRow);
      await qr.commitTransaction();
      return this.finalizePayment(savedTx.id, input.idempotencyKey);
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }
  private async finalizePayment(
    transactionId: string,
    idempotencyKey: string,
  ): Promise<Record<string, unknown>> {
    this.cls.set(CLS_TRANSACTION_ID, transactionId);
    await this.withTransaction(async (qr) => {
      await this.transitionStatus(
        qr,
        transactionId,
        TransactionStatus.PROCESSING,
        'Entering processing',
        null,
      );
    });
    const started = Date.now();
    let attempt = 0;
    let bankResult: BankSuccessResponse | BankFailureResponse;
    try {
      bankResult = await retryWithBackoff(
        async () => {
          if (attempt > 0) {
            await this.withTransaction(async (qr) => {
              await this.transitionStatus(
                qr,
                transactionId,
                TransactionStatus.PROCESSING,
                'Retry attempt',
                { attempt },
              );
            });
          }
          attempt += 1;
          const latest = (await this.transactionsRepository.findTransactionById(
            null,
            transactionId,
          )) as Transaction;
          let res: BankResponse;
          try {
            res = await this.bank.authorizePayment({
              amount: latest.amount,
              currency: latest.currency,
              cardToken: 'redacted',
            });
          } catch (err) {
            if (err instanceof BankTransportError) {
              const synthetic: BankFailureResponse = {
                success: false,
                error_code: err.transportCode,
                error_message: err.message,
                bank_request_id: `transport_${Date.now().toString(36)}`,
                is_retryable: true,
              };
              await this.handleRetryableFailure(
                transactionId,
                synthetic,
                attempt,
              );
            }
            throw err;
          }
          if (res.success) {
            return res;
          }
          if (res.is_retryable) {
            await this.handleRetryableFailure(transactionId, res, attempt);
          }
          return res;
        },
        (err) => err instanceof RetryableBankError,
        DEFAULT_RETRY_CONFIG,
        ({ attemptIndex, delayMs, error }) => {
          this.logger.warn('Payment backoff before bank retry', {
            eventType: 'RETRY_BACKOFF',
            transactionId,
            metadata: {
              attempt_index: attemptIndex,
              delay_ms: delayMs,
              error:
                error instanceof Error
                  ? error.message
                  : typeof error === 'string'
                    ? error
                    : error == null
                      ? ''
                      : '[retry_error]',
            },
          });
        },
      );
    } catch (e) {
      let failureCode = 'RETRY_EXHAUSTED';
      let failureReason = 'Payment failed after retries';
      if (e instanceof RetryableBankError) {
        failureCode = e.failure.error_code;
        failureReason = e.failure.error_message;
      }
      await this.withTransaction(async (qr) => {
        const fresh = (await this.transactionsRepository.findTransactionById(
          qr,
          transactionId,
        )) as Transaction;
        if (
          fresh.status === TransactionStatus.PROCESSING ||
          fresh.status === TransactionStatus.RETRYING
        ) {
          await this.transitionStatus(
            qr,
            transactionId,
            TransactionStatus.FAILED,
            'Retries exhausted',
            { error: e instanceof Error ? e.message : String(e) },
          );
        }
        await this.transactionsRepository.patchTransaction(qr, transactionId, {
          failureCode,
          failureReason,
        });
      });
      const duration = Date.now() - started;
      this.metrics.recordPaymentDuration(duration);
      const snapshot = await this.buildSnapshot(transactionId);
      await this.transactionsRepository.updateIdempotencySnapshot(
        null,
        idempotencyKey,
        snapshot,
      );
      return snapshot;
    }
    if (!bankResult.success) {
      await this.withTransaction(async (qr) => {
        await this.transitionStatus(
          qr,
          transactionId,
          TransactionStatus.FAILED,
          'Bank declined',
          { error_code: bankResult.error_code },
        );
        await this.transactionsRepository.patchTransaction(qr, transactionId, {
          failureCode: bankResult.error_code,
          failureReason: bankResult.error_message,
          bankRequestId: bankResult.bank_request_id,
        });
      });
      const duration = Date.now() - started;
      this.metrics.recordPaymentDuration(duration);
      const snapshot = await this.buildSnapshot(transactionId);
      await this.transactionsRepository.updateIdempotencySnapshot(
        null,
        idempotencyKey,
        snapshot,
      );
      return snapshot;
    }
    const authorized = bankResult;
    await this.withTransaction(async (qr) => {
      await this.transitionStatus(
        qr,
        transactionId,
        TransactionStatus.AUTHORIZED,
        'Bank authorized',
        { bank_request_id: authorized.bank_request_id },
      );
      await this.transactionsRepository.patchTransaction(qr, transactionId, {
        authorizationCode: authorized.authorization_code,
        bankRequestId: authorized.bank_request_id,
      });
      await this.transitionStatus(
        qr,
        transactionId,
        TransactionStatus.CAPTURED,
        'Captured',
        null,
      );
    });
    const duration = Date.now() - started;
    this.metrics.recordPaymentDuration(duration);
    const snapshot = await this.buildSnapshot(transactionId);
    await this.transactionsRepository.updateIdempotencySnapshot(
      null,
      idempotencyKey,
      snapshot,
    );
    return snapshot;
  }
  private async handleRetryableFailure(
    transactionId: string,
    res: BankFailureResponse,
    attempt: number,
  ): Promise<never> {
    await this.withTransaction(async (qr) => {
      const fresh = (await this.transactionsRepository.findTransactionById(
        qr,
        transactionId,
      )) as Transaction;
      await this.transitionStatus(
        qr,
        transactionId,
        TransactionStatus.RETRYING,
        'Retryable bank failure',
        { error_code: res.error_code },
      );
      await this.transactionsRepository.patchTransaction(qr, transactionId, {
        retryCount: fresh.retryCount + 1,
        bankRequestId: res.bank_request_id,
      });
    });
    this.metrics.recordRetry();
    this.logger.warn('Payment retry scheduled', {
      eventType: 'RETRY_ATTEMPT',
      transactionId,
      metadata: { attempt, error_code: res.error_code },
    });
    throw new RetryableBankError(res);
  }
  private async withTransaction<T>(
    fn: (qr: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const result = await fn(qr);
      await qr.commitTransaction();
      return result;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }
  private async transitionStatus(
    qr: QueryRunner,
    transactionId: string,
    to: TransactionStatus,
    reason: string | null,
    metadata: Record<string, unknown> | null,
  ): Promise<void> {
    const tx = await this.transactionsRepository.findTransactionById(
      qr,
      transactionId,
    );
    if (!tx) {
      throw new Error('Transaction not found for transition');
    }
    const from = tx.status;
    this.stateMachine.assertTransition(from, to);
    await this.transactionsRepository.appendHistory(qr, {
      transactionId,
      fromStatus: from,
      toStatus: to,
      reason,
      metadata,
    });
    await this.transactionsRepository.patchTransaction(qr, transactionId, {
      status: to,
    });
    this.stateMachine.emitTransition({
      transactionId,
      from,
      to,
      reason: reason ?? undefined,
      metadata: metadata ?? undefined,
    });
  }
  private async buildSnapshot(
    transactionId: string,
  ): Promise<Record<string, unknown>> {
    const tx = await this.transactionsRepository.findTransactionById(
      null,
      transactionId,
    );
    if (!tx) {
      return { transaction_id: transactionId, status: 'UNKNOWN' };
    }
    return {
      transaction_id: tx.id,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      authorization_code: tx.authorizationCode,
      failure_code: tx.failureCode,
      failure_reason: tx.failureReason,
      retry_count: tx.retryCount,
      bank_request_id: tx.bankRequestId,
    };
  }
}
