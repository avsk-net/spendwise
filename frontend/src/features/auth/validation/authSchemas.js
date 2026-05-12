import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
})

export const registerSchema = z.object({
  email: z.string().email("Invalid email"),
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(8, "At least 8 characters"),
  currency: z.string().min(1, "Select a currency"),
})