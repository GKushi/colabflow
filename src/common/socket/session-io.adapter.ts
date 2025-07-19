import { INestApplicationContext, UnauthorizedException } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { RequestHandler } from 'express';

export class SessionIoAdapter extends IoAdapter {
  constructor(
    protected readonly app: INestApplicationContext,
    private readonly sessionMiddleware: RequestHandler,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options);

    server.use((socket: any, next: any) => {
      const req = socket.request;

      this.sessionMiddleware(req, {} as any, (err: any) => {
        if (err) return next(err);

        if (!this.checkSessionAuth(req))
          return next(new UnauthorizedException('Please log in'));

        socket.session = req.session;
        return next();
      });
    });
    return server;
  }

  private checkSessionAuth(req: any) {
    if (!req.session?.isAuthenticated || !req.session?.user?.id) return false;
    return true;
  }
}
