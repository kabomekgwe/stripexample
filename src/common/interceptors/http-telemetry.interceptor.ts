import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { addSpanAttributes } from '../../observability/tracing.util';

@Injectable()
export class HttpTelemetryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      path: string;
      route?: { path?: string };
      headers: Record<string, string | string[] | undefined>;
      params?: Record<string, string | undefined>;
    }>();
    const response = http.getResponse<{ statusCode: number }>();

    addSpanAttributes({
      'http.request.method': request.method,
      'url.path': request.path,
      'http.route': request.route?.path,
      'enduser.id': this.readFirstHeaderValue(request.headers['x-user-id']),
      'billing.customer.id': request.params?.customerId,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          addSpanAttributes({
            'http.response.status_code': response.statusCode,
          });
        },
      }),
    );
  }

  private readFirstHeaderValue(
    headerValue: string | string[] | undefined,
  ): string | undefined {
    if (!headerValue) {
      return undefined;
    }

    return Array.isArray(headerValue) ? headerValue[0] : headerValue;
  }
}
