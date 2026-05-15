import * as fs from 'node:fs';
import * as path from 'node:path';
import { Client } from 'pg';
import * as dotenv from 'dotenv';
export default async function globalSetup(): Promise<void> {
  const root = path.join(__dirname, '..');
  dotenv.config({ path: path.join(root, '.env') });
  const host = process.env.DB_HOST ?? 'localhost';
  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  const user = process.env.DB_USERNAME ?? 'postgres';
  const password = process.env.DB_PASSWORD ?? '';
  const database = 'postgres';
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    connectionTimeoutMillis: 5000,
  });
  let ok = false;
  try {
    await client.connect();
    ok = true;
  } catch {
    ok = false;
  } finally {
    await client.end().catch(() => undefined);
  }
  const flagPath = path.join(__dirname, '.e2e-db');
  fs.writeFileSync(flagPath, ok ? '1' : '0', 'utf8');
  if (!ok) {
    console.warn(
      '[e2e] PostgreSQL not reachable with current .env (DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME). E2E suites will be skipped. Start Docker (`docker compose up -d postgres`) or fix DB credentials.',
    );
  }
}
