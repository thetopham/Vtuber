import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  host: process.env.CONTROLLER_HOST ?? '0.0.0.0',
  logLevel: process.env.LOG_LEVEL ?? 'debug',
};
