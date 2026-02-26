import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PAYMENT_METHOD_TYPES } from '../constants/payment-method-types';
import { PaymentMethodPolicyContextDto } from './payment-method-policy-context.dto';

export class UpsertPaymentMethodPolicyDto extends PaymentMethodPolicyContextDto {
  @ApiProperty({ enum: PAYMENT_METHOD_TYPES, example: 'card' })
  @IsIn(PAYMENT_METHOD_TYPES)
  paymentMethodType!: (typeof PAYMENT_METHOD_TYPES)[number];

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  priority?: number;
}
