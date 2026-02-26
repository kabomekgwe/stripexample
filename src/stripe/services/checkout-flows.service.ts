import { Injectable, NotFoundException } from '@nestjs/common';
import { CheckoutService } from '../../checkout/checkout.service';
import type { CreateCheckoutFlowDto } from '../dtos/create-checkout-flow.dto';

@Injectable()
export class CheckoutFlowsService {
  constructor(private readonly checkoutService: CheckoutService) {}

  async startCheckoutFlow(
    customerId: string,
    dto: CreateCheckoutFlowDto,
    idempotencyKey: string,
  ) {
    const checkout = await this.checkoutService.createSession(
      {
        ...dto,
        customerId,
      },
      idempotencyKey,
    );

    return {
      checkout,
      flow: this.toFlowStatus(this.extractStatus(checkout)),
    };
  }

  async getCheckoutFlowStatus(customerId: string, checkoutSessionId: string) {
    const checkout = await this.checkoutService.getById(checkoutSessionId);
    if (!checkout || checkout.customerId !== customerId) {
      throw new NotFoundException('Checkout session not found for customer.');
    }

    return {
      checkout,
      flow: this.toFlowStatus(checkout.status),
    };
  }

  async recoverExpiredCheckoutFlow(
    customerId: string,
    expiredCheckoutSessionId: string,
    dto: CreateCheckoutFlowDto,
    idempotencyKey: string,
  ) {
    const expired = await this.checkoutService.getById(
      expiredCheckoutSessionId,
    );
    if (!expired || expired.customerId !== customerId) {
      throw new NotFoundException('Checkout session not found for customer.');
    }

    const replacement = await this.startCheckoutFlow(
      customerId,
      dto,
      idempotencyKey,
    );

    return {
      replacedCheckoutSessionId: expiredCheckoutSessionId,
      previousStatus: expired.status,
      replacement,
    };
  }

  private toFlowStatus(status: string | null) {
    if (status === 'complete') {
      return {
        status,
        nextAction: 'none',
        recoverable: false,
      };
    }

    if (status === 'expired') {
      return {
        status,
        nextAction: 'start_new_checkout',
        recoverable: true,
      };
    }

    if (status === 'open' || status === 'pending') {
      return {
        status,
        nextAction: 'continue_checkout',
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
