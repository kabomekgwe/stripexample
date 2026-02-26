import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateSetupIntentDto {
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
}
