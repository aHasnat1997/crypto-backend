import { UserRole } from "@prisma/client";

export type TUser = {
  email: string;
  password: string;
  fullName: string;
  role: UserRole
  isDeleted?: boolean
}
