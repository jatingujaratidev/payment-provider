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
import { Exclude } from 'class-transformer';
import { User } from '../users/user.entity';
import { Transaction } from '../transactions/transaction.entity';
@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;
  @ManyToOne(() => User, (user) => user.cards, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;
  @Column({ name: 'cardholder_name', type: 'varchar', length: 255 })
  cardholderName!: string;
  @Column({ name: 'last_four', type: 'char', length: 4 })
  lastFour!: string;
  @Column({ name: 'card_brand', type: 'varchar', length: 50, nullable: true })
  cardBrand!: string | null;
  @Column({ name: 'expiry_month', type: 'char', length: 2 })
  expiryMonth!: string;
  @Column({ name: 'expiry_year', type: 'char', length: 4 })
  expiryYear!: string;
  @Exclude()
  @Column({ name: 'encrypted_card_number', type: 'text' })
  encryptedCardNumber!: string;
  @Exclude()
  @Column({ name: 'encryption_iv', type: 'varchar', length: 255 })
  encryptionIv!: string;
  @Exclude()
  @Column({ name: 'encryption_tag', type: 'varchar', length: 255 })
  encryptionTag!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
  @OneToMany(() => Transaction, (tx) => tx.card)
  transactions?: Transaction[];
}
