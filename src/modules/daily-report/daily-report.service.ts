import { Rocket } from "../../app";
import { Prisma } from "@prisma/client";
import { HTTPStatusCode } from "../../utils/httpCode";
import { robustLogger } from "../../utils/robustLogger";

export class DailyReportService {
  private app: Rocket;

  constructor(app: Rocket) {
    this.app = app;
  }

  /**
   * Create a new daily report
   */
  async createDailyReport(
    data: { note: string; date?: string },
    userId: string
  ) {
    try {
      const reportData = {
        note: data.note,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const report = await this.app.db.client.dailyReport.create({
        data: reportData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

      return report;
    } catch (error) {
      robustLogger.error("Error in createDailyReport:", error);
      throw error;
    }
  }

  /**
   * Get all daily reports with pagination
   */
  async getDailyReports(query: {
    date?: string;
    userId?: string;
    limit?: number;
    page?: number;
  }) {
    try {
      const { date, userId, limit = 10, page = 1 } = query;
      const skip = (page - 1) * limit;

      const where: Prisma.DailyReportWhereInput = {};

      if (date) {
        where.createdAt = {
          gte: new Date(date),
          lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
        };
      }

      if (userId) {
        where.userId = userId;
      }

      const [reports, total] = await Promise.all([
        this.app.db.client.dailyReport.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        }),
        this.app.db.client.dailyReport.count({ where }),
      ]);

      return {
        data: reports,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      robustLogger.error("Error in getDailyReports:", error);
      throw error;
    }
  }

  /**
   * Get a specific daily report by ID
   */
  async getDailyReportById(id: string) {
    try {
      const report = await this.app.db.client.dailyReport.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

      return report;
    } catch (error) {
      robustLogger.error("Error in getDailyReportById:", error);
      throw error;
    }
  }

  /**
   * Update a daily report
   */
  async updateDailyReport(id: string, data: { note?: string }) {
    try {
      const report = await this.app.db.client.dailyReport.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
      });

      return report;
    } catch (error) {
      robustLogger.error("Error in updateDailyReport:", error);
      throw error;
    }
  }

  /**
   * Delete a daily report
   */
  async deleteDailyReport(id: string) {
    try {
      const report = await this.app.db.client.dailyReport.delete({
        where: { id },
      });

      return report;
    } catch (error) {
      robustLogger.error("Error in deleteDailyReport:", error);
      throw error;
    }
  }

  /**
   * Generate an automated daily report based on portfolio data
   */
  async generateAutomatedDailyReport() {
    try {
      // Get the latest portfolio data
      const latestPortfolio = await this.app.db.client.portfolioData.findFirst({
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!latestPortfolio) {
        throw new Error("No portfolio data found for report generation");
      }

      // Generate a summary report based on portfolio data
      const summary = `
        Daily Portfolio Summary Report
        ==============================
        Date: ${new Date().toISOString().split("T")[0]}
        NAV: $${latestPortfolio.endingNav.toFixed(2)}
        Growth: ${latestPortfolio.growthPercent.toFixed(2)}%

        System Status:
        - Last Updated: ${latestPortfolio.lastUpdated}
        - Daily Report Text: ${
          latestPortfolio.dailyReportText || "No additional notes"
        }

        This is an automatically generated report based on the latest portfolio data.
      `.trim();

      return {
        note: summary,
        date: new Date().toISOString().split("T")[0],
        isAutomated: true,
      };
    } catch (error) {
      robustLogger.error("Error in generateAutomatedDailyReport:", error);
      throw error;
    }
  }

  /**
   * Get today's automated report or generate one if it doesn't exist
   */
  async getTodaysAutomatedReport() {
    try {
      // Try to find an existing automated report for today
      const today = new Date().toISOString().split("T")[0];

      // Generate a new automated report
      const automatedReport = await this.generateAutomatedDailyReport();

      return automatedReport;
    } catch (error) {
      robustLogger.error("Error in getTodaysAutomatedReport:", error);
      throw error;
    }
  }
}
