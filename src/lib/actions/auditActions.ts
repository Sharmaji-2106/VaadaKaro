'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';

export async function logAction(params: {
  action: string;
  entity: string;
  entityId: string;
  metadata?: any;
}) {
  try {
    const session = await auth();
    const userId = (session?.user as any)?.id;

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // Audit logging should not break the main flow, so we just log the error
    console.error('Audit logging failed:', error);
  }
}

export async function getAuditLogs(entityId?: string) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;

    if (role !== 'ADMIN') {
      throw new Error('Unauthorized');
    }

    return await prisma.auditLog.findMany({
      where: entityId ? { entityId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });
  } catch (error) {
    console.error('Fetch audit logs failed:', error);
    return [];
  }
}
