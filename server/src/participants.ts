import { Router } from "express";
import { z } from "zod";
import { prisma } from "./prisma";

const phonePattern = /^\+?[0-9().\s-]+$/;

const participantInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100, "First name must be 100 characters or fewer."),
  lastName: z.string().trim().min(1, "Last name is required.").max(100, "Last name must be 100 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address.").max(254, "Email must be 254 characters or fewer.").transform((value) => value.toLowerCase()),
  phone: z.string().trim().min(1, "Phone number is required.").max(25, "Phone number must be 25 characters or fewer.").refine((value) => {
    const digits = value.replace(/\D/g, "");
    return phonePattern.test(value) && digits.length >= 7 && digits.length <= 15;
  }, "Enter a phone number with 7–15 digits; common formatting is allowed."),
  heightInches: z.number().finite("Height must be a finite number.").positive("Height must be greater than zero."),
  weightPounds: z.number().finite("Weight must be a finite number.").positive("Weight must be greater than zero."),
});

export const participantsRouter = Router();

participantsRouter.get("/", async (_request, response, next) => {
  try {
    const records = await prisma.participant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        heightInches: true,
        weightPounds: true,
        createdAt: true,
      },
    });

    response.json(records.map((participant) => ({
      ...participant,
      bmi: Math.round((participant.weightPounds / (participant.heightInches ** 2) * 703) * 100) / 100,
    })));
  } catch (error) {
    next(error);
  }
});

participantsRouter.post("/", async (request, response, next) => {
  const parsed = participantInputSchema.safeParse(request.body);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "_form");
      fieldErrors[field] ??= issue.message;
    }
    response.status(400).json({ error: "Validation failed.", fieldErrors });
    return;
  }

  try {
    const participant = await prisma.participant.create({
      data: parsed.data,
    });

    response.status(201).json({
      ...participant,
      bmi: Math.round((participant.weightPounds / (participant.heightInches ** 2) * 703) * 100) / 100,
    });
  } catch (error) {
    next(error);
  }
});
