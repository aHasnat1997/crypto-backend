import { UserRole } from "@prisma/client";

export type TUser = {
  email: string
  fullName: string
  password: string
  role: UserRole
  createdAt?: Date
  updatedAt?: Date
}
