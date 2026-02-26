import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({ example: 'a4a4d5c7-0bd1-4a58-9eb0-7fca8f67be6e' })
  @IsString()
  paymentIntentId!: string;

  @ApiProperty({ example: 500 })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiPropertyOptional({ example: 'requested_by_customer' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  reason?: string;
}
