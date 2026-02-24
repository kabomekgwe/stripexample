import { IsIn, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty({ example: 'cus_123456789' })
  @IsString()
  customerId!: string;

  @ApiProperty({ enum: ['payment', 'subscription'], example: 'subscription' })
  @IsIn(['payment', 'subscription'])
  mode!: 'payment' | 'subscription';

  @ApiProperty({ example: 'https://app.company.com/billing/success' })
  @IsUrl()
  successUrl!: string;

  @ApiProperty({ example: 'https://app.company.com/billing/cancel' })
  @IsUrl()
  cancelUrl!: string;

  @ApiProperty({ example: 'price_123456789' })
  @IsString()
  stripePriceId!: string;
}
