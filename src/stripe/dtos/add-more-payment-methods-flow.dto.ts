import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
} from 'class-validator';
import {
  PAYMENT_METHOD_TYPES,
  type PaymentMethodType,
} from '../../payments/constants/payment-method-types';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';

export class AddMorePaymentMethodsFlowDto extends PaymentMethodPolicyContextDto {
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

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  setAsDefaultWhenFirst?: boolean;
}
