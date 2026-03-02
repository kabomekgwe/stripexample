"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateCustomerSchema = exports.CustomerSchema = void 0;
const zod_1 = require("zod");
exports.CustomerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().optional(),
    stripeCustomerId: zod_1.z.string().nullable(),
    syncStatus: zod_1.z.enum(['pending', 'synced', 'failed']).default('pending'),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.CreateCustomerSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().optional(),
});
//# sourceMappingURL=customers.schema.js.map