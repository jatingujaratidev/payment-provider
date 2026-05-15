import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { User } from '../modules/users/user.entity';
import { Card } from '../modules/cards/card.entity';
import { Transaction } from '../modules/transactions/transaction.entity';
import { TransactionStateHistory } from '../modules/transactions/transaction-state-history.entity';
import { IdempotencyKey } from '../modules/payments/idempotency-key.entity';
import { InitialSchema1730000000000 } from './migrations/1730000000000-InitialSchema';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'payment_provider',
  entities: [User, Card, Transaction, TransactionStateHistory, IdempotencyKey],
  migrations: [InitialSchema1730000000000],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};
export default new DataSource(dataSourceOptions);
