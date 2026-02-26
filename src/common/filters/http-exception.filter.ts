import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    response.status(status).json({
      statusCode: status,
      message: this.resolveMessage(exceptionResponse),
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId: request.headers['x-request-id'] ?? null,
    });
  }

  private resolveMessage(exceptionResponse: unknown) {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const message = (exceptionResponse as { message: unknown }).message;
      return Array.isArray(message) ? message : (message ?? 'Request failed');
    }

    return 'Internal server error';
  }
}
