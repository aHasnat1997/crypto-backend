import { Rocket } from "../../app";
import { Request, Response } from "express";
import { DailyReportService } from "./daily-report.service";
import { HTTPStatusCode } from "../../utils/httpCode";
import successResponse from "../../utils/successResponse";
import z from "zod";
import { DailyReportValidation } from "./daily-report.validation";
import { authGuard } from "../../middlewares/authGuard";
import { robustLogger } from "../../utils/robustLogger";

export class DailyReportController {
  private app: Rocket;
  private service: DailyReportService;

  constructor(app: Rocket) {
    this.app = app;
    this.service = new DailyReportService(app);
  }

  /**
   * Create a new daily report
   */
  async createDailyReport(req: Request, res: Response) {
    try {
      // Validate request body
      const validation = DailyReportValidation.dailyReportSchema.safeParse(
        req.body
      );
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: "Invalid request parameters",
          errors: validation.error.errors,
        });
      }

      // Get user ID from request (assuming it's added by auth middleware)
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(HTTPStatusCode.Unauthorized).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const result = await this.service.createDailyReport(
        validation.data,
        userId
      );

      successResponse(
        res,
        {
          message: "Daily report created successfully",
          data: result,
        },
        HTTPStatusCode.Created
      );
    } catch (error) {
      robustLogger.error("Error in createDailyReport:", error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: "Failed to create daily report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all daily reports with pagination
   */
  async getDailyReports(req: Request, res: Response) {
    try {
      // Validate query parameters
      const validation = DailyReportValidation.dailyReportQuerySchema.safeParse(
        req.query
      );
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: "Invalid request parameters",
          errors: validation.error.errors,
        });
      }

      const result = await this.service.getDailyReports(validation.data);

      successResponse(
        res,
        {
          message: "Daily reports retrieved successfully",
          data: result.data,
          meta: result.meta,
        },
        HTTPStatusCode.Ok
      );
    } catch (error) {
      robustLogger.error("Error in getDailyReports:", error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: "Failed to retrieve daily reports",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get a specific daily report by ID
   */
  async getDailyReportById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: "Report ID is required",
        });
      }

      const report = await this.service.getDailyReportById(id);

      if (!report) {
        return res.status(HTTPStatusCode.NotFound).json({
          success: false,
          message: "Daily report not found",
        });
      }

      successResponse(
        res,
        {
          message: "Daily report retrieved successfully",
          data: report,
        },
        HTTPStatusCode.Ok
      );
    } catch (error) {
      robustLogger.error("Error in getDailyReportById:", error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: "Failed to retrieve daily report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Update a daily report
   */
  async updateDailyReport(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: "Report ID is required",
        });
      }

      // Validate request body
      const validation =
        DailyReportValidation.dailyReportUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: "Invalid request parameters",
          errors: validation.error.errors,
        });
      }

      const result = await this.service.updateDailyReport(id, validation.data);

      if (!result) {
        return res.status(HTTPStatusCode.NotFound).json({
          success: false,
          message: "Daily report not found",
        });
      }

      successResponse(
        res,
        {
          message: "Daily report updated successfully",
          data: result,
        },
        HTTPStatusCode.Ok
      );
    } catch (error) {
      robustLogger.error("Error in updateDailyReport:", error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: "Failed to update daily report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete a daily report
   */
  async deleteDailyReport(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: "Report ID is required",
        });
      }

      const result = await this.service.deleteDailyReport(id);

      successResponse(
        res,
        {
          message: "Daily report deleted successfully",
          data: result,
        },
        HTTPStatusCode.Ok
      );
    } catch (error) {
      robustLogger.error("Error in deleteDailyReport:", error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: "Failed to delete daily report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get today's automated daily report
   */
  async getAutomatedDailyReport(req: Request, res: Response) {
    try {
      const automatedReport = await this.service.getTodaysAutomatedReport();

      successResponse(
        res,
        {
          message: "Automated daily report generated successfully",
          data: automatedReport,
        },
        HTTPStatusCode.Ok
      );
    } catch (error) {
      robustLogger.error("Error in getAutomatedDailyReport:", error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: "Failed to generate automated daily report",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
