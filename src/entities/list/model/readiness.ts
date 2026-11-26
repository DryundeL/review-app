export type ReadinessInput = {
  title: string;
  tiers: { name: string }[];
  items: { title?: string; hasImage: boolean }[];
};

export type PublishIssue = { field: string; index?: number };

const blank = (s: string | undefined) => !s || s.trim() === "";

export function templatePublishIssues(t: ReadinessInput): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (blank(t.title)) issues.push({ field: "title" });
  if (t.items.length === 0) issues.push({ field: "items" });
  t.items.forEach((item, index) => {
    if (blank(item.title)) issues.push({ field: "items.title", index });
    if (!item.hasImage) issues.push({ field: "items.image", index });
  });
  t.tiers.forEach((tier, index) => {
    if (blank(tier.name)) issues.push({ field: "tiers.name", index });
  });
  return issues;
}

export function resultPublishIssues(title: string, entries: unknown[]): { field: string }[] {
  const issues: { field: string }[] = [];
  if (blank(title)) issues.push({ field: "title" });
  if (entries.length === 0) issues.push({ field: "entries" });
  return issues;
}
