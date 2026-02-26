import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListCustomerPaymentMethodsDto {
  @ApiPropertyOptional({
    enum: [
      'card',
      'acss_debit',
      'affirm',
      'afterpay_clearpay',
      'alipay',
      'au_becs_debit',
      'bacs_debit',
      'bancontact',
      'blik',
      'boleto',
      'cashapp',
      'customer_balance',
      'eps',
      'fpx',
      'giropay',
      'grabpay',
      'ideal',
      'klarna',
      'konbini',
      'link',
      'oxxo',
      'p24',
      'paynow',
      'paypal',
      'promptpay',
      'sepa_debit',
      'sofort',
      'us_bank_account',
      'wechat_pay',
      'zip',
    ],
    example: 'card',
  })
  @IsOptional()
  @IsIn([
    'card',
    'acss_debit',
    'affirm',
    'afterpay_clearpay',
    'alipay',
    'au_becs_debit',
    'bacs_debit',
    'bancontact',
    'blik',
    'boleto',
    'cashapp',
    'customer_balance',
    'eps',
    'fpx',
    'giropay',
    'grabpay',
    'ideal',
    'klarna',
    'konbini',
    'link',
    'oxxo',
    'p24',
    'paynow',
    'paypal',
    'promptpay',
    'sepa_debit',
    'sofort',
    'us_bank_account',
    'wechat_pay',
    'zip',
  ])
  type?:
    | 'card'
    | 'acss_debit'
    | 'affirm'
    | 'afterpay_clearpay'
    | 'alipay'
    | 'au_becs_debit'
    | 'bacs_debit'
    | 'bancontact'
    | 'blik'
    | 'boleto'
    | 'cashapp'
    | 'customer_balance'
    | 'eps'
    | 'fpx'
    | 'giropay'
    | 'grabpay'
    | 'ideal'
    | 'klarna'
    | 'konbini'
    | 'link'
    | 'oxxo'
    | 'p24'
    | 'paynow'
    | 'paypal'
    | 'promptpay'
    | 'sepa_debit'
    | 'sofort'
    | 'us_bank_account'
    | 'wechat_pay'
    | 'zip';
}
