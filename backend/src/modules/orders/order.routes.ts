import { Router } from 'express';
import { orderController } from './order.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', (req, res, next) => orderController.list(req, res, next));
router.get('/:id', (req, res, next) => orderController.getById(req, res, next));
router.post('/', (req, res, next) => orderController.create(req, res, next));
router.patch('/:id/status', (req, res, next) => orderController.updateStatus(req, res, next));

export default router;
