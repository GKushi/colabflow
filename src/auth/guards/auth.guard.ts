import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionWithUser } from '../interfaces';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prismaService: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (this.reflector.get<true | undefined>('public', context.getHandler()))
      return true;

    const request: Request = context.switchToHttp().getRequest();

    const session: SessionWithUser = request.session;

    if (!session?.isAuthenticated || !session?.user?.id)
      throw new UnauthorizedException('Please log in');

    if (
      this.reflector.get<true | undefined>(
        'no-verification',
        context.getHandler(),
      )
    )
      return true;

    const user = await this.prismaService.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) throw new UnauthorizedException('Please log in');

    if (!user.emailVerified)
      throw new UnauthorizedException('Please verify your email');

    return true;
  }
}
