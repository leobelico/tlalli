import type { Role } from "@/generated/prisma/enums";
import { ForbiddenError } from "@/server/errors";

export { ForbiddenError, NotFoundError } from "@/server/errors";

/** Authenticated request context passed to every service function. */
export type Ctx = {
  orgId: string;
  userId: string;
  role: Role;
};

const MATRIX = {
  "org:settings": ["ADMIN"],
  "members:manage": ["ADMIN"],
  "developments:write": ["ADMIN"],
  "units:write": ["ADMIN"],
  "campaigns:write": ["ADMIN"],
  "leads:viewAll": ["ADMIN"],
  "leads:assign": ["ADMIN"],
  "leads:import": ["ADMIN"],
  "leads:delete": ["ADMIN"],
  "leads:create": ["ADMIN", "ASESOR"],
  "quotes:create": ["ADMIN", "ASESOR"],
  /** Discount above ASESOR_MAX_DISCOUNT_PCT, or a sale amount below that threshold (QA B04/B05). */
  "pricing:override": ["ADMIN"],
  "dashboard:viewAll": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof MATRIX;

export function can(role: Role, permission: Permission): boolean {
  return (MATRIX[permission] as readonly Role[]).includes(role);
}

export function assertCan(ctx: Ctx, permission: Permission): void {
  if (!can(ctx.role, permission)) throw new ForbiddenError();
}

/** Prisma `where` fragment restricting leads to the ones the user may see. */
export function leadScope(ctx: Ctx): { assignedToId?: string } {
  return can(ctx.role, "leads:viewAll") ? {} : { assignedToId: ctx.userId };
}
