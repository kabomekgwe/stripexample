import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiPropertyOptional({ example: 'usr_123' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;

  @ApiProperty({ example: 'billing@company.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional({ example: 'Company Billing Contact' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
