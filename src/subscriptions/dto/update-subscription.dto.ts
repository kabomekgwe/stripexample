import { IsOptional, IsString } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  planCode?: string;

  @IsOptional()
  @IsString()
  stripePriceId?: string;
}
