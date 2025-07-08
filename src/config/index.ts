import { StringValue } from "ms";

export type TAppConfig = {
  PORT: number;
  CLIENT_URL: string;
  DATABASE_URL: string;
  BCRYPT_SALT_ROUNDS: string;
  DEFAULT_USER_PASS: string;
  SUPER_ADMIN: {
    EMAIL: string;
    PASS: string;
  };
  TOKEN: {
    TOKEN_SECRET: string;
    TOKEN_EXPIRES_TIME: StringValue;
    FORGOT_TOKEN_SECRET: string;
    FORGOT_TOKEN_EXPIRES_TIME: StringValue;
  };
  SMTP: {
    HOST: string;
    PORT: string | number;
    USER: string;
    PASS: string;
  };
  CLOUDINARY: {
    CLOUD_NAME: string;
    API_KEY: string;
    API_SECRET: string;
  };
};

const Config: TAppConfig = {
  PORT: Number(process.env.PORT),
  CLIENT_URL: process.env.CLIENT_URL as string,
  DATABASE_URL: process.env.DATABASE_URL as string,
  BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS as string,
  DEFAULT_USER_PASS: process.env.DEFAULT_PASS as string,
  SUPER_ADMIN: {
    EMAIL: process.env.SUPER_ADMIN_EMAIL as string,
    PASS: process.env.DEFAULT_PASS as string,
  },
  TOKEN: {
    TOKEN_SECRET: process.env.TOKEN_SECRET as string,
    TOKEN_EXPIRES_TIME: process.env.TOKEN_EXPIRES_TIME as StringValue,
    FORGOT_TOKEN_SECRET: process.env.FORGOT_TOKEN_SECRET as string,
    FORGOT_TOKEN_EXPIRES_TIME: process.env.FORGOT_TOKEN_EXPIRES_TIME as StringValue
  },
  SMTP: {
    HOST: process.env.SMTP_HOST as string,
    PORT: process.env.SMTP_PORT as string,
    USER: process.env.SMTP_USER as string,
    PASS: process.env.SMTP_PASS as string,
  },
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUD_NAME as string,
    API_KEY: process.env.API_KEY as string,
    API_SECRET: process.env.API_SECRET as string
  }
};

export default Config;
