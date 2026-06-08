import { UserRole } from '@prisma/client';
import { TokenPayload } from '../../infrastructure/security/token.service';

export type RecordVisibilityUser = Pick<TokenPayload, 'sub' | 'role'>;

export function isRestrictedOwnerRole(user?: RecordVisibilityUser): boolean {
  return user?.role === UserRole.SALES || user?.role === UserRole.SUPPORT;
}

export function ownerVisibilityWhere(user?: RecordVisibilityUser): Record<string, unknown> {
  return isRestrictedOwnerRole(user) ? { ownerId: user!.sub } : {};
}

export function taskVisibilityWhere(user?: RecordVisibilityUser): Record<string, unknown> {
  return isRestrictedOwnerRole(user)
    ? { OR: [{ ownerId: user!.sub }, { assignedToId: user!.sub }] }
    : {};
}
