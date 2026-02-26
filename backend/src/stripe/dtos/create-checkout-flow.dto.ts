import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PAYMENT_METHOD_TYPES,
  type PaymentMethodType,
} from '../../payments/constants/payment-method-types';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';

export class CreateCheckoutFlowDto extends PaymentMethodPolicyContextDto {
  @ApiProperty({ enum: ['payment', 'subscription'], example: 'payment' })
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

  @ApiPropertyOptional({
    enum: PAYMENT_METHOD_TYPES,
    isArray: true,
    example: ['card', 'link'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(PAYMENT_METHOD_TYPES, { each: true })
  paymentMethodTypes?: PaymentMethodType[];
}
