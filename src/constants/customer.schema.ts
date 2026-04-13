import { z } from 'zod';

export const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default('India'),
});

export const customerSchema = z.object({
  type: z.enum(['individual', 'business']),
  name: z.string().min(1, 'Name is required'),
  contactPerson: z.string().optional(),
  email: z.string().email('Enter a valid email address').or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  altPhone: z.string().optional(),
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  billingAddress: addressSchema.optional(),
  shippingAddress: addressSchema.optional(),
  openingBalance: z.number(),
  creditLimit: z.number(),
  paymentTerms: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
