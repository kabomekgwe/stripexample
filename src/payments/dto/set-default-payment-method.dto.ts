import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SetDefaultPaymentMethodDto {
  @ApiProperty({ example: 'a4a4d5c7-0bd1-4a58-9eb0-7fca8f67be6e' })
  @IsString()
  customerId!: string;

  @ApiProperty({ example: 'pm_123456789' })
  @IsString()
  paymentMethodId!: string;
}
