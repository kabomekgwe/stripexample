import { IsString, MaxLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @MaxLength(128)
  tenantId!: string;

  @IsString()
  customerId!: string;

  @IsString()
  planCode!: string;

  @IsString()
  stripePriceId!: string;
}
