import { errorResponse } from "@/app/api/_lib/respond";
import { requireUser } from "@/app/api/_lib/session";
import { getDb } from "@/lib/db/client";
import { getPlanState } from "@/lib/services/entitlements";

/** The signed-in user's effective plan: `{ plan: "free" | "pro", expiresAt, source }`. */
export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return Response.json(await getPlanState(await getDb(), user.id));
  } catch (error) {
    return errorResponse(error, "me/plan");
  }
}
