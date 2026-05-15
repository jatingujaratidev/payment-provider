import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';
@Entity('transaction_state_history')
export class TransactionStateHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Index()
  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;
  @ManyToOne(() => Transaction, (tx) => tx.stateHistory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;
  @Column({ name: 'from_status', type: 'varchar', length: 50, nullable: true })
  fromStatus!: string | null;
  @Column({ name: 'to_status', type: 'varchar', length: 50 })
  toStatus!: string;
  @Column({ type: 'text', nullable: true })
  reason!: string | null;
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
