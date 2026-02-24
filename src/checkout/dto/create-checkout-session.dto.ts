import { IsIn, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  @MaxLength(128)
  tenantId!: string;

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
