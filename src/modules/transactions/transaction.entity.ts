import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Card } from '../cards/card.entity';
import { TransactionStatus } from './transaction-status.enum';
import { TransactionStateHistory } from './transaction-state-history.entity';
@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;
  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
  @Column({ name: 'card_id', type: 'uuid' })
  cardId!: string;
  @ManyToOne(() => Card, (card) => card.transactions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'card_id' })
  card!: Card;
  @Index({ unique: true })
  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 255,
    unique: true,
  })
  idempotencyKey!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;
  @Column({ type: 'char', length: 3, default: 'USD' })
  currency!: string;
  @Index()
  @Column({
    type: 'enum',
    enum: TransactionStatus,
    enumName: 'transactions_status_enum',
  })
  status!: TransactionStatus;
  @Column({
    name: 'authorization_code',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  authorizationCode!: string | null;
  @Column({
    name: 'failure_reason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  failureReason!: string | null;
  @Column({
    name: 'failure_code',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  failureCode!: string | null;
  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;
  @Column({
    name: 'bank_request_id',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  bankRequestId!: string | null;
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;
  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
  @OneToMany(() => TransactionStateHistory, (h) => h.transaction)
  stateHistory?: TransactionStateHistory[];
}
