import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { parseMaterialPlan } from "@/lib/materials/material-service";

const priorityRank = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
} as const;

const statusRank = {
  IN_PROGRESS: 0,
  QUALITY_CHECK: 1,
  QUEUED: 2,
  COMPLETED: 3,
  CANCELLED: 4,
} as const;

type PlannerJob = Prisma.ProductionJobGetPayload<{
  include: {
    order: {
      include: {
        customer: {
          select: {
            firstName: true;
            lastName: true;
            email: true;
          };
        };
        customBouquetRequest: {
          select: {
            id: true;
            referenceNumber: true;
            totalStems: true;
            materialPlan: true;
            materialsReservedAt: true;
            materialsConsumedAt: true;
          };
        };
        items: {
          include: {
            variant: {
              include: {
                billOfMaterials: {
                  include: {
                    material: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

export async function getProductionPlannerData() {
  const db = getDb();
  if (!db) return null;

  const [jobs, materials, unplannedCandidates] = await Promise.all([
    db.productionJob.findMany({
      take: 200,
      include: {
        order: {
          include: {
            customer: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            customBouquetRequest: {
              select: {
                id: true,
                referenceNumber: true,
                totalStems: true,
                materialPlan: true,
                materialsReservedAt: true,
                materialsConsumedAt: true,
              },
            },
            items: {
              orderBy: { createdAt: "asc" },
              include: {
                variant: {
                  include: {
                    billOfMaterials: {
                      include: {
                        material: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.rawMaterial.findMany({
      where: { isActive: true },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        stockOnHand: true,
        stockReserved: true,
      },
    }),
    db.order.findMany({
      where: {
        paymentStatus: {
          in: ["PAID", "PARTIALLY_REFUNDED"],
        },
        productionJob: { is: null },
        status: { not: "CANCELLED" },
      },
      select: {
        id: true,
        customBouquetRequest: {
          select: { id: true },
        },
        items: {
          select: { productionQuantity: true },
        },
      },
    }),
  ]);

  const ordered = [...jobs].sort(compareJobs);
  const available = new Map(
    materials.map((material) => [
      material.id,
      Math.max(
        0,
        Number(material.stockOnHand) -
          Number(material.stockReserved),
      ),
    ]),
  );

  const plannedJobs = ordered.map((job) => {
    const readiness = materialReadiness(job, available);
    const overdue =
      Boolean(job.dueAt) &&
      job.dueAt! < new Date() &&
      !["COMPLETED", "CANCELLED"].includes(job.status);

    return {
      ...job,
      overdue,
      readiness,
      source: job.order.customBouquetRequest
        ? {
            type: "CUSTOM" as const,
            label:
              job.order.customBouquetRequest.referenceNumber,
          }
        : {
            type: "CATALOG" as const,
            label: "Catalog order",
          },
    };
  });

  const active = plannedJobs.filter(
    (job) => !["COMPLETED", "CANCELLED"].includes(job.status),
  );
  const workloads = workloadSummary(active);
  const unplanned = unplannedCandidates.filter(
    (order) =>
      Boolean(order.customBouquetRequest) ||
      order.items.some((item) => item.productionQuantity > 0),
  ).length;

  return {
    jobs: plannedJobs,
    workloads,
    metrics: {
      queued: active.filter((job) => job.status === "QUEUED").length,
      inProgress: active.filter(
        (job) => job.status === "IN_PROGRESS",
      ).length,
      qualityCheck: active.filter(
        (job) => job.status === "QUALITY_CHECK",
      ).length,
      overdue: active.filter((job) => job.overdue).length,
      blocked: active.filter(
        (job) => job.readiness.state === "BLOCKED",
      ).length,
      readyToStart: active.filter(
        (job) =>
          job.status === "QUEUED" &&
          ["READY", "RESERVED"].includes(job.readiness.state),
      ).length,
      unassigned: active.filter((job) => !job.assignedTo).length,
      readyForDelivery: plannedJobs.filter(
        (job) =>
          job.status === "COMPLETED" &&
          job.order.fulfillmentStatus === "READY",
      ).length,
      unplanned,
    },
  };
}

function materialReadiness(
  job: PlannerJob,
  available: Map<string, number>,
) {
  if (job.status === "CANCELLED") {
    return {
      state: "NOT_REQUIRED" as const,
      shortages: [],
      issues: [],
    };
  }

  const custom = job.order.customBouquetRequest;

  if (custom) {
    if (custom.materialsConsumedAt) {
      return {
        state: "CONSUMED" as const,
        shortages: [],
        issues: [],
      };
    }

    if (custom.materialsReservedAt) {
      return {
        state: "RESERVED" as const,
        shortages: [],
        issues: [],
      };
    }

    const plan = parseMaterialPlan(custom.materialPlan);

    return {
      state: "BLOCKED" as const,
      shortages: plan.map((item) => ({
        materialId: item.materialId,
        sku: item.sku,
        name: item.sku,
        unit: "",
        required: item.quantity,
        available: 0,
        shortage: item.quantity,
      })),
      issues: ["Custom bouquet material reservation is missing."],
    };
  }

  const demand = new Map<
    string,
    {
      materialId: string;
      sku: string;
      name: string;
      unit: string;
      required: number;
    }
  >();
  const issues: string[] = [];
  let hasProduction = false;
  let hasUnconsumedProduction = false;

  for (const item of job.order.items) {
    if (item.productionQuantity <= 0) continue;
    hasProduction = true;

    if (item.materialsConsumedAt) continue;
    hasUnconsumedProduction = true;

    if (!item.variant) {
      issues.push(`${item.sku}: product variant is missing.`);
      continue;
    }

    if (item.variant.billOfMaterials.length === 0) {
      issues.push(`${item.sku}: bill of materials is not configured.`);
      continue;
    }

    for (const recipe of item.variant.billOfMaterials) {
      const current = demand.get(recipe.materialId);
      const required =
        Number(recipe.quantity) * item.productionQuantity;

      demand.set(recipe.materialId, {
        materialId: recipe.materialId,
        sku: recipe.material.sku,
        name: recipe.material.name,
        unit: recipe.material.unit,
        required: (current?.required ?? 0) + required,
      });
    }
  }

  if (!hasProduction) {
    return {
      state: "NOT_REQUIRED" as const,
      shortages: [],
      issues: [],
    };
  }

  if (!hasUnconsumedProduction) {
    return {
      state: "CONSUMED" as const,
      shortages: [],
      issues: [],
    };
  }

  const shortages = [...demand.values()].flatMap((item) => {
    const materialAvailable = available.get(item.materialId) ?? 0;

    if (materialAvailable >= item.required) return [];

    return [
      {
        ...item,
        available: materialAvailable,
        shortage: item.required - materialAvailable,
      },
    ];
  });

  if (issues.length > 0 || shortages.length > 0) {
    return {
      state: "BLOCKED" as const,
      shortages,
      issues,
    };
  }

  for (const item of demand.values()) {
    available.set(
      item.materialId,
      (available.get(item.materialId) ?? 0) - item.required,
    );
  }

  return {
    state: "READY" as const,
    shortages: [],
    issues: [],
  };
}

function compareJobs(
  left: {
    status: keyof typeof statusRank;
    priority: keyof typeof priorityRank;
    dueAt: Date | null;
    createdAt: Date;
  },
  right: {
    status: keyof typeof statusRank;
    priority: keyof typeof priorityRank;
    dueAt: Date | null;
    createdAt: Date;
  },
) {
  const byStatus = statusRank[left.status] - statusRank[right.status];
  if (byStatus !== 0) return byStatus;

  const byPriority =
    priorityRank[left.priority] - priorityRank[right.priority];
  if (byPriority !== 0) return byPriority;

  const leftDue = left.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightDue = right.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  if (leftDue !== rightDue) return leftDue - rightDue;

  return left.createdAt.getTime() - right.createdAt.getTime();
}

function workloadSummary(
  jobs: Array<{
    assignedTo: string | null;
    plannedMinutes: number | null;
    priority: string;
    overdue: boolean;
  }>,
) {
  const map = new Map<
    string,
    {
      assignee: string;
      jobs: number;
      plannedMinutes: number;
      urgent: number;
      overdue: number;
    }
  >();

  for (const job of jobs) {
    const assignee = job.assignedTo?.trim() || "Unassigned";
    const current = map.get(assignee) ?? {
      assignee,
      jobs: 0,
      plannedMinutes: 0,
      urgent: 0,
      overdue: 0,
    };

    current.jobs += 1;
    current.plannedMinutes += job.plannedMinutes ?? 0;
    if (job.priority === "URGENT") current.urgent += 1;
    if (job.overdue) current.overdue += 1;

    map.set(assignee, current);
  }

  return [...map.values()].sort((a, b) => {
    if (a.assignee === "Unassigned") return -1;
    if (b.assignee === "Unassigned") return 1;
    return b.plannedMinutes - a.plannedMinutes;
  });
}
