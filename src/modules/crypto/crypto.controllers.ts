import { Request, Response } from 'express';
import handelAsyncReq from '../../utils/handelAsyncReq';
import successResponse from '../../utils/successResponse';
import { HTTPStatusCode } from '../../utils/httpCode';
import { VaultReportService } from './crypto.services';

/**
 * Create a new vault report.
 */
const createVaultReport = handelAsyncReq(async (req: Request, res: Response) => {
  const result = await VaultReportService.createVaultReport(req.body);
  successResponse(res, {
    message: 'Vault report created successfully.',
    data: result,
  }, HTTPStatusCode.Created);
});

/**
 * Get all vault reports, optionally filtered by date.
 */
const getVaultReports = handelAsyncReq(async (req: Request, res: Response) => {
  const { date } = req.query;
  const result = await VaultReportService.getVaultReports(date as string);
  successResponse(res, {
    message: 'Vault reports retrieved successfully.',
    data: result,
  }, HTTPStatusCode.Ok);
});

/**
 * Get a vault report by its ID.
 */
const getVaultReportById = handelAsyncReq(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const result = await VaultReportService.getVaultReportById(reportId);
  successResponse(res, {
    message: 'Vault report retrieved successfully.',
    data: result,
  }, HTTPStatusCode.Ok);
});

/**
 * Update a vault report by its ID.
 */
const updateVaultReport = handelAsyncReq(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const result = await VaultReportService.updateVaultReport(reportId, req.body);
  successResponse(res, {
    message: 'Vault report updated successfully.',
    data: result,
  }, HTTPStatusCode.Ok);
});

/**
 * Delete a vault report by its ID.
 */
const deleteVaultReport = handelAsyncReq(async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const result = await VaultReportService.deleteVaultReport(reportId);
  successResponse(res, {
    message: 'Vault report deleted successfully.',
    data: result,
  }, HTTPStatusCode.Ok);
});

export const VaultReportController = {
  createVaultReport,
  getVaultReports,
  getVaultReportById,
  updateVaultReport,
  deleteVaultReport,
};
