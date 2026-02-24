import { IsIn, IsString, IsUrl } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  customerId!: string;

  @IsIn(['payment', 'subscription'])
  mode!: 'payment' | 'subscription';

  @IsUrl()
  successUrl!: string;

  @IsUrl()
  cancelUrl!: string;

  @IsString()
  stripePriceId!: string;
}
