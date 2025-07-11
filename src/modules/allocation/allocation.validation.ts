import z from "zod";

const allocationSchema = z.object({
  key: z.string().length(1).regex(/^[A-Z]$/),
  name: z.string().min(3),
  initialBalance: z.number().min(0),
  date: z.string().optional().default(new Date().toISOString().split('T')[0])
});

const allocationUpdateSchema = z.object({
  key: z.string().length(1).regex(/^[A-Z]$/).optional(),
  name: z.string().min(3).optional(),
  initialBalance: z.number().min(0).optional(),
  date: z.string().optional().default(new Date().toISOString().split('T')[0])
});

export const AllocationValidation = {
  allocationSchema,
  allocationUpdateSchema
};
