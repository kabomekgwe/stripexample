import { z } from 'zod';

export const CustomerSchema = z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    stripeCustomerId: z.string().nullable(),
    syncStatus: z.enum(['pending', 'synced', 'failed']).default('pending'),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const CreateCustomerSchema = z.object({
    userId: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
});

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
