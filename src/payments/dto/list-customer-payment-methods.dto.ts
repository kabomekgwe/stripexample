import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PAYMENT_METHOD_TYPES } from '../constants/payment-method-types';
import type { PaymentMethodType } from '../constants/payment-method-types';

export class ListCustomerPaymentMethodsDto {
  @ApiPropertyOptional({
    enum: PAYMENT_METHOD_TYPES,
    example: 'card',
  })
  @IsOptional()
  @IsIn(PAYMENT_METHOD_TYPES)
  type?: PaymentMethodType;
}
