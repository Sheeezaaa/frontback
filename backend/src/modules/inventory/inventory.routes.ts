import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { authorizeRoles } from '../../middleware/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', (req, res, next) => inventoryController.list(req, res, next));
router.post(
  '/adjust',
  authorizeRoles(Role.SUPER_ADMIN, Role.TENANT_ADMIN),
  (req, res, next) => inventoryController.adjust(req, res, next)
);

export default router;
