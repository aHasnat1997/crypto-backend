import { Rocket } from '../../app';
import { Router } from 'express';
import handelAsyncReq from '../../utils/handelAsyncReq';
import { CryptoController } from './crypto.controller';

export function registerCryptoRoutes(app: Rocket & { cryptoController: CryptoController }, router: Router) {
  const controller = app.cryptoController;

  // Portfolio endpoints
  router.get('/crypto/portfolio/latest', handelAsyncReq(controller.getLatestPortfolio.bind(controller)));
  router.get('/crypto/portfolio/summary', handelAsyncReq(controller.getPortfolioSummary.bind(controller)));
  router.get('/crypto/portfolio/nav-history', handelAsyncReq(controller.getNavHistory.bind(controller)));

  // Allocation endpoints
  router.get('/crypto/allocations', handelAsyncReq(controller.getAllocations.bind(controller)));
  router.post('/crypto/allocations', handelAsyncReq(controller.createAllocation.bind(controller)));
  router.get('/crypto/allocations/comparison', handelAsyncReq(controller.getAllocationComparison.bind(controller)));

  // Asset performance endpoints
  router.get('/crypto/assets/performance', handelAsyncReq(controller.getAssetPerformance.bind(controller)));
  router.get('/crypto/prices/current', handelAsyncReq(controller.getCurrentPrices.bind(controller)));

  // Chart data endpoints
  router.get('/crypto/chart-data', handelAsyncReq(controller.getChartData.bind(controller)));

  // System endpoints
  router.get('/crypto/system/status', handelAsyncReq(controller.getSystemStatus.bind(controller)));
  router.get('/crypto/system/health', handelAsyncReq(controller.getHealthCheck.bind(controller)));
  router.post('/crypto/system/update', handelAsyncReq(controller.triggerManualUpdate.bind(controller)));

};
