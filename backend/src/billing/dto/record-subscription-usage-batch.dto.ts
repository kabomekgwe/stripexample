import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { RecordSubscriptionUsageDto } from './record-subscription-usage.dto';

export class RecordSubscriptionUsageBatchDto {
  @ApiProperty({
    type: [RecordSubscriptionUsageDto],
    description: 'Batch of usage meter events to send to Stripe.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecordSubscriptionUsageDto)
  events!: RecordSubscriptionUsageDto[];

  @ApiPropertyOptional({
    default: true,
    description:
      'When true, process all events and return per-event failures without aborting the batch.',
  })
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;
}
