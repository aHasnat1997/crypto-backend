import { Rocket } from '../../app';
import { Request, Response } from 'express';
import successResponse from '../../utils/successResponse';
import { HTTPStatusCode } from '../../utils/httpCode';
import { CryptoService } from './crypto.service';
import z from 'zod';

export class CryptoController {
  private app: Rocket;
  private service: CryptoService;

  constructor(app: Rocket) {
    this.app = app;
    this.service = new CryptoService(app);
  }

  async getLatestPortfolio(req: Request, res: Response) {
    try {
      const result = await this.service.getLatestData();

      if (!result) {
        return res.status(HTTPStatusCode.NotFound).json({
          success: false,
          message: 'No portfolio data found',
          data: null
        });
      }

      successResponse(res, {
        message: 'Latest portfolio data retrieved successfully',
        data: result
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getLatestPortfolio:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve portfolio data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getNavHistory(req: Request, res: Response) {
    try {
      const schema = z.object({
        days: z.preprocess(
          val => Number(val),
          z.number().min(1).max(365).optional().default(30)
        )
      });

      const validation = schema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

      const { days } = validation.data;
      const result = await this.service.getNavHistory(days);

      successResponse(res, {
        message: 'NAV history retrieved successfully',
        data: result
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getNavHistory:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve NAV history',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getAssetPerformance(req: Request, res: Response) {
    try {
      const schema = z.object({
        symbol: z.enum(['BTC', 'ETH', 'USDC']).optional(),
        days: z.preprocess(
          val => Number(val),
          z.number().min(1).max(30).optional().default(7)
        )
      });

      const validation = schema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

      const { symbol, days } = validation.data;
      const result = await this.service.getAssetPerformance(symbol, days);

      successResponse(res, {
        message: 'Asset performance data retrieved successfully',
        data: result
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getAssetPerformance:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve asset performance data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getChartData(req: Request, res: Response) {
    try {
      const schema = z.object({
        period: z.enum(['7d', '30d', '90d', '1y']).optional().default('7d')
      });

      const validation = schema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

      const { period } = validation.data;

      let days = 7;
      if (period === '30d') days = 30;
      if (period === '90d') days = 90;
      if (period === '1y') days = 365;

      const result = await this.service.getNavHistory(days);

      successResponse(res, {
        message: 'Chart data retrieved successfully',
        data: result.map((item: any) => ({
          date: item.date,
          nav: item.endingNav,
          growth_percent: item.growthPercent
        }))
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getChartData:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve chart data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getSystemStatus(req: Request, res: Response) {
    try {
      const latestData = await this.service.getLatestData();

      if (!latestData) {
        return res.status(HTTPStatusCode.NotFound).json({
          success: false,
          message: 'No system status data found',
          data: null
        });
      }

      const systemStatus = {
        ...latestData.system_status,
        last_updated: latestData.last_updated,
        visual_flags: latestData.visual_flags,
        team_notes: latestData.team_notes
      };

      successResponse(res, {
        message: 'System status retrieved successfully',
        data: systemStatus
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getSystemStatus:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve system status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getCurrentPrices(req: Request, res: Response) {
    try {
      const latestData = await this.service.getLatestData();

      if (!latestData) {
        return res.status(HTTPStatusCode.NotFound).json({
          success: false,
          message: 'No price data found',
          data: null
        });
      }

      const prices = {
        BTC: latestData.asset_performance.BTC,
        ETH: latestData.asset_performance.ETH,
        last_updated: latestData.last_updated
      };

      successResponse(res, {
        message: 'Current crypto prices retrieved successfully',
        data: prices
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getCurrentPrices:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve current prices',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getPortfolioSummary(req: Request, res: Response) {
    try {
      const latestData = await this.service.getLatestData();

      if (!latestData) {
        return res.status(HTTPStatusCode.NotFound).json({
          success: false,
          message: 'No portfolio data found',
          data: null
        });
      }

      const summary = {
        nav: latestData.nav.ending_nav,
        total_allocations: Object.keys(latestData.allocations).length,
        allocation_breakdown: Object.entries(latestData.allocations).map(([key, allocation]) => ({
          key,
          name: allocation.name,
          ending_balance: allocation.current_balance,
          daily_gain_percent: allocation.history[0]?.minute_gain_percent || 0
        })),
        daily_report: latestData.daily_report_text,
        last_updated: latestData.last_updated
      };

      successResponse(res, {
        message: 'Portfolio summary retrieved successfully',
        data: summary
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getPortfolioSummary:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve portfolio summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async triggerManualUpdate(req: Request, res: Response) {
    try {
      const result = await this.service.triggerManualUpdate();

      successResponse(res, {
        message: 'Manual update triggered successfully',
        data: result
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in triggerManualUpdate:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to trigger manual update',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getHealthCheck(req: Request, res: Response) {
    try {
      const latestData = await this.service.getLatestData();
      const isHealthy = latestData && latestData.system_status.last_sync_success;

      const healthStatus = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: true,
          api_integration: latestData?.system_status.last_sync_success || false,
          automated_updates: latestData?.system_status.routing_active || false
        },
        last_update: latestData?.last_updated || null
      };

      const statusCode = isHealthy ? HTTPStatusCode.Ok : HTTPStatusCode.ServiceUnavailable;

      successResponse(res, {
        message: 'Health check completed',
        data: healthStatus
      }, statusCode);
    } catch (error) {
      console.error('Error in getHealthCheck:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
