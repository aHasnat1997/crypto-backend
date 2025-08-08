import z from "zod";

/**
 * Schema for validating daily report creation requests.
 */
const dailyReportSchema = z.object({
  note: z
    .string()
    .min(1, "Report note is required")
    .max(1000, "Report note must be less than 1000 characters"),
  date: z.string().optional().default(new Date().toISOString().split("T")[0]),
});

/**
 * Schema for validating daily report update requests.
 */
const dailyReportUpdateSchema = z.object({
  note: z
    .string()
    .min(1, "Report note is required")
    .max(1000, "Report note must be less than 1000 characters")
    .optional(),
  date: z.string().optional(),
});

/**
 * Schema for validating daily report query parameters.
 */
const dailyReportQuerySchema = z.object({
  date: z.string().optional(),
  userId: z.string().optional(),
  limit: z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(1).max(100).optional().default(10)),
  page: z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }, z.number().min(1).optional().default(1)),
});

/**
 * Collection of validation schemas for daily report related requests.
 */
export const DailyReportValidation = {
  dailyReportSchema,
  dailyReportUpdateSchema,
  dailyReportQuerySchema,
};
