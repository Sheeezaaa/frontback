import { Router } from 'express';
import { productController } from './product.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { resolveTenant } from '../../middleware/tenant.middleware';
import { authorizeRoles } from '../../middleware/role.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(resolveTenant);

router.get('/', (req, res, next) => productController.list(req, res, next));
router.get('/:id', (req, res, next) => productController.getById(req, res, next));
router.post(
  '/',
  authorizeRoles(Role.SUPER_ADMIN, Role.TENANT_ADMIN),
  (req, res, next) => productController.create(req, res, next)
);
router.put(
  '/:id',
  authorizeRoles(Role.SUPER_ADMIN, Role.TENANT_ADMIN),
  (req, res, next) => productController.update(req, res, next)
);
router.delete(
  '/:id',
  authorizeRoles(Role.SUPER_ADMIN, Role.TENANT_ADMIN),
  (req, res, next) => productController.delete(req, res, next)
);

export default router;
