import { Router } from 'express';
import { dashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', (req, res, next) => dashboardController.getMetrics(req, res, next));

export default router;
