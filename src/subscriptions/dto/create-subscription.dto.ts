import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PAYMENT_METHOD_TYPES } from '../../payments/constants/payment-method-types';
import type { PaymentMethodType } from '../../payments/constants/payment-method-types';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';

export class CreateSubscriptionDto extends PaymentMethodPolicyContextDto {
  @ApiProperty({ example: 'cus_123456789' })
  @IsString()
  customerId!: string;

  @ApiProperty({ example: 'pro' })
  @IsString()
  planCode!: string;

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
