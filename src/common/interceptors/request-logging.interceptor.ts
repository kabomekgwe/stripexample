import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      url: string;
      headers: Record<string, string | undefined>;
    }>();

    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          this.logger.log(
            `${request.method} ${request.url} ${durationMs}ms requestId=${request.headers['x-request-id'] ?? 'n/a'}`,
          );
        },
      }),
    );
  }
}
