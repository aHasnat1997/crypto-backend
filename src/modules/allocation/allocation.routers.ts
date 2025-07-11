import { Router } from "express";
import { Rocket } from "../../app";
import handelAsyncReq from "../../utils/handelAsyncReq";
import { AllocationController } from "./allocation.controller";
import validateRequest from "../../middlewares/validateRequest";
import { AllocationValidation } from "./allocation.validation";
import { authGuard } from "../../middlewares/authGuard";

export function registerAllocationRoutes(app: Rocket & { allocationController: AllocationController }, router: Router) {
  const controller = app.allocationController;

  router.post(
    '/allocation',
    authGuard('ADMIN'),
    validateRequest(AllocationValidation.allocationSchema),
    handelAsyncReq(controller.createAllocation.bind(controller))
  );

  router.get(
    '/allocation',
    handelAsyncReq(controller.getAllocations.bind(controller))
  );

  router.get(
    '/allocation/:key',
    handelAsyncReq(controller.getAllocationByKey.bind(controller))
  );

  router.put(
    '/allocation/:key',
    authGuard('ADMIN'),
    validateRequest(AllocationValidation.allocationUpdateSchema),
    handelAsyncReq(controller.updateAllocation.bind(controller))
  );

  router.delete(
    '/allocation/:key',
    authGuard('ADMIN'),
    handelAsyncReq(controller.deleteAllocation.bind(controller))
  );

  // router.get(
  //   '/allocation/comparison',
  //   handelAsyncReq(controller.getAllocationComparison.bind(controller))
  // );
};
