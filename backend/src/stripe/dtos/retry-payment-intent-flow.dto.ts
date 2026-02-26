import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class RetryPaymentIntentFlowDto {
  @ApiProperty({ example: 1999 })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty({ example: 'usd' })
  @IsString()
  @MaxLength(8)
  currency!: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  customerCountry?: string;

  @ApiPropertyOptional({ example: 'Retry for failed charge' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;
}
