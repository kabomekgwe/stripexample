import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 'a4a4d5c7-0bd1-4a58-9eb0-7fca8f67be6e' })
  @IsString()
  customerId!: string;

  @ApiProperty({ example: 1999 })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiPropertyOptional({ example: 'gbp', default: 'gbp' })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

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
