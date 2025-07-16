import { UserRole } from "@prisma/client";

/**
 * Type representing the payload of a token.
 */
export type TTokenPayload = {
  id: string,
  fullName: string,
  email: string,
  role: UserRole,
  img: string;
  iat?: number,
  exp?: number,
};
