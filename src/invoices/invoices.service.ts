import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoicesRepository } from './invoices.repository';

@Injectable()
export class InvoicesService {
  /** Creates the invoices service with DB access. */
  constructor(private readonly invoicesRepository: InvoicesRepository) {}

  /** Returns every invoice row stored for this company. */
  async listForCompany() {
    return this.invoicesRepository.findAll();
  }

  /** Returns one invoice by internal id or throws if missing. */
  async getById(id: string) {
    const invoice = await this.invoicesRepository.findById(id);
    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }
    return invoice;
  }
}
