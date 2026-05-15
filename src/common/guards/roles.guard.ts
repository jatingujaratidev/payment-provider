import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../modules/users/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../modules/auth/jwt-payload.interface';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const req = context.switchToHttp().getRequest<{
      user?: JwtPayload;
    }>();
    const role = req.user?.role as UserRole | undefined;
    if (!role) {
      return false;
    }
    return required.includes(role);
  }
}
