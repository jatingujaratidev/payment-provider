import * as Joi from 'joi';
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  APP_NAME: Joi.string().default('payment-provider'),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().integer().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRY: Joi.string().default('15m'),
  CARD_ENCRYPTION_KEY: Joi.string().min(32).required(),
  THROTTLE_TTL: Joi.number().integer().positive().default(60000),
  THROTTLE_LIMIT: Joi.number().integer().positive().default(100),
  ALLOWED_ORIGINS: Joi.string().required(),
  METRICS_API_KEY: Joi.string().allow('').optional(),
});
