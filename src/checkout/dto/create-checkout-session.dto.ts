import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PAYMENT_METHOD_TYPES } from '../../payments/constants/payment-method-types';
import type { PaymentMethodType } from '../../payments/constants/payment-method-types';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';

export class CreateCheckoutSessionDto extends PaymentMethodPolicyContextDto {
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

  @ApiPropertyOptional({
    enum: PAYMENT_METHOD_TYPES,
    isArray: true,
    example: ['card'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(PAYMENT_METHOD_TYPES, { each: true })
  paymentMethodTypes?: PaymentMethodType[];
}
