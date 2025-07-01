import { Router } from 'express';
import { VaultReportController } from './crypto.controllers';

export const CryptoRoutes = Router();

CryptoRoutes.post('/', VaultReportController.createVaultReport);
CryptoRoutes.get('/', VaultReportController.getVaultReports);
CryptoRoutes.get('/:reportId', VaultReportController.getVaultReportById);
CryptoRoutes.patch('/:reportId', VaultReportController.updateVaultReport);
CryptoRoutes.delete('/:reportId', VaultReportController.deleteVaultReport);

