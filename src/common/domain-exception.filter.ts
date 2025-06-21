import {
  InvalidCredentialsException,
  InvalidTokenException,
  UserNotVerifiedException,
  UserAlreadyVerifiedException,
  PasswordUnchangedException,
} from '../auth/exceptions';
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  UserNotInProjectException,
  UserAlreadyInProjectException,
} from '../project/exceptions';
import {
  PermissionDeniedException,
  ResourceNotFoundException,
} from './exceptions';
import { InvalidRegisterCredentialsException } from '../user/exceptions';
import { FileLimitExceededException } from '../file/exceptions';
import { Response } from 'express';

@Catch(Error)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(exception.message, exception.stack);

    if (exception instanceof HttpException) {
      const httpExceptionResponse = exception.getResponse();
      const statusCode = exception.getStatus();

      if (typeof httpExceptionResponse === 'string') {
        return response
          .status(statusCode)
          .json({ statusCode, message: httpExceptionResponse });
      }

      return response.status(statusCode).json(httpExceptionResponse);
    }

    let statusCode = 500;
    let error = 'Internal Server Error';
    let message: string | undefined;

    switch (exception.constructor) {
      case PermissionDeniedException:
      case UserNotInProjectException:
      case UserNotVerifiedException:
        statusCode = HttpStatus.FORBIDDEN;
        error = 'Forbidden';
        message = exception.message;
        break;
      case ResourceNotFoundException:
        statusCode = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        message = exception.message;
        break;
      case UserAlreadyInProjectException:
      case UserAlreadyVerifiedException:
        statusCode = HttpStatus.CONFLICT;
        error = 'Conflict';
        message = exception.message;
        break;
      case InvalidCredentialsException:
        statusCode = HttpStatus.UNAUTHORIZED;
        error = 'Unauthorized';
        message = exception.message;
        break;
      case InvalidTokenException:
      case PasswordUnchangedException:
      case FileLimitExceededException:
      case InvalidRegisterCredentialsException:
        statusCode = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = exception.message;
        break;
    }

    response.status(statusCode).json({
      message,
      error,
      statusCode,
    });
  }
}
