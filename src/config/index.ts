import dotenv from "dotenv";

dotenv.config();

/**
 * Configuration object for environment variables.
 */
export default {
  PORT: process.env.PORT,
  CLINT_URL: process.env.CLINT_URL as string,
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS as string,
  DEFAULT_USER_PASS: process.env.DEFAULT_PASS,
  SUPER_ADMIN: {
    EMAIL: process.env.SUPER_ADMIN_EMAIL,
    PASS: process.env.DEFAULT_PASS,
  },
  TOKEN: {
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET as string,
    ACCESS_TOKEN_EXPIRES_TIME: process.env.ACCESS_TOKEN_EXPIRES_TIME as string,
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
    REFRESH_TOKEN_EXPIRES_TIME: process.env.REFRESH_TOKEN_EXPIRES_TIME as string,
    FORGOT_TOKEN_SECRET: process.env.FORGOT_TOKEN_SECRET as string,
    FORGOT_TOKEN_EXPIRES_TIME: process.env.FORGOT_TOKEN_EXPIRES_TIME as string
  },
  SMTP: {
    HOST: process.env.SMTP_HOST as string,
    PORT: process.env.SMTP_PORT,
    USER: process.env.SMTP_USER,
    PASS: process.env.SMTP_PASS,
  },
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUD_NAME,
    API_KEY: process.env.API_KEY,
    API_SECRET: process.env.API_SECRET
  }
}
