import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Transaction } from '../transactions/transaction.entity';
@Entity('idempotency_keys')
export class IdempotencyKey {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  key!: string;
  @Column({ name: 'transaction_id', type: 'uuid' })
  transactionId!: string;
  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction;
  @Column({ name: 'response_snapshot', type: 'jsonb', nullable: true })
  responseSnapshot!: Record<string, unknown> | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;
}
