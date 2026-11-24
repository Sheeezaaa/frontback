import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from './error.middleware';

/**
 * Tenant resolution middleware:
 * Enforces strict multi-tenant isolation.
 * Derives tenant identity securely from authenticated JWT claims.
 * Validates any client-supplied `x-tenant-id` header against verified tenant membership.
 */
export async function resolveTenant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    throw new AppError('Authentication context required to resolve tenant', 401);
  }

  const clientTenantIdHeader = req.headers['x-tenant-id'] as string | undefined;
  let activeTenantId = req.user.tenantId;

  // If a client provides x-tenant-id, never trust it blindly
  if (clientTenantIdHeader && clientTenantIdHeader !== req.user.tenantId) {
    // Only SUPER_ADMIN users can access or switch tenant contexts arbitrarily
    if (req.user.role === Role.SUPER_ADMIN) {
      const targetTenant = await prisma.tenant.findUnique({
        where: { id: clientTenantIdHeader },
      });

      if (!targetTenant) {
        throw new AppError(`Target tenant '${clientTenantIdHeader}' does not exist`, 404);
      }

      if (targetTenant.status !== 'ACTIVE') {
        throw new AppError(`Target tenant '${targetTenant.name}' is inactive or suspended`, 403);
      }

      activeTenantId = targetTenant.id;
    } else {
      // Regular Tenant Admin or Staff attempting to supply another tenant's ID is strictly rejected
      throw new AppError(
        'Cross-tenant access violation: You are not authorized to access resources outside your tenant context',
        403
      );
    }
  }

  // Bind verified tenant ID to the Express request
  req.tenantId = activeTenantId;
  res.setHeader('X-Active-Tenant-Id', activeTenantId);

  next();
}
