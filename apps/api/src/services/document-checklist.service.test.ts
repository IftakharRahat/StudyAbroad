import assert from "node:assert/strict";
import { buildRequiredDocuments } from "./document-checklist.service.js";

const documents = buildRequiredDocuments({
  researchPreferred: true,
  workExperiencePreferred: false,
  scholarships: [{ requiredDocuments: ["Passport", "Scholarship essay"] }]
});

assert.equal(documents.filter(({ title }) => title === "Passport").length, 1);
assert(documents.some(({ title, category }) => title === "Research proposal" && category === "ACADEMIC"));
assert(documents.some(({ title, category }) => title === "Scholarship essay" && category === "SCHOLARSHIP"));
