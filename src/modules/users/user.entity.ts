import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Card } from '../cards/card.entity';
import { Transaction } from '../transactions/transaction.entity';
import { UserRole } from './user-role.enum';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;
  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'users_role_enum',
    default: UserRole.USER,
  })
  role!: UserRole;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
  @OneToMany(() => Card, (card) => card.user)
  cards?: Card[];
  @OneToMany(() => Transaction, (tx) => tx.user)
  transactions?: Transaction[];
}
