import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { SessionWithUser } from '../interfaces';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'express';

const roleValues = {
  [Role.TEAM_MEMBER]: 1,
  [Role.MANAGER]: 2,
  [Role.ADMIN]: 3,
};

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext) {
    const requiredRole = this.reflector.get<Role | undefined>(
      'role',
      context.getHandler(),
    );
    if (!requiredRole) return true;
    const request: Request = context.switchToHttp().getRequest();
    const session: SessionWithUser = request.session;
    const userId = session.user?.id;
    if (!userId) return false;
    const user = await this.userService.findUserById(userId);
    if (!user) return false;

    return roleValues[user.role] >= roleValues[requiredRole];
  }
}
