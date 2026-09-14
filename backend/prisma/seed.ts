import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------- Config ----------
const AISLES = ["A1", "A2", "A3"];
const RACKS = ["R1", "R2"];
const BINS_PER_RACK = 5; // 3 aisles * 2 racks * 5 bins = 30 bins

const PRODUCTS = [
  { sku: "SKU-1001", name: "Cardboard Box 12x12" },
  { sku: "SKU-1002", name: "Bubble Wrap Roll" },
  { sku: "SKU-1003", name: "Packing Tape" },
  { sku: "SKU-1004", name: "Wooden Pallet 48x40" },
  { sku: "SKU-1005", name: "Shrink Wrap Film" },
  { sku: "SKU-1006", name: "Steel Shelving Bracket" },
  { sku: "SKU-1007", name: "Plastic Tote Bin" },
  { sku: "SKU-1008", name: "Safety Gloves (pair)" },
  { sku: "SKU-1009", name: "Forklift Battery" },
  { sku: "SKU-1010", name: "Label Printer Ribbon" },
  { sku: "SKU-1011", name: "Hand Truck Wheel" },
  { sku: "SKU-1012", name: "Warehouse Barcode Scanner" },
];

const ACTIVITY_TYPES = ["PUTAWAY", "PICK", "ADJUSTMENT", "MOVE"] as const;
// Weighted so PICK is most common, ADJUSTMENT is rare
const ACTIVITY_WEIGHTS: Record<(typeof ACTIVITY_TYPES)[number], number> = {
  PUTAWAY: 0.2,
  PICK: 0.55,
  ADJUSTMENT: 0.1,
  MOVE: 0.15,
};

const DAYS_OF_HISTORY = 30;

// ---------- Helpers ----------
function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function weightedActivityType(): string {
  const r = Math.random();
  let cumulative = 0;
  for (const type of ACTIVITY_TYPES) {
    cumulative += ACTIVITY_WEIGHTS[type];
    if (r <= cumulative) return type;
  }
  return "PICK";
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomDateWithinLast(days: number): Date {
  const now = Date.now();
  const past = now - days * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

// ---------- Main ----------
async function main() {
  console.log("Cleaning existing data...");
  // Delete in dependency order (children first)
  await prisma.auditTask.deleteMany({});
  await prisma.auditPlan.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.pallet.deleteMany({});
  await prisma.bin.deleteMany({});

  console.log("Creating bins...");
  const bins = [];

  for (const aisle of AISLES) {
    for (const rack of RACKS) {
      for (let i = 1; i <= BINS_PER_RACK; i++) {
        const code = `${aisle}-${rack}-B${String(i).padStart(2, "0")}`;

        // Roughly 20% of bins have never been audited (null),
        // the rest were audited between 3 and 45 days ago.
        const neverAudited = Math.random() < 0.2;
        const lastAuditedAt = neverAudited
          ? null
          : daysAgo(randomInt(3, 45));

        const bin = await prisma.bin.create({
          data: {
            code,
            aisle,
            rack,
            riskScore: 0, // will be filled in by the scoring service
            lastAuditedAt,
          },
        });

        bins.push(bin);
      }
    }
  }

  console.log(`Created ${bins.length} bins.`);

  console.log("Seeding pallets...");
  for (const bin of bins) {
    // Each bin gets 0-3 pallets. Some bins are intentionally empty
    // to simulate "should be empty but might have stray inventory" cases.
    const palletCount = randomInt(0, 3);

    for (let p = 0; p < palletCount; p++) {
      const product = randomChoice(PRODUCTS);
      await prisma.pallet.create({
        data: {
          sku: product.sku,
          productName: product.name,
          quantity: randomInt(1, 200),
          binId: bin.id,
        },
      });
    }
  }

  console.log("Simulating last 30 days of warehouse activity...");
  let totalActivity = 0;

  for (const bin of bins) {
    // "Hot" bins get a lot more activity than "quiet" bins,
    // which gives the scoring service something meaningful to differentiate.
    const isHotBin = Math.random() < 0.3;
    const activityCount = isHotBin ? randomInt(15, 40) : randomInt(0, 12);

    for (let a = 0; a < activityCount; a++) {
      await prisma.activityLog.create({
        data: {
          binId: bin.id,
          type: weightedActivityType(),
          createdAt: randomDateWithinLast(DAYS_OF_HISTORY),
        },
      });
      totalActivity++;
    }
  }

  console.log(`Created ${totalActivity} activity log entries.`);
  console.log("Seed complete ✅");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });