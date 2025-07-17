import { UserRole } from "@prisma/client";

export type TUser = {
  id?: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  img: string;
  isStatus?: boolean
}

export type TResetPassword = {
  newPassword: string;
  oldPassword: string;
}

export type TSetNewPassword = {
  newPassword: string,
  token: string
};
