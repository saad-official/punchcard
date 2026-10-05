import { errorResponse, readJson } from "@/app/api/_lib/respond";
import { requireUser } from "@/app/api/_lib/session";
import { getDb } from "@/lib/db/client";
import { pushChanges, pushRequestSchema } from "@/lib/services/sync";

/**
 * Upserts the device's dirty rows (merge rules in lib/sync/contract.ts).
 * Session required. Body: `SyncPushRequest` from @punchcard/shared,
 * answer: `SyncPushResponse` (`{ serverTime, accepted }`).
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const body = await readJson(request, pushRequestSchema);
    return Response.json(await pushChanges(await getDb(), user.id, body));
  } catch (error) {
    return errorResponse(error, "sync push");
  }
}
