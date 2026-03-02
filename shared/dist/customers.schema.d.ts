import { z } from 'zod';
export declare const CustomerSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    stripeCustomerId: z.ZodNullable<z.ZodString>;
    syncStatus: z.ZodDefault<z.ZodEnum<["pending", "synced", "failed"]>>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: string;
    stripeCustomerId: string | null;
    email: string;
    syncStatus: "pending" | "synced" | "failed";
    updatedAt: string;
    name?: string | undefined;
}, {
    id: string;
    createdAt: string;
    stripeCustomerId: string | null;
    email: string;
    updatedAt: string;
    name?: string | undefined;
    syncStatus?: "pending" | "synced" | "failed" | undefined;
}>;
export type Customer = z.infer<typeof CustomerSchema>;
export declare const CreateCustomerSchema: z.ZodObject<{
    userId: z.ZodString;
    email: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    userId: string;
    name?: string | undefined;
}, {
    email: string;
    userId: string;
    name?: string | undefined;
}>;
export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
