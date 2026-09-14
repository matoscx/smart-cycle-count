import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

// ---------- Weights & caps ----------
// Total possible points always adds up to 100.
const WEIGHTS = {
  recency: 35, // time since last audit
  adjustment: 30, // ADJUSTMENT activity frequency
  volume: 20, // PICK + PUTAWAY activity volume
  move: 15, // MOVE activity frequency
};

const CAPS = {
  recencyDays: 90, // 90+ days since audit = max points
  adjustmentCount: 5, // 5+ adjustments in window = max points
  volumeCount: 40, // 40+ pick/putaway events in window = max points
  moveCount: 6, // 6+ moves in window = max points
};

const LOOKBACK_DAYS = 30;

interface ActivityLogLike {
  type: string;
  createdAt: Date;
}

interface ScoreFactor {
  name: string;
  points: number;
  maxPoints: number;
  detail: string;
}

interface ScoreBreakdown {
  total: number;
  factors: ScoreFactor[];
}

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  /** Recomputes and saves the score for every bin. */
  async recomputeAll(): Promise<{ updated: number }> {
    const bins = await this.prisma.bin.findMany({
      include: { activityLogs: true },
    });

    let updated = 0;
    for (const bin of bins) {
      const breakdown = this.computeBreakdown(
        bin.lastAuditedAt,
        bin.activityLogs,
      );
      await this.prisma.bin.update({
        where: { id: bin.id },
        data: {
          riskScore: breakdown.total,
          scoreBreakdown: breakdown as any,
        },
      });
      updated++;
    }

    return { updated };
  }

  /** Recomputes and saves the score for a single bin. Useful after a count is recorded. */
  async recomputeOne(binId: string) {
    const bin = await this.prisma.bin.findUniqueOrThrow({
      where: { id: binId },
      include: { activityLogs: true },
    });

    const breakdown = this.computeBreakdown(
      bin.lastAuditedAt,
      bin.activityLogs,
    );

    return this.prisma.bin.update({
      where: { id: bin.id },
      data: {
        riskScore: breakdown.total,
        scoreBreakdown: breakdown as any,
      },
    });
  }

  private computeBreakdown(
    lastAuditedAt: Date | null,
    activityLogs: ActivityLogLike[],
  ): ScoreBreakdown {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - LOOKBACK_DAYS);

    const recentLogs = activityLogs.filter((log) => log.createdAt >= cutoff);

    const adjustmentCount = recentLogs.filter(
      (l) => l.type === "ADJUSTMENT",
    ).length;
    const volumeCount = recentLogs.filter(
      (l) => l.type === "PUTAWAY" || l.type === "PICK",
    ).length;
    const moveCount = recentLogs.filter((l) => l.type === "MOVE").length;

    // --- Factor 1: time since last audit ---
    let recencyPoints: number;
    let recencyDetail: string;
    if (!lastAuditedAt) {
      recencyPoints = WEIGHTS.recency;
      recencyDetail = "This bin has never been audited";
    } else {
      const daysSince = Math.floor(
        (Date.now() - lastAuditedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const capped = Math.min(daysSince, CAPS.recencyDays);
      recencyPoints = Math.round(
        (capped / CAPS.recencyDays) * WEIGHTS.recency,
      );
      recencyDetail = `Last audited ${daysSince} day${daysSince === 1 ? "" : "s"} ago`;
    }

    // --- Factor 2: adjustment frequency ---
    const adjustmentPoints = Math.round(
      (Math.min(adjustmentCount, CAPS.adjustmentCount) /
        CAPS.adjustmentCount) *
        WEIGHTS.adjustment,
    );

    // --- Factor 3: pick/putaway volume ---
    const volumePoints = Math.round(
      (Math.min(volumeCount, CAPS.volumeCount) / CAPS.volumeCount) *
        WEIGHTS.volume,
    );

    // --- Factor 4: move frequency ---
    const movePoints = Math.round(
      (Math.min(moveCount, CAPS.moveCount) / CAPS.moveCount) * WEIGHTS.move,
    );

    const total = Math.min(
      100,
      recencyPoints + adjustmentPoints + volumePoints + movePoints,
    );

    return {
      total,
      factors: [
        {
          name: "Time since last audit",
          points: recencyPoints,
          maxPoints: WEIGHTS.recency,
          detail: recencyDetail,
        },
        {
          name: "Adjustment frequency",
          points: adjustmentPoints,
          maxPoints: WEIGHTS.adjustment,
          detail: `${adjustmentCount} adjustment${adjustmentCount === 1 ? "" : "s"} in the last ${LOOKBACK_DAYS} days`,
        },
        {
          name: "Pick / putaway volume",
          points: volumePoints,
          maxPoints: WEIGHTS.volume,
          detail: `${volumeCount} pick/putaway event${volumeCount === 1 ? "" : "s"} in the last ${LOOKBACK_DAYS} days`,
        },
        {
          name: "Move frequency",
          points: movePoints,
          maxPoints: WEIGHTS.move,
          detail: `${moveCount} move${moveCount === 1 ? "" : "s"} in the last ${LOOKBACK_DAYS} days`,
        },
      ],
    };
  }
}