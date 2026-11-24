import { Router } from 'express';
import { customerController } from './customer.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', (req, res, next) => customerController.list(req, res, next));
router.get('/:id', (req, res, next) => customerController.getById(req, res, next));
router.post('/', (req, res, next) => customerController.create(req, res, next));

export default router;
