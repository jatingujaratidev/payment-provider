import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { TransactionStateHistory } from './transaction-state-history.entity';
import { IdempotencyKey } from '../payments/idempotency-key.entity';
import { TransactionsRepository } from './transactions.repository';
import { TransactionStateMachine } from './transaction-state-machine';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionStateHistory,
      IdempotencyKey,
    ]),
  ],
  providers: [TransactionsRepository, TransactionStateMachine],
  exports: [TransactionsRepository, TransactionStateMachine, TypeOrmModule],
})
export class TransactionsModule {}
