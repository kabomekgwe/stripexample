import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ConfirmSetupIntentDto {
  @ApiProperty({ example: 'a4a4d5c7-0bd1-4a58-9eb0-7fca8f67be6e' })
  @IsString()
  customerId!: string;

  @ApiProperty({ example: 'seti_1QmM8a2eZvKYlo2C3y2mVx7B' })
  @IsString()
  setupIntentId!: string;

  @ApiProperty({ example: 'pm_card_visa' })
  @IsString()
  paymentMethodId!: string;

  @ApiPropertyOptional({
    description:
      'When true and confirmation succeeds, set this method as customer default.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  setAsDefaultOnSuccess?: boolean;
}
