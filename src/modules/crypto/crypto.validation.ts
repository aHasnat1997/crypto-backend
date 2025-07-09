import { z } from 'zod';

/**
 * Schema for validating crypto price requests.
 */
const cryptoPriceSchema = z.object({
  symbol: z.string().min(1).max(10),
});

/**
 * Schema for validating portfolio data requests.
 */
const portfolioDataSchema = z.object({
  date: z.string().optional(),
  days: z.number().min(1).max(365).optional(),
});

/**
 * Schema for validating chart data requests.
 */
const chartDataSchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional(),
});

/**
 * Schema for validating allocation requests.
 */
const allocationSchema = z.object({
  date: z.string().optional(),
  allocation_key: z.enum(['A', 'B', 'C']).optional(),
});

/**
 * Schema for validating asset performance requests.
 */
const assetPerformanceSchema = z.object({
  symbol: z.enum(['BTC', 'ETH', 'USDC']).optional(),
  days: z.number().min(1).max(30).optional(),
});

/**
 * Schema for validating manual update requests.
 */
const manualUpdateSchema = z.object({
  force: z.boolean().optional(),
});

/**
 * Schema for validating system status requests.
 */
const systemStatusSchema = z.object({
  date: z.string().optional(),
});

/**
 * Collection of validation schemas for crypto related requests.
 */
export const CryptoValidation = {
  cryptoPriceSchema,
  portfolioDataSchema,
  chartDataSchema,
  allocationSchema,
  assetPerformanceSchema,
  manualUpdateSchema,
  systemStatusSchema,
};
