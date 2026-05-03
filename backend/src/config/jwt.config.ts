import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET || 'access_secret',
  accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
  refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET || 'refresh_secret',
  refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
}));
