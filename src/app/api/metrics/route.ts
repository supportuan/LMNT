import { z } from "zod";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { ALL_METRIC_IDS, getMetric, getMetricsBundle, type MetricId } from "@/lib/metrics";
import { PERMISSIONS } from "@/lib/permissions";

const querySchema = z.object({
  ids: z.string().optional(),
});

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.ANALYTICS_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.parse({ ids: searchParams.get("ids") ?? undefined });

  const requested = parsed.ids
    ? parsed.ids.split(",").filter(Boolean)
    : ALL_METRIC_IDS;

  const invalid = requested.filter((id) => !ALL_METRIC_IDS.includes(id as MetricId));
  if (invalid.length > 0) {
    return apiError(`Unknown metric ids: ${invalid.join(", ")}`, 400);
  }

  const ids = requested as MetricId[];

  if (ids.length === 1) {
    const metric = await getMetric(session, ids[0]);
    return apiOk({ metric });
  }

  const metrics = await getMetricsBundle(session, ids);
  return apiOk({ metrics });
}
