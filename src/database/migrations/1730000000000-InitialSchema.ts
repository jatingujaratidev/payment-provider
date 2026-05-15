import { MigrationInterface, QueryRunner } from 'typeorm';
export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM('user', 'admin')
    `);
    await queryRunner.query(`
      CREATE TYPE "public"."transactions_status_enum" AS ENUM(
        'INITIATED',
        'PROCESSING',
        'AUTHORIZED',
        'CAPTURED',
        'FAILED',
        'RETRYING'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'user',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`,
    );
    await queryRunner.query(`
      CREATE TABLE "cards" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token" character varying(255) NOT NULL,
        "cardholder_name" character varying(255) NOT NULL,
        "last_four" char(4) NOT NULL,
        "card_brand" character varying(50),
        "expiry_month" char(2) NOT NULL,
        "expiry_year" char(4) NOT NULL,
        "encrypted_card_number" text NOT NULL,
        "encryption_iv" character varying(255) NOT NULL,
        "encryption_tag" character varying(255) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cards" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_cards_token" UNIQUE ("token"),
        CONSTRAINT "FK_cards_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_cards_user_id" ON "cards" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cards_token" ON "cards" ("token")`,
    );
    await queryRunner.query(`
      CREATE TABLE "transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "card_id" uuid NOT NULL,
        "idempotency_key" character varying(255) NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "currency" char(3) NOT NULL DEFAULT 'USD',
        "status" "public"."transactions_status_enum" NOT NULL,
        "authorization_code" character varying(255),
        "failure_reason" character varying(500),
        "failure_code" character varying(100),
        "retry_count" integer NOT NULL DEFAULT 0,
        "bank_request_id" character varying(255),
        "metadata" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_transactions_idempotency_key" UNIQUE ("idempotency_key"),
        CONSTRAINT "FK_transactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_transactions_card" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_user_id" ON "transactions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_transactions_idempotency_key" ON "transactions" ("idempotency_key")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_status" ON "transactions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_transactions_created_at" ON "transactions" ("created_at")`,
    );
    await queryRunner.query(`
      CREATE TABLE "transaction_state_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "transaction_id" uuid NOT NULL,
        "from_status" character varying(50),
        "to_status" character varying(50) NOT NULL,
        "reason" text,
        "metadata" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_transaction_state_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tsh_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_transaction_state_history_transaction_id" ON "transaction_state_history" ("transaction_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "key" character varying(255) NOT NULL,
        "transaction_id" uuid NOT NULL,
        "response_snapshot" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMPTZ NOT NULL,
        CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("key"),
        CONSTRAINT "FK_idempotency_transaction" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE
      )
    `);
  }
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "idempotency_keys"`);
    await queryRunner.query(`DROP TABLE "transaction_state_history"`);
    await queryRunner.query(`DROP TABLE "transactions"`);
    await queryRunner.query(`DROP TABLE "cards"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
