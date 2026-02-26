import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentIntentsService } from '../../payment-intents/payment-intents.service';
import type { RetryPaymentIntentFlowDto } from '../dtos/retry-payment-intent-flow.dto';

@Injectable()
export class PaymentRecoveryService {
  constructor(private readonly paymentIntentsService: PaymentIntentsService) {}

  async getPaymentIntentRecoveryStatus(
    customerId: string,
    paymentIntentId: string,
  ) {
    const paymentIntent = await this.requirePaymentIntent(
      customerId,
      paymentIntentId,
    );

    return {
      paymentIntent,
      recovery: this.toRecoveryStatus(paymentIntent.status),
    };
  }

  async retryPayment(
    customerId: string,
    failedPaymentIntentId: string,
    dto: RetryPaymentIntentFlowDto,
    idempotencyKey: string,
  ) {
    await this.requirePaymentIntent(customerId, failedPaymentIntentId);

    const replacement = await this.paymentIntentsService.create(
      {
        ...dto,
        customerId,
      },
      idempotencyKey,
    );

    return {
      replacedPaymentIntentId: failedPaymentIntentId,
      replacement,
      recovery: this.toRecoveryStatus(this.extractStatus(replacement)),
    };
  }

  private async requirePaymentIntent(
    customerId: string,
    paymentIntentId: string,
  ) {
    const paymentIntent =
      await this.paymentIntentsService.getById(paymentIntentId);
    if (!paymentIntent || paymentIntent.customerId !== customerId) {
      throw new NotFoundException('Payment intent not found for customer.');
    }

    return paymentIntent;
  }

  private toRecoveryStatus(status: string | null) {
    if (status === 'succeeded') {
      return {
        status,
        nextAction: 'none',
        recoverable: false,
      };
    }

    if (status === 'requires_action') {
      return {
        status,
        nextAction: 'authenticate_payment',
        recoverable: true,
      };
    }

    if (status === 'requires_payment_method') {
      return {
        status,
        nextAction: 'collect_new_payment_method',
        recoverable: true,
      };
    }

    if (status === 'processing') {
      return {
        status,
        nextAction: 'wait_for_webhook_sync',
        recoverable: true,
      };
    }

    return {
      status,
      nextAction: 'contact_support',
      recoverable: true,
    };
  }

  private extractStatus(value: unknown) {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const status = (value as { status?: unknown }).status;
    return typeof status === 'string' ? status : null;
  }
}
