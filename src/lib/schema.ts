import { z } from "zod";

// ──────────────────────────────────────────────
// Sub-schemas
// ──────────────────────────────────────────────

export const OverviewSchema = z.object({
  whatItIs: z.string().describe("2-3 sentence description of the tool"),
  primaryUseCases: z.array(z.string()).min(1).describe("Main use cases"),
  platforms: z.array(z.string()).describe("Platforms the tool runs on"),
  pricing: z.string().optional().describe("Pricing summary"),
  targetUsers: z.array(z.string()).optional().describe("Who uses this tool"),
});

export const FeatureSchema = z.object({
  id: z.string().describe("Unique kebab-case ID"),
  name: z.string().describe("Feature name"),
  category: z.string().describe("Feature category grouping"),
  description: z.string().describe("Complete description"),
  whatItsFor: z.string().describe("The problem this feature solves"),
  whenToUse: z.array(z.string()).min(1).describe("Scenarios where useful"),
  howToAccess: z.string().describe("Step-by-step: Click X → Select Y → ..."),
  relatedFeatures: z.array(z.string()).default([]).describe("IDs of related features"),
  keywords: z.array(z.string()).min(1).describe("Search/matching keywords"),
  powerLevel: z.enum(["basic", "intermediate", "advanced"]).describe("User level"),
  sourceIndices: z.array(z.number().int().nonnegative()).default([]).describe("Indices into citations array"),
});

export const ShortcutSchema = z.object({
  id: z.string().describe("Unique kebab-case ID"),
  keys: z.string().describe("Key combination, e.g. Cmd+K / Ctrl+K"),
  action: z.string().describe("What the shortcut does"),
  context: z.string().optional().describe("Where/when it works"),
  platforms: z.array(z.string()).describe("Which platforms"),
  keywords: z.array(z.string()).describe("Search keywords"),
  powerLevel: z.enum(["basic", "intermediate", "advanced"]),
  sourceIndices: z.array(z.number().int().nonnegative()).default([]),
});

export const WorkflowStepSchema = z.object({
  step: z.number().int().positive().describe("Step number"),
  action: z.string().describe("What to do"),
  details: z.string().optional().describe("Additional context"),
  featuresUsed: z.array(z.string()).default([]).describe("Feature IDs used in this step"),
});

export const WorkflowSchema = z.object({
  id: z.string().describe("Unique kebab-case ID"),
  name: z.string().describe("Workflow name"),
  description: z.string().describe("What this workflow accomplishes"),
  steps: z.array(WorkflowStepSchema).min(2).describe("Ordered steps"),
  useCases: z.array(z.string()).min(1).describe("When to use this workflow"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedTime: z.string().describe("How long this takes"),
  sourceIndices: z.array(z.number().int().nonnegative()).default([]),
});

export const TipSchema = z.object({
  id: z.string().describe("Unique kebab-case ID"),
  title: z.string().describe("Tip title"),
  description: z.string().describe("Full tip description"),
  category: z.enum(["productivity", "organization", "collaboration", "automation", "shortcuts"]),
  example: z.string().optional().describe("Concrete example"),
  powerLevel: z.enum(["basic", "intermediate", "advanced"]),
  sourceIndices: z.array(z.number().int().nonnegative()).default([]),
});

export const CommonMistakeSchema = z.object({
  id: z.string().describe("Unique kebab-case ID"),
  mistake: z.string().describe("What users do wrong"),
  whyItHappens: z.string().describe("Why this mistake occurs"),
  correction: z.string().describe("How to fix it"),
  severity: z.enum(["minor", "moderate", "major"]),
  keywords: z.array(z.string()).describe("Related keywords"),
});

export const RecentUpdateSchema = z.object({
  feature: z.string().describe("Feature name"),
  description: z.string().describe("What changed"),
  impact: z.enum(["major", "moderate", "minor"]),
  sourceIndices: z.array(z.number().int().nonnegative()).default([]),
});

// ──────────────────────────────────────────────
// Generation schema (sent to Perplexity Agent API)
// Uses sourceIndices (numbers) not URLs
// ──────────────────────────────────────────────

export const InstructionManualGenerationSchema = z.object({
  schemaVersion: z.literal("4.1"),
  tool: z.string().describe("Exact tool name as commonly known"),
  slug: z.string().describe("URL-safe kebab-case slug"),
  toolScope: z.enum(["enterprise", "standard", "simple"]).describe("Tool complexity level"),
  overview: OverviewSchema,
  features: z.array(FeatureSchema).min(1).describe("All major features"),
  shortcuts: z.array(ShortcutSchema).default([]).describe("Keyboard shortcuts if any"),
  workflows: z.array(WorkflowSchema).min(1).describe("Common workflows"),
  tips: z.array(TipSchema).min(1).describe("Power user tips"),
  commonMistakes: z.array(CommonMistakeSchema).default([]).describe("Beginner mistakes"),
  recentUpdates: z.array(RecentUpdateSchema).default([]).describe("Recent changes"),
});

// ──────────────────────────────────────────────
// Final stored schema (after post-processing)
// ──────────────────────────────────────────────

export const InstructionManualSchema = InstructionManualGenerationSchema.extend({
  generatedAt: z.string().describe("ISO-8601 timestamp"),
  citations: z.array(z.string()).describe("Resolved citation URLs"),
  generationTimeMs: z.number().describe("Time to generate in ms"),
  cost: z.object({
    model: z.number().describe("LLM cost in USD"),
    search: z.number().describe("Web search cost in USD"),
    total: z.number().describe("Total cost in USD"),
  }),
});

// ──────────────────────────────────────────────
// TypeScript types
// ──────────────────────────────────────────────

export type InstructionManualGeneration = z.infer<typeof InstructionManualGenerationSchema>;
export type InstructionManual = z.infer<typeof InstructionManualSchema>;
export type Feature = z.infer<typeof FeatureSchema>;
export type Shortcut = z.infer<typeof ShortcutSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type Tip = z.infer<typeof TipSchema>;
export type CommonMistake = z.infer<typeof CommonMistakeSchema>;
export type RecentUpdate = z.infer<typeof RecentUpdateSchema>;
export type Overview = z.infer<typeof OverviewSchema>;
