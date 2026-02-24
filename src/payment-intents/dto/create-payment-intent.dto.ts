import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  @MaxLength(128)
  tenantId!: string;

  @IsString()
  customerId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @MaxLength(8)
  currency!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;
}
