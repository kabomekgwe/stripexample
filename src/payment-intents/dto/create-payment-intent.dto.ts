import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 'cus_123456789' })
  @IsString()
  customerId!: string;

  @ApiProperty({ example: 1999 })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty({ example: 'usd' })
  @IsString()
  @MaxLength(8)
  currency!: string;

  @ApiPropertyOptional({ example: 'Monthly platform fee' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  customerCountry?: string;
}
