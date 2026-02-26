import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const requestId = request.headers['x-request-id'] ?? randomUUID();
    const normalizedRequestId = Array.isArray(requestId)
      ? requestId[0]
      : requestId;

    request.headers['x-request-id'] = normalizedRequestId;
    response.setHeader('x-request-id', normalizedRequestId);

    next();
  }
}
