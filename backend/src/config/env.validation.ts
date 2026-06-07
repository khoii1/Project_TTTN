import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().optional(),
  API_PORT: Joi.number().default(3000),
  API_VERSION: Joi.string().default('v1'),
  ENABLE_SWAGGER: Joi.string().valid('true', 'false').allow('').optional(),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().optional(),
  JWT_ACCESS_TOKEN_SECRET: Joi.string().default('access_secret'),
  JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_SECRET: Joi.string().default('refresh_secret'),
  JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  BCRYPT_ROUNDS: Joi.number().default(10),
  PUBLIC_LEAD_ORGANIZATION_ID: Joi.string().allow('').optional(),
  PUBLIC_LEAD_OWNER_ID: Joi.string().allow('').optional(),
  SUPABASE_URL: Joi.string().allow('').optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().allow('').optional(),
  SUPABASE_STORAGE_BUCKET: Joi.string().default('task-attachments'),
  SUPABASE_SIGNED_URL_EXPIRES_SECONDS: Joi.number().default(900),
});
