import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response, Request } from 'express';
import { SessionWithUser } from '../auth/interfaces';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(
    req: Request & { session?: SessionWithUser },
    res: Response,
    next: NextFunction,
  ) {
    const startTime = Date.now();
    const auth = req.session?.isAuthenticated ? true : false;
    const user = req.session?.user?.id;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { method, url } = req;
      const { statusCode } = res;

      this.logger.log({
        method,
        url,
        duration,
        statusCode,
        auth,
        user,
      });
    });

    next();
  }
}
