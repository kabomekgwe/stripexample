import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateRefundDto {
  @IsString()
  @MaxLength(128)
  tenantId!: string;

  @IsString()
  paymentIntentId!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  reason?: string;
}
