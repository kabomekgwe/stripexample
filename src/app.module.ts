import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { trace } from '@opentelemetry/api';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HttpTelemetryInterceptor } from './common/interceptors/http-telemetry.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { envValidation } from './config/env.validation';
import { DatabaseModule } from './infra/database/database.module';
import { RedisModule } from './infra/redis/redis.module';
import { IdempotencyModule } from './infra/idempotency/idempotency.module';
import { HealthController } from './health.controller';
import { LoggerErrorInterceptor, LoggerModule } from 'nestjs-pino';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>('PINO_LOG_LEVEL', 'info'),
          transport:
            configService.get<string>('NODE_ENV') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
          autoLogging: {
            ignore: (request) => {
              const url = request.url ?? '';
              return url === '/health' || url.startsWith('/docs');
            },
          },
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie'],
            censor: '[REDACTED]',
          },
          customProps: (req) => {
            const spanContext = trace.getActiveSpan()?.spanContext();

            return {
              requestId: req.headers['x-request-id'],
              traceId: spanContext?.traceId,
              spanId: spanContext?.spanId,
            };
          },
        },
      }),
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    IdempotencyModule,
    StripeModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpTelemetryInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerErrorInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
