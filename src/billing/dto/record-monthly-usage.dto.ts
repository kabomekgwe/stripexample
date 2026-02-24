import { IsInt, IsString, Matches, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RecordMonthlyUsageDto {
  @ApiProperty({ example: 'cus_123456789' })
  @IsString()
  stripeCustomerId!: string;

  @ApiProperty({ example: '2026-02' })
  @Matches(/^\d{4}-\d{2}$/)
  billingPeriod!: string;

  @ApiProperty({ example: 2450000 })
  @IsInt()
  @Min(0)
  usageQuantity!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  unitPriceCents!: number;
}
