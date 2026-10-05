import "server-only";
import { CLIENT_PALETTE, isClientColor, type ClientColor, type ReportClient, type ReportEntry } from "@punchcard/shared";
import { and, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { getDb, type Db } from "@/lib/db/client";
import { clients, devices, entries } from "@/lib/db/schema";
import { optionalEnv } from "@/lib/env";
import {
  computeWeeklySummary,
  isMondayUtc,
  previousWeekWindow,
  summaryMessage,
  type WeekWindow,
} from "@/lib/domain/weekly-summary";

/** Sends one chunk-agnostic batch of messages; tickets come back in message order. */
export type PushSender = (messages: ExpoPushMessage[]) => Promise<ExpoPushTicket[]>;

/** Deep link the summary opens (apps/mobile timesheet tab). */
export const SUMMARY_URL = "punchcard://timesheet";

/** Real sender: Expo Push API, chunked to its 100-message limit. */
export function expoPushSender(): PushSender {
  const accessToken = optionalEnv("EXPO_ACCESS_TOKEN");
  const expo = new Expo(accessToken ? { accessToken } : {});
  return async (messages) => {
    const tickets: ExpoPushTicket[] = [];
    for (const chunk of expo.chunkPushNotifications(messages)) {
      tickets.push(...(await expo.sendPushNotificationsAsync(chunk)));
    }
    return tickets;
  };
}

export type WeeklyResult = { window: WeekWindow; users: number; messages: number; removedDevices: number };
export type DailyResult = { keepAlive: true; weekly: WeeklyResult | null };

/**
 * Daily cron (vercel.json, 06:00 UTC): a trivial query keeps the database
 * warm (Neon free tier suspends idle computes), and on Mondays every device
 * of a user who logged time last week gets the weekly summary push.
 */
export async function runDailyJob(options: { now?: Date; send?: PushSender; db?: Db } = {}): Promise<DailyResult> {
  const now = options.now ?? new Date();
  const db = options.db ?? (await getDb());
  await db.execute(sql`select 1`);
  if (!isMondayUtc(now)) return { keepAlive: true, weekly: null };
  const weekly = await sendWeeklySummaries(db, previousWeekWindow(now), options.send ?? expoPushSender(), now);
  return { keepAlive: true, weekly };
}

export async function sendWeeklySummaries(
  db: Db,
  window: WeekWindow,
  send: PushSender,
  now = new Date(),
): Promise<WeeklyResult> {
  const allDevices = await db
    .select({ userId: devices.userId, token: devices.expoPushToken })
    .from(devices);
  const userIds = [...new Set(allDevices.map((device) => device.userId))];
  const result: WeeklyResult = {
    window,
    users: 0,
    messages: 0,
    removedDevices: 0,
  };
  if (userIds.length === 0) return result;

  const [entryRows, clientRows] = await Promise.all([
    db
      .select({
        userId: entries.userId,
        id: entries.id,
        clientId: entries.clientId,
        startedAt: entries.startedAt,
        endedAt: entries.endedAt,
        breakSeconds: entries.breakSeconds,
        breakStartedAt: entries.breakStartedAt,
      })
      .from(entries)
      .where(
        and(
          inArray(entries.userId, userIds),
          isNull(entries.deletedAt),
          gte(entries.startedAt, new Date(window.start)),
          lt(entries.startedAt, new Date(window.end)),
        ),
      ),
    db
      .select({
        userId: clients.userId,
        id: clients.id,
        name: clients.name,
        color: clients.color,
        hourlyRateCents: clients.hourlyRateCents,
        currency: clients.currency,
      })
      .from(clients)
      .where(inArray(clients.userId, userIds)),
  ]);

  const toReportEntry = (row: (typeof entryRows)[number]): ReportEntry => ({
    id: row.id,
    clientId: row.clientId,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    breakSeconds: row.breakSeconds,
    breakStartedAt: row.breakStartedAt?.toISOString() ?? null,
  });
  const toReportClient = (row: (typeof clientRows)[number]): ReportClient => ({
    id: row.id,
    name: row.name,
    color: (isClientColor(row.color) ? row.color : CLIENT_PALETTE[0].name) as ClientColor,
    hourlyRateCents: row.hourlyRateCents,
    currency: row.currency,
  });

  const messages: ExpoPushMessage[] = [];
  for (const userId of userIds) {
    const summary = computeWeeklySummary(
      entryRows.filter((row) => row.userId === userId).map(toReportEntry),
      clientRows.filter((row) => row.userId === userId).map(toReportClient),
      window,
      now,
    );
    if (summary.totalSeconds < 60) continue;
    result.users += 1;
    const { title, body } = summaryMessage(summary);
    for (const device of allDevices.filter((d) => d.userId === userId)) {
      messages.push({ to: device.token, title, body, sound: "default", data: { url: SUMMARY_URL, kind: "weekly_summary" } });
    }
  }
  if (messages.length === 0) return result;

  const tickets = await send(messages);
  result.messages = messages.length;
  const gone = tickets.flatMap((ticket, index) =>
    ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ? [messages[index]!.to as string] : [],
  );
  if (gone.length > 0) {
    const removed = await db
      .delete(devices)
      .where(inArray(devices.expoPushToken, gone))
      .returning({ id: devices.id });
    result.removedDevices = removed.length;
  }
  return result;
}
