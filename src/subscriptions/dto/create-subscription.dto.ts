import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'cus_123456789' })
  @IsString()
  customerId!: string;

  @ApiProperty({ example: 'pro' })
  @IsString()
  planCode!: string;

  @ApiProperty({ example: 'price_123456789' })
  @IsString()
  stripePriceId!: string;
}
