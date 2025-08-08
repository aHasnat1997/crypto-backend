import { Router } from "express";
import { Rocket } from "../../app";
import handelAsyncReq from "../../utils/handelAsyncReq";
import { DailyReportController } from "./daily-report.controller";
import validateRequest from "../../middlewares/validateRequest";
import { DailyReportValidation } from "./daily-report.validation";
import { authGuard } from "../../middlewares/authGuard";

export function registerDailyReportRoutes(
  app: Rocket & { dailyReportController: DailyReportController },
  router: Router
) {
  const controller = app.dailyReportController;

  // User can create their own daily report
  router.post(
    "/daily-report",
    authGuard("USER"),
    validateRequest(DailyReportValidation.dailyReportSchema),
    handelAsyncReq(controller.createDailyReport.bind(controller))
  );

  // Get all daily reports (with pagination)
  router.get(
    "/daily-report",
    authGuard("USER"),
    handelAsyncReq(controller.getDailyReports.bind(controller))
  );

  // Get a specific daily report by ID
  router.get(
    "/daily-report/:id",
    authGuard("USER"),
    handelAsyncReq(controller.getDailyReportById.bind(controller))
  );

  // Update a daily report (only by the owner or admin)
  router.put(
    "/daily-report/:id",
    authGuard("USER"),
    validateRequest(DailyReportValidation.dailyReportUpdateSchema),
    handelAsyncReq(controller.updateDailyReport.bind(controller))
  );

  // Delete a daily report (only by the owner or admin)
  router.delete(
    "/daily-report/:id",
    authGuard("USER"),
    handelAsyncReq(controller.deleteDailyReport.bind(controller))
  );

  // Get today's automated daily report
  router.get(
    "/daily-report/automated/today",
    authGuard("USER"),
    handelAsyncReq(controller.getAutomatedDailyReport.bind(controller))
  );
}
