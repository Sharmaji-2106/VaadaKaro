"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";

export async function getLawyers(filters: {
  location?: string;
  specialization?: string;
  maxFees?: number;
  language?: string;
  isAvailable?: boolean;
  search?: string;
}) {
  const where: Prisma.LawyerProfileWhereInput = {
    isAvailable: filters.isAvailable !== undefined ? filters.isAvailable : undefined,
  };

  if (filters.location) {
    where.location = { contains: filters.location, mode: 'insensitive' };
  }

  if (filters.specialization && filters.specialization !== "All") {
    where.specialization = { has: filters.specialization };
  }

  if (filters.maxFees) {
    where.fees = { lte: filters.maxFees };
  }

  if (filters.language) {
    where.languages = { has: filters.language };
  }

  if (filters.search) {
    where.OR = [
      { user: { name: { contains: filters.search, mode: 'insensitive' } } },
      { bio: { contains: filters.search, mode: 'insensitive' } },
      { specialization: { has: filters.search } }
    ];
  }

  return await prisma.lawyerProfile.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          image: true,
        }
      }
    },
    orderBy: {
      rating: 'desc'
    }
  });
}

export async function createBooking(data: {
  lawyerId: string;
  date: string;
  timeSlot: string;
  description: string;
  isOffline: boolean;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const booking = await prisma.booking.create({
    data: {
      citizenId: (session.user as any).id,
      lawyerId: data.lawyerId,
      date: new Date(data.date),
      timeSlot: data.timeSlot,
      description: data.description,
      isOffline: data.isOffline,
    },
  });

  // Here we would typically send notifications, but that's for Feature 4
  return booking;
}

export async function getLawyerById(id: string) {
  return await prisma.lawyerProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          image: true,
        }
      }
    }
  });
}
