import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionWithUser } from '../interfaces';

export const User = createParamDecorator((_: any, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();

  const session: SessionWithUser = request.session;

  return session.user;
});
