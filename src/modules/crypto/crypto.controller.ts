import { Rocket } from '../../app';
import { Request, Response } from 'express';
import { CryptoValidation } from './crypto.validation';
import successResponse from '../../utils/successResponse';
import { HTTPStatusCode } from '../../utils/httpCode';
import { CryptoService } from './crypto.service';

export class CryptoController {
  private app: Rocket;
  private service: CryptoService;

  constructor(app: Rocket) {
    this.app = app;
    this.service = new CryptoService(app);
  }

  /**
   * Get latest portfolio data
   */
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

  /**
   * Get NAV history
   */
  async getNavHistory(req: Request, res: Response) {
    try {
      // Validate request parameters
      const validation = CryptoValidation.portfolioDataSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

      const { days = 30 } = validation.data;
      const result = await this.service.getNavHistory(Number(days));

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

  /**
   * Get allocation data
   */
  async getAllocations(req: Request, res: Response) {
    try {
      // Validate request parameters
      const validation = CryptoValidation.allocationSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

      const { date } = validation.data;
      const result = await this.service.getAllocations(date);

      successResponse(res, {
        message: 'Allocation data retrieved successfully',
        data: result
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getAllocations:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve allocation data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get asset performance data
   */
  async getAssetPerformance(req: Request, res: Response) {
    try {
      // Validate request parameters
      const validation = CryptoValidation.assetPerformanceSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

      const { symbol, days = 7 } = validation.data;
      const result = await this.service.getAssetPerformance(symbol, Number(days));

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

  /**
   * Get chart data for visualization
   */
  async getChartData(req: Request, res: Response) {
    try {
      // Validate request parameters
      const validation = CryptoValidation.chartDataSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

      const { period = '7d' } = validation.data;

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

  /**
   * Get system status
   */
  async getSystemStatus(req: Request, res: Response) {
    try {
      // Validate request parameters
      const validation = CryptoValidation.systemStatusSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

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

  /**
   * Get current crypto prices
   */
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

  /**
   * Get portfolio summary
   */
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
        nav: latestData.nav,
        total_allocations: Object.keys(latestData.allocations).length,
        allocation_breakdown: Object.entries(latestData.allocations).map(([key, allocation]) => ({
          key,
          name: allocation.name,
          ending_balance: allocation.ending_balance,
          daily_gain_percent: allocation.daily_gain_percent
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

  /**
   * Trigger manual data update
   */
  async triggerManualUpdate(req: Request, res: Response) {
    try {
      // Validate request parameters
      const validation = CryptoValidation.manualUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

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

  /**
   * Get allocation performance comparison
   */
  async getAllocationComparison(req: Request, res: Response) {
    try {
      const validation = CryptoValidation.portfolioDataSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(HTTPStatusCode.BadRequest).json({
          success: false,
          message: 'Invalid request parameters',
          errors: validation.error.errors
        });
      }

      const { days = 7 } = validation.data;
      const allocations = await this.service.getAllocations();

      if (!allocations || allocations.length === 0) {
        return res.status(HTTPStatusCode.NotFound).json({
          success: false,
          message: 'No allocation data found',
          data: null
        });
      }

      // Group allocations by key and calculate performance
      const comparisonData = allocations.reduce((acc: any, allocation: any) => {
        if (!acc[allocation.key]) {
          acc[allocation.key] = {
            name: allocation.name,
            performance: []
          };
        }
        acc[allocation.key].performance.push({
          date: allocation.date,
          daily_gain_percent: allocation.dailyGainPercent,
          ending_balance: allocation.endingBalance
        });
        return acc;
      }, {} as any);

      successResponse(res, {
        message: 'Allocation comparison retrieved successfully',
        data: comparisonData
      }, HTTPStatusCode.Ok);
    } catch (error) {
      console.error('Error in getAllocationComparison:', error);
      return res.status(HTTPStatusCode.InternalServerError).json({
        success: false,
        message: 'Failed to retrieve allocation comparison',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get health check endpoint
   */
  async getHealthCheck(req: Request, res: Response) {
    try {
      const latestData = await this.service.getLatestData();
      const isHealthy = latestData && latestData.system_status.last_sync_success;

      const healthStatus = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: true, // Assume healthy if we can query
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
};
