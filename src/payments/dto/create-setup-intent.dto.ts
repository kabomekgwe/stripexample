import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { PAYMENT_METHOD_TYPES } from '../constants/payment-method-types';
import type { PaymentMethodType } from '../constants/payment-method-types';
import { PaymentMethodPolicyContextDto } from './payment-method-policy-context.dto';

export class CreateSetupIntentDto extends PaymentMethodPolicyContextDto {
  @ApiProperty({ example: 'a4a4d5c7-0bd1-4a58-9eb0-7fca8f67be6e' })
  @IsString()
  customerId!: string;

  @ApiPropertyOptional({
    enum: ['off_session', 'on_session'],
    example: 'off_session',
  })
  @IsOptional()
  @IsIn(['off_session', 'on_session'])
  usage?: 'off_session' | 'on_session';

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
