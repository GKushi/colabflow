import {
  PermissionDeniedException,
  ResourceNotFoundException,
} from '../exceptions';
import { ExceptionFilter, Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { UnauthorizedException } from '../exceptions/unauthorized.exception';
import { SocketStatusCode } from '../socket/status-codes';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(Error)
export class DomainExceptionWsFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionWsFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ws = host.switchToWs();
    const socket = ws.getClient<Socket>();

    this.logger.error(exception.message, exception.stack);

    if (exception instanceof WsException) {
      const errorResponse = exception.getError();
      return socket.emit('exception', errorResponse);
    }

    let statusCode = SocketStatusCode.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message: string | undefined;

    switch (exception.constructor) {
      case PermissionDeniedException:
        statusCode = SocketStatusCode.FORBIDDEN;
        error = 'Forbidden';
        message = exception.message;
        break;
      case ResourceNotFoundException:
        statusCode = SocketStatusCode.NOT_FOUND;
        error = 'Not Found';
        message = exception.message;
        break;
      case UnauthorizedException:
        statusCode = SocketStatusCode.UNAUTHORIZED;
        error = 'Unauthorized';
        message = exception.message;
        break;
    }

    const response = {
      error,
      statusCode,
      message,
    };

    socket.emit('exception', JSON.stringify(response));
  }
}
