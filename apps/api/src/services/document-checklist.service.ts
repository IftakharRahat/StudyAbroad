import type { DocumentStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const checklistInclude = {
  program: {
    include: {
      university: {
        include: { country: true }
      }
    }
  }
} satisfies Prisma.DocumentChecklistItemInclude;

type ChecklistProgram = {
  researchPreferred: boolean;
  workExperiencePreferred: boolean;
  scholarships: Array<{ requiredDocuments: string[] }>;
};

export function buildRequiredDocuments(program: ChecklistProgram) {
  const documents = new Map([
    ["Passport", "IDENTITY"],
    ["Academic transcripts", "ACADEMIC"],
    ["English language certificate", "ACADEMIC"],
    ["Statement of purpose", "APPLICATION"],
    ["Letters of recommendation", "APPLICATION"],
    ["CV / Resume", "APPLICATION"],
    ["Bank statement / proof of funds", "FINANCIAL"],
    ["Visa application documents", "VISA"]
  ]);

  if (program.researchPreferred) documents.set("Research proposal", "ACADEMIC");
  if (program.workExperiencePreferred) documents.set("Work experience certificate", "APPLICATION");
  for (const scholarship of program.scholarships) {
    for (const title of scholarship.requiredDocuments) documents.set(title, "SCHOLARSHIP");
  }

  return [...documents].map(([title, category]) => ({ title, category }));
}

export async function getDocumentChecklist(userId: string) {
  const plan = await prisma.applicationStrategyPlan.findFirst({
    where: { studentProfile: { userId } },
    select: {
      items: {
        select: {
          program: {
            include: {
              scholarships: {
                where: { status: "APPROVED" },
                select: { requiredDocuments: true }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!plan) return [];

  await prisma.documentChecklistItem.createMany({
    data: plan.items.flatMap(({ program }) => buildRequiredDocuments(program).map((document) => ({
      userId,
      programId: program.id,
      ...document
    }))),
    skipDuplicates: true
  });

  return prisma.documentChecklistItem.findMany({
    where: { userId, programId: { in: plan.items.map(({ program }) => program.id) } },
    include: checklistInclude,
    orderBy: [{ program: { university: { name: "asc" } } }, { category: "asc" }, { title: "asc" }]
  });
}

export function updateDocumentStatus(userId: string, id: string, status: DocumentStatus) {
  return prisma.documentChecklistItem.update({
    where: { id, userId },
    data: { status },
    include: checklistInclude
  });
}
