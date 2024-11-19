import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionWithUser } from './interface';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();
    const session: SessionWithUser = request.session;
    if (!session?.isAuthenticated)
      throw new UnauthorizedException('Please log in');
    return true;
  }
}
