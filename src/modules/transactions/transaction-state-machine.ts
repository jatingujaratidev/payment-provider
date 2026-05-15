import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionStatus } from './transaction-status.enum';
export interface StateTransitionContext {
  transactionId: string;
  from: TransactionStatus | null;
  to: TransactionStatus;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}
const TRANSITION_KEYS = new Set<string>([
  `${TransactionStatus.INITIATED}->${TransactionStatus.PROCESSING}`,
  `${TransactionStatus.PROCESSING}->${TransactionStatus.AUTHORIZED}`,
  `${TransactionStatus.PROCESSING}->${TransactionStatus.FAILED}`,
  `${TransactionStatus.PROCESSING}->${TransactionStatus.RETRYING}`,
  `${TransactionStatus.AUTHORIZED}->${TransactionStatus.CAPTURED}`,
  `${TransactionStatus.RETRYING}->${TransactionStatus.PROCESSING}`,
  `${TransactionStatus.RETRYING}->${TransactionStatus.FAILED}`,
  `NULL->${TransactionStatus.INITIATED}`,
]);
@Injectable()
export class TransactionStateMachine {
  constructor(private readonly events: EventEmitter2) {}
  assertTransition(
    from: TransactionStatus | null,
    to: TransactionStatus,
  ): void {
    const fromKey = from === null ? 'NULL' : from;
    const key = `${fromKey}->${to}`;
    if (!TRANSITION_KEYS.has(key)) {
      throw new Error(`Invalid transition from ${String(from)} to ${to}`);
    }
  }
  emitTransition(ctx: StateTransitionContext): void {
    this.events.emit('transaction.state.changed', ctx);
  }
}
