import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './error.middleware';

/**
 * Role-based access control (RBAC) middleware
 * Enforces permissions for SUPER_ADMIN, TENANT_ADMIN, and STAFF
 */
export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    // SUPER_ADMIN has elevated access across all routes
    if (req.user.role === Role.SUPER_ADMIN) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Access forbidden: Role '${req.user.role}' lacks permission to perform this action`,
        403
      );
    }

    next();
  };
}
