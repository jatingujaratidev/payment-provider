process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT ?? '3000';
process.env.APP_NAME = process.env.APP_NAME ?? 'payment-provider';
process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.DB_PORT ?? '5432';
process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'postgres';
process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'postgres';
process.env.DB_NAME = process.env.DB_NAME ?? 'payment_provider';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'test_jwt_secret_value_minimum_32_characters_long';
process.env.JWT_EXPIRY = process.env.JWT_EXPIRY ?? '15m';
process.env.CARD_ENCRYPTION_KEY =
  process.env.CARD_ENCRYPTION_KEY ??
  'test_card_encryption_key_minimum_32_chars!!';
process.env.THROTTLE_TTL = process.env.THROTTLE_TTL ?? '60000';
process.env.THROTTLE_LIMIT = process.env.THROTTLE_LIMIT ?? '100';
process.env.ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000';
