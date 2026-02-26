import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { shutdownTelemetry, startTelemetry } from './observability/telemetry';

async function bootstrap() {
  /**
   * Starts the NestJS application with strict request validation and raw body support.
   */
  await startTelemetry();

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);
  const frontendOrigin = configService.get<string>(
    'FRONTEND_ORIGIN',
    'http://localhost:3001',
  );
  app.enableCors({
    origin: frontendOrigin.split(',').map((item) => item.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const swaggerEnabledEnv = configService.get<string>('SWAGGER_ENABLED');
  const swaggerEnabled =
    swaggerEnabledEnv === undefined
      ? nodeEnv !== 'production'
      : swaggerEnabledEnv === 'true';

  if (swaggerEnabled) {
    const swaggerPath = configService.get<string>('SWAGGER_PATH', 'docs');
    const docsToken = configService.get<string>('SWAGGER_DOCS_TOKEN');

    if (docsToken) {
      const docsAuthMiddleware = (
        req: Request,
        res: Response,
        next: NextFunction,
      ) => {
        if (req.headers['x-docs-token'] === docsToken) {
          next();
          return;
        }

        res.status(401).json({ message: 'Unauthorized docs access.' });
      };

      app.use(`/${swaggerPath}`, docsAuthMiddleware);
      app.use(`/${swaggerPath}-json`, docsAuthMiddleware);
    }

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Stripe Billing Service')
      .setDescription(
        'DB-first Stripe integration for a single-company production app',
      )
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, swaggerDocument, {
      jsonDocumentUrl: `${swaggerPath}-json`,
      yamlDocumentUrl: `${swaggerPath}-yaml`,
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const shutdown = async () => {
    await app.close();
    await shutdownTelemetry();
  };

  process.on('SIGTERM', () => {
    void shutdown();
  });
  process.on('SIGINT', () => {
    void shutdown();
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
