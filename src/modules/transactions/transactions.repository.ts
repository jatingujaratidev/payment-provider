import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryRunner, Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { TransactionStateHistory } from './transaction-state-history.entity';
import { IdempotencyKey } from '../payments/idempotency-key.entity';
@Injectable()
export class TransactionsRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(TransactionStateHistory)
    private readonly history: Repository<TransactionStateHistory>,
    @InjectRepository(IdempotencyKey)
    private readonly idempotency: Repository<IdempotencyKey>,
  ) {}
  manager(qr: QueryRunner) {
    return qr.manager;
  }
  async findIdempotencyWithTransaction(
    qr: QueryRunner,
    key: string,
  ): Promise<IdempotencyKey | null> {
    return qr.manager.findOne(IdempotencyKey, {
      where: { key },
      relations: ['transaction'],
    });
  }
  async deleteExpiredIdempotency(qr: QueryRunner, key: string): Promise<void> {
    await qr.manager
      .createQueryBuilder()
      .delete()
      .from(IdempotencyKey)
      .where('key = :key AND expires_at < NOW()', { key })
      .execute();
  }
  async saveTransaction(
    qr: QueryRunner,
    tx: Transaction,
  ): Promise<Transaction> {
    return qr.manager.save(tx);
  }
  async appendHistory(
    qr: QueryRunner,
    row: Pick<
      TransactionStateHistory,
      'transactionId' | 'fromStatus' | 'toStatus' | 'reason' | 'metadata'
    >,
  ): Promise<void> {
    const entity = qr.manager.create(TransactionStateHistory, row);
    await qr.manager.save(entity);
  }
  async saveIdempotency(qr: QueryRunner, row: IdempotencyKey): Promise<void> {
    await qr.manager.save(row);
  }
  async updateIdempotencySnapshot(
    qr: QueryRunner | null,
    key: string,
    snapshot: Record<string, unknown>,
  ): Promise<void> {
    const repo = qr
      ? qr.manager.getRepository(IdempotencyKey)
      : this.idempotency;
    await repo.update({ key }, { responseSnapshot: snapshot as never });
  }
  async findTransactionById(
    qr: QueryRunner | null,
    id: string,
  ): Promise<Transaction | null> {
    const repo = qr ? qr.manager.getRepository(Transaction) : this.transactions;
    return repo.findOne({ where: { id } });
  }
  async patchTransaction(
    qr: QueryRunner | null,
    id: string,
    patch: Partial<
      Pick<
        Transaction,
        | 'status'
        | 'authorizationCode'
        | 'failureReason'
        | 'failureCode'
        | 'retryCount'
        | 'bankRequestId'
        | 'metadata'
        | 'updatedAt'
      >
    >,
  ): Promise<void> {
    const repo = qr ? qr.manager.getRepository(Transaction) : this.transactions;
    await repo.update({ id }, { ...patch, updatedAt: new Date() } as never);
  }
}
