import { Router } from 'express';
import { benchmarkController } from './benchmark.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/n-plus-one', (req, res, next) => benchmarkController.runNPlusOne(req, res, next));
router.get('/explain-analyze', (req, res, next) => benchmarkController.runExplainAnalyze(req, res, next));
router.post('/seed-data', (req, res, next) => benchmarkController.seedData(req, res, next));

export default router;
