import { Router } from 'express';
import { tenantController } from './tenant.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authorizeRoles } from '../../middleware/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(authorizeRoles(Role.SUPER_ADMIN));

router.get('/', (req, res, next) => tenantController.list(req, res, next));
router.get('/:id', (req, res, next) => tenantController.getById(req, res, next));
router.patch('/:id/status', (req, res, next) => tenantController.updateStatus(req, res, next));

export default router;
