import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { Response } from 'express';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      if (typeof exceptionResponse === 'string') {
        error = exceptionResponse;
      } else if (exceptionResponse?.message) {
        error = Array.isArray(exceptionResponse.message)
          ? exceptionResponse.message.join(', ')
          : exceptionResponse.message;
      } else if (exception.message) {
        error = exception.message;
      }
      code = exception.name?.toUpperCase() || 'HTTP_EXCEPTION';
    } else if (exception instanceof Error) {
      error = exception.message || error;
    }

    if (statusCode >= 500 && process.env.SENTRY_DSN) {
      Sentry.captureException(exception);
    }

    response.status(statusCode).json({ error, code, statusCode });
  }
}
