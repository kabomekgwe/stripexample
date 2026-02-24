import { IsInt, IsString, Matches, Min } from 'class-validator';

export class RecordMonthlyUsageDto {
  @IsString()
  tenantId!: string;

  @IsString()
  stripeCustomerId!: string;

  @Matches(/^\d{4}-\d{2}$/)
  billingPeriod!: string;

  @IsInt()
  @Min(0)
  usageQuantity!: number;

  @IsInt()
  @Min(0)
  unitPriceCents!: number;
}
