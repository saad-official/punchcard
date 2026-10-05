import { unauthorized } from "@/app/api/_lib/respond";
import { isAuthorizedCron } from "@/app/api/_lib/secrets";
import { runDailyJob } from "@/lib/services/daily";

/**
 * Daily job (vercel.json: 06:00 UTC). `Authorization: Bearer <CRON_SECRET>`.
 * Keeps the database warm; on Mondays sends the weekly summary push.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return unauthorized();
  try {
    const result = await runDailyJob();
    if (result.weekly) {
      console.info(`[cron] weekly summary: ${result.weekly.users} users, ${result.weekly.messages} pushes`);
    }
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron] daily failed", error instanceof Error ? error.message : error);
    return Response.json({ ok: false, error: "daily job failed" }, { status: 500 });
  }
}
