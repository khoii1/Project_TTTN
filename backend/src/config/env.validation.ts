import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().optional(),
  API_PORT: Joi.number().default(3000),
  API_VERSION: Joi.string().default('v1'),
  DATABASE_URL: Joi.string().required(),
  JWT_ACCESS_TOKEN_SECRET: Joi.string().default('access_secret'),
  JWT_ACCESS_TOKEN_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_TOKEN_SECRET: Joi.string().default('refresh_secret'),
  JWT_REFRESH_TOKEN_EXPIRATION: Joi.string().default('7d'),
  CORS_ORIGIN: Joi.string().allow('').optional(),
  BCRYPT_ROUNDS: Joi.number().default(10),
});
