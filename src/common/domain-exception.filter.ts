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
} from '@nestjs/common';
import {
  UserNotInProjectException,
  UserAlreadyInProjectException,
} from '../project/exceptions';
import {
  PermissionDeniedException,
  ResourceNotFoundException,
} from './exceptions';
import { FileLimitExceededException } from '../file/exceptions';
import { Response } from 'express';

@Catch(Error)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const httpExceptionResponse = exception.getResponse();
      return response.status(exception.getStatus()).json(httpExceptionResponse);
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
        break;
      case ResourceNotFoundException:
        statusCode = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        break;
      case UserAlreadyInProjectException:
      case UserAlreadyVerifiedException:
        statusCode = HttpStatus.CONFLICT;
        error = 'Conflict';
        break;
      case InvalidCredentialsException:
        statusCode = HttpStatus.UNAUTHORIZED;
        error = 'Unauthorized';
        break;
      case InvalidTokenException:
      case PasswordUnchangedException:
      case FileLimitExceededException:
        statusCode = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
    }

    message = exception.message;

    response.status(statusCode).json({
      message,
      error,
      statusCode,
    });
  }
}
