import { Hono } from "hono";
import type { Env, Variables } from "../types/env.d.ts";
import { authMiddleware } from "../middleware/auth";
import { createSupabaseClientWithAuth } from "../lib/supabase";
import { requireHouseholdId } from "../lib/household";

const exportRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();
exportRoutes.use("*", authMiddleware);

// GET /api/export — Export observations as JSON or Markdown
exportRoutes.get("/api/export", async (c) => {
  const supabase = createSupabaseClientWithAuth(c.env, c.get("accessToken"));

  let householdId: string;
  try {
    householdId = await requireHouseholdId(c);
  } catch {
    return c.json({ detail: "You must belong to a household" }, 400);
  }

  const format = c.req.query("format") || "json";
  const entityId = c.req.query("entity_id");
  const category = c.req.query("category");
  const fromDate = c.req.query("from");
  const toDate = c.req.query("to");

  let query = supabase
    .from("observations")
    .select("*, entity:entities(id, name, type, properties)")
    .eq("household_id", householdId);

  if (entityId) query = query.eq("entity_id", entityId);
  if (category) query = query.eq("category", category);
  if (fromDate) query = query.gte("observed_at", fromDate);
  if (toDate) query = query.lte("observed_at", toDate);

  const { data, error } = await query.order("observed_at", { ascending: true });

  if (error) {
    return c.json({ detail: `Error exporting: ${error.message}` }, 500);
  }

  if (format === "markdown") {
    const md = generateMarkdownExport(data || []);
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown",
        "Content-Disposition": 'attachment; filename="export.md"',
      },
    });
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="export.json"',
    },
  });
});

function generateMarkdownExport(observations: Array<Record<string, unknown>>): string {
  if (!observations.length) return "# No observations found\n";

  const entity = observations[0]?.entity as Record<string, string> | undefined;
  const entityName = entity?.name || "All Entities";
  const entityType = entity?.type || "";

  let md = `# Observations${entityType ? ` for ${entityName} (${entityType})` : ""}\n\n`;
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Total observations: ${observations.length}\n\n---\n\n`;

  for (const obs of observations) {
    const obsEntity = obs.entity as Record<string, string> | undefined;
    md += `## ${obs.observed_at} — ${obsEntity?.name || "Unknown"}\n\n`;
    md += `**Category:** ${obs.category}`;
    if (obs.subcategory) md += ` / ${obs.subcategory}`;
    md += "\n\n";

    if (obs.data && Object.keys(obs.data as object).length > 0) {
      md += "**Data:**\n```json\n";
      md += JSON.stringify(obs.data, null, 2);
      md += "\n```\n\n";
    }

    if (obs.notes) md += `**Notes:** ${obs.notes}\n\n`;

    const tags = obs.tags as string[] | undefined;
    if (tags?.length) md += `**Tags:** ${tags.join(", ")}\n\n`;

    md += "---\n\n";
  }

  return md;
}

export default exportRoutes;
