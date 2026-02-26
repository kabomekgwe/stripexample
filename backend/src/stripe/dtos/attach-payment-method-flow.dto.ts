import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import {
  PAYMENT_METHOD_ATTACH_IF_EXISTS,
  type PaymentMethodAttachIfExists,
} from '../constants/payment-method-flow.constants';
import { PaymentMethodPolicyContextDto } from '../../payments/dto/payment-method-policy-context.dto';

export class AttachPaymentMethodFlowDto extends PaymentMethodPolicyContextDto {
  @ApiProperty({ example: 'pm_123456789' })
  @IsString()
  paymentMethodId!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;

  @ApiPropertyOptional({
    enum: PAYMENT_METHOD_ATTACH_IF_EXISTS,
    example: 'reuse',
  })
  @IsOptional()
  @IsIn(PAYMENT_METHOD_ATTACH_IF_EXISTS)
  ifExists?: PaymentMethodAttachIfExists;
}
