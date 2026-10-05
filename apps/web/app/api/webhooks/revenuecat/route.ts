import { errorResponse, readJson, unauthorized } from "@/app/api/_lib/respond";
import { isAuthorizedRevenueCat } from "@/app/api/_lib/secrets";
import { getDb } from "@/lib/db/client";
import { recordRevenueCatEvent, revenueCatBodySchema } from "@/lib/services/entitlements";

/**
 * RevenueCat webhook. `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
 * Idempotent by event id: a redelivery answers 200 with `duplicate: true`
 * and changes nothing. 200 tells RevenueCat to stop retrying, so only auth
 * and malformed bodies are errors.
 */
export async function POST(request: Request) {
  if (!isAuthorizedRevenueCat(request)) return unauthorized();
  try {
    const body = await readJson(request, revenueCatBodySchema);
    const outcome = await recordRevenueCatEvent(await getDb(), body);
    return Response.json({ ok: true, ...outcome });
  } catch (error) {
    return errorResponse(error, "revenuecat webhook");
  }
}
