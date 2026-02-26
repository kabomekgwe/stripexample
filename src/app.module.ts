import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidation } from './config/env.validation';
import { DatabaseModule } from './infra/database/database.module';
import { RedisModule } from './infra/redis/redis.module';
import { IdempotencyModule } from './infra/idempotency/idempotency.module';
import { HealthController } from './health.controller';
import { StripeModule } from './stripe/stripe.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    RedisModule,
    IdempotencyModule,
    StripeModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
