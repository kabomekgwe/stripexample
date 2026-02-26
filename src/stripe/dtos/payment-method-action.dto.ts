import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PaymentMethodActionDto {
  @ApiProperty({ example: 'pm_123456789' })
  @IsString()
  paymentMethodId!: string;
}
