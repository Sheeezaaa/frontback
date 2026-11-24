import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/error.middleware';
import { RegisterInput, LoginInput } from './auth.dto';
import { AuthenticatedUser } from '../../types/express';

const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Register a new Tenant company and its primary Tenant Admin user
   */
  async register(input: RegisterInput) {
    // Check if company slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: input.companySlug.toLowerCase() },
    });

    if (existingTenant) {
      throw new AppError('A company with this identifier slug already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create tenant and admin user transactionally
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: input.companyName,
          slug: input.companySlug.toLowerCase(),
          plan: input.plan || 'STANDARD',
          status: 'ACTIVE',
        },
      });

      const user = await tx.user.create({
        data: {
          tenant_id: tenant.id,
          email: input.email.toLowerCase(),
          password_hash: hashedPassword,
          first_name: input.firstName,
          last_name: input.lastName,
          role: Role.TENANT_ADMIN,
        },
      });

      return { tenant, user };
    });

    const token = this.generateToken({
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.first_name,
      lastName: result.user.last_name,
      tenantId: result.tenant.id,
      tenantSlug: result.tenant.slug,
      role: result.user.role,
    });

    return {
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        role: result.user.role,
        tenantId: result.tenant.id,
        tenantName: result.tenant.name,
        tenantSlug: result.tenant.slug,
      },
    };
  }

  /**
   * Authenticate user with email, password, and optional tenant slug
   */
  async login(input: LoginInput) {
    let tenantId: string | undefined;

    if (input.tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: input.tenantSlug.toLowerCase() },
      });
      if (!tenant) {
        throw new AppError('Tenant company not found', 404);
      }
      tenantId = tenant.id;
    }

    // Find user by email and optional tenant_id
    const users = await prisma.user.findMany({
      where: {
        email: input.email.toLowerCase(),
        ...(tenantId ? { tenant_id: tenantId } : {}),
      },
      include: {
        tenant: true,
      },
    });

    if (users.length === 0) {
      throw new AppError('Invalid email or password', 401);
    }

    // If multiple tenants match and tenantSlug wasn't provided, check passwords to find right tenant
    let matchedUser = null;
    for (const u of users) {
      const isMatch = await bcrypt.compare(input.password, u.password_hash);
      if (isMatch) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      throw new AppError('Invalid email or password', 401);
    }

    if (!matchedUser.is_active) {
      throw new AppError('User account has been deactivated', 403);
    }

    if (matchedUser.tenant.status !== 'ACTIVE') {
      throw new AppError('Tenant company account is suspended', 403);
    }

    const token = this.generateToken({
      id: matchedUser.id,
      email: matchedUser.email,
      firstName: matchedUser.first_name,
      lastName: matchedUser.last_name,
      tenantId: matchedUser.tenant.id,
      tenantSlug: matchedUser.tenant.slug,
      role: matchedUser.role,
    });

    return {
      token,
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        firstName: matchedUser.first_name,
        lastName: matchedUser.last_name,
        role: matchedUser.role,
        tenantId: matchedUser.tenant.id,
        tenantName: matchedUser.tenant.name,
        tenantSlug: matchedUser.tenant.slug,
      },
    };
  }

  /**
   * Generate signed JWT
   */
  generateToken(payload: AuthenticatedUser): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }

  /**
   * Get current authenticated user profile
   */
  async getProfile(userId: string, tenantId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId },
      include: { tenant: true },
    });

    if (!user) {
      throw new AppError('User not found in this tenant context', 404);
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
        status: user.tenant.status,
      },
    };
  }
}

export const authService = new AuthService();
