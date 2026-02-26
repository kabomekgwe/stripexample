import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class RecordSubscriptionUsageDto {
  @ApiProperty({
    example: 'api_tokens_used',
    description: 'Stripe meter event name configured in Billing > Meters.',
  })
  @IsString()
  @Matches(/^[A-Za-z0-9_.-]+$/)
  eventName!: string;

  @ApiProperty({ example: 'cus_123456789' })
  @IsString()
  stripeCustomerId!: string;

  @ApiProperty({ example: 2450000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  value!: number;

  @ApiPropertyOptional({
    description: 'Unix seconds timestamp for usage event.',
    example: 1767139200,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  timestamp?: number;

  @ApiPropertyOptional({
    description: 'Optional idempotency identifier for Stripe meter event.',
    example: 'usage-evt-5dbf76f4-4a22-4a31-a91f-91ea4df99f91',
  })
  @IsOptional()
  @IsString()
  identifier?: string;
}
