import z from "zod";
import { Rocket } from "../../app";
import { AllocationService } from "./allocation.service";
import { Request, Response } from "express";
import { HTTPStatusCode } from "../../utils/httpCode";
import successResponse from "../../utils/successResponse";

export class AllocationController {
  private app: Rocket;
  private service: AllocationService;

  constructor(app: Rocket) {
    this.app = app;
    this.service = new AllocationService(app);
  }

  async createAllocation(req: Request, res: Response) {
    const result = await this.service.createAllocation(req.body);
    successResponse(res, {
      message: 'Allocation created successfully',
      data: result
    }, HTTPStatusCode.Created);
  }

  async getAllocations(req: Request, res: Response) {
    const result = await this.service.getAllocations(req.query);

    successResponse(res, {
      message: 'Allocation data retrieved successfully',
      data: result.data,
      meta: result.meta
    }, HTTPStatusCode.Ok);
  }

  async getAllocationByKey(req: Request, res: Response) {
    const { key } = req.params;
    if (!key) {
      return res.status(HTTPStatusCode.BadRequest).json({
        success: false,
        message: 'Allocation key is required'
      });
    }
    const allocation = await this.service.getAllocationByKey(key);
    successResponse(res, {
      message: 'Allocation data retrieved successfully',
      data: allocation
    }, HTTPStatusCode.Ok);
  }

  async updateAllocation(req: Request, res: Response) {
    const { key } = req.params;
    if (!key) {
      return res.status(HTTPStatusCode.BadRequest).json({
        success: false,
        message: 'Allocation key is required'
      });
    }
    const result = await this.service.updateAllocation(key, req.body);
    if (!result) {
      return res.status(HTTPStatusCode.NotFound).json({
        success: false,
        message: 'Allocation not found'
      });
    }
    successResponse(res, {
      message: 'Allocation updated successfully',
      data: result
    }, HTTPStatusCode.Ok);
  }

  async deleteAllocation(req: Request, res: Response) {
    const { key } = req.params;
    if (!key) {
      return res.status(HTTPStatusCode.BadRequest).json({
        success: false,
        message: 'Allocation key is required'
      });
    }

    const result = await this.service.deleteAllocation(key);
    successResponse(res, {
      message: 'Allocation deleted successfully',
      data: result
    }, HTTPStatusCode.Ok);
  }

  // async getAllocations(req: Request, res: Response) {
  //   // Validate query parameters
  //   const schema = z.object({
  //     days: z.preprocess(
  //       (val) => {
  //         const num = Number(val);
  //         return isNaN(num) ? undefined : num;
  //       },
  //       z.number().min(1).max(365).optional().default(7)
  //     )
  //   });

  //   const validation = schema.safeParse(req.query);
  //   if (!validation.success) {
  //     return res.status(HTTPStatusCode.BadRequest).json({
  //       success: false,
  //       message: 'Invalid request parameters',
  //       errors: validation.error.errors
  //     });
  //   }

  //   const { days } = validation.data;
  //   const result = await this.service.getAllocations({ days });

  //   successResponse(res, {
  //     message: 'Allocation data retrieved successfully',
  //     data: result.data,
  //     meta: []
  //   }, HTTPStatusCode.Ok);
  // }

  // async getAllocationComparison(req: Request, res: Response) {
  //   const schema = z.object({
  //     days: z.union([
  //       z.string().regex(/^\d+$/).transform(Number),
  //       z.number()
  //     ]).pipe(
  //       z.number().min(1).max(365)
  //     ).optional().default(7),
  //     searchTerm: z.string().optional()
  //   });

  //   const validation = schema.safeParse(req.query);
  //   if (!validation.success) {
  //     return res.status(HTTPStatusCode.BadRequest).json({
  //       success: false,
  //       message: 'Invalid request parameters',
  //       errors: validation.error.errors
  //     });
  //   }

  //   const { days } = validation.data;
  //   const { data: allocations } = await this.service.getAllocations({ days });

  //   if (!allocations || allocations.length === 0) {
  //     return res.status(HTTPStatusCode.NotFound).json({
  //       success: false,
  //       message: 'No allocation data found',
  //       data: null
  //     });
  //   }

  //   // const comparisonData = allocations.reduce((acc, allocation) => {
  //   //   const history = allocation.AllocationHistory || JSON.parse(allocation.history || '[]');
  //   //   acc[allocation.key] = {
  //   //     name: allocation.name,
  //   //     performance: history
  //   //   };
  //   //   return acc;
  //   // }, {} as Record<string, any>);

  //   successResponse(res, {
  //     message: 'Allocation comparison retrieved successfully',
  //     data: allocations
  //   }, HTTPStatusCode.Ok);
  // }
}
