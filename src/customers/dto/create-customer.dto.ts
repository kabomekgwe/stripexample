import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MaxLength(128)
  tenantId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;
}
