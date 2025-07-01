import { UserRole } from "@prisma/client";
import { TUploadedFile } from "./uploadedFile.type";

// user login type
export type TLogin = {
  email: string,
  password: string
};

// registration type
export type TRegistration = {
  firstName: string,
  lastName: string,
  email: string,
  profileImage?: TUploadedFile,
  role: UserRole
};

// reset user password type
export type TResetPassword = {
  newPassword: string,
  oldPassword: string
};

// set new password type
export type TSetNewPassword = {
  newPassword: string,
  token: string
};
