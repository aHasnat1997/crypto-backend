import { z } from 'zod';

/**
 * Schema for validating login requests.
 */
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

/**
 * Schema for validating  registration requests.
 */
const registrationSchema = z.object({
  email: z.string(),
  password: z.string(),
  fullName: z.string(),
  role: z.enum(['ADMIN', 'USER']),
});

/**
 * Schema for validating requests to soft delete a user.
 */
const softDeletedSchema = z.object({
  isDeleted: z.boolean()
});

/**
 * Schema for validating requests to user password reset.
 */
const resetPasswordSchema = z.object({
  newPassword: z.string(),
  oldPassword: z.string()
});

/**
 * Schema for validating requests to user forget password.
 */
const forgetPasswordSchema = z.object({
  email: z.string().email()
});

/**
 * Schema for validating requests to user change password.
 */
const setNewPasswordSchema = z.object({
  newPassword: z.string(),
  token: z.string()
});

/**
 * Collection of validation schemas for user auth related requests.
 */
export const AuthValidation = {
  loginSchema,
  registrationSchema,
  softDeletedSchema,
  resetPasswordSchema,
  forgetPasswordSchema,
  setNewPasswordSchema
};
