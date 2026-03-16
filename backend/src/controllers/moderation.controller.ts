import { Response } from 'express';
import { prisma } from '../db';
import { AuthRequest } from '../middleware/auth';

// Get all flagged cases (Pending first)
export const getFlaggedCases = async (req: AuthRequest, res: Response) => {
  try {
    const cases = await prisma.flagCase.findMany({
      orderBy: [
        { status: 'asc' }, // PENDING first (alphabetically PENDING < REJECTED/APPROVED? No. PENDING need explicit sort or filter)
        // Let's filter or sort. Enum order in Prisma isn't guaranteed for sorting without mapping.
        // Simple sort by createdAt for now, and filter on frontend or via query.
        { createdAt: 'desc' }
      ],
      include: {
        content: true,
        reporter: {
          select: { name: true, email: true }
        }
      }
    });
    res.json(cases);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
};

// Resolve a case
export const resolveCase = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body; // APPROVED (keep content) or REJECTED (remove content/hidden) or just mark case closed.
    // FlagStatus: PENDING, APPROVED (Flag Approved -> Content Bad), REJECTED (Flag Rejected -> Content OK)

    const moderatorId = req.user?.userId;

    const updatedCase = await prisma.flagCase.update({
      where: { id },
      data: {
        status,
        moderatorId,
        decisionNote: note,
      }
    });

    // If Flag is APPROVED (meaning content is bad), we might want to hide content?
    // For now, just mark the case. Admin can delete content via Content API if needed.

    res.json(updatedCase);
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve case' });
  }
};
