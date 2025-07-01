import prisma from '../../db';
import { Prisma } from '@prisma/client';

/**
 * Create a new vault report in the database.
 * @param payload - The vault report data.
 * @returns The created vault report.
 */
async function createVaultReport(payload: Prisma.VaultReportCreateInput) {
  const result = await prisma.vaultReport.create({
    data: payload
  });

  console.log({ result });


  return result;
}

/**
 * Get all vault reports, optionally filtered by date.
 * @param date - Optional ISO date string to filter by.
 * @returns An array of vault reports.
 */
async function getVaultReports(date?: string) {
  const result = await prisma.vaultReport.findMany({
    where: date ? { date: new Date(date) } : {},
    orderBy: { date: 'desc' }
  });

  return result;
}

/**
 * Get a single vault report by ID.
 * @param id - The ObjectId of the report.
 * @returns The vault report object.
 */
async function getVaultReportById(id: string) {
  const result = await prisma.vaultReport.findUniqueOrThrow({
    where: { id }
  });

  return result;
}

/**
 * Delete a vault report by ID.
 * @param id - The ObjectId of the report.
 * @returns The deleted vault report.
 */
async function deleteVaultReport(id: string) {
  const result = await prisma.vaultReport.delete({
    where: { id }
  });

  return result;
}

/**
 * Update a vault report by ID.
 * @param id - The ObjectId of the report.
 * @param data - Partial update payload.
 * @returns The updated vault report.
 */
async function updateVaultReport(id: string, data: Prisma.VaultReportUpdateInput) {
  const result = await prisma.vaultReport.update({
    where: { id },
    data
  });

  return result;
}

export const VaultReportService = {
  createVaultReport,
  getVaultReports,
  getVaultReportById,
  updateVaultReport,
  deleteVaultReport
};
