import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { db, stats_day, stats_hour, coding_by_language, gte } from "astro:db";
import { EMPTY_TOTALS, safeDbQuery, sumTotals } from "../lib/db";

type IntervalTable = typeof stats_day | typeof stats_hour;

async function fetchIntervalRange(table: IntervalTable, durationInput: string, label: string) {
  const parsedDuration = Number.parseInt(durationInput, 10);
  const durationDays = Number.isFinite(parsedDuration) && parsedDuration > 0 ? parsedDuration : 60;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - durationDays * 24 * 60 * 60;

  const [rowsRes, codingRes] = await Promise.all([
    safeDbQuery(
      () =>
        db
          .select({
            timestamp: table.timestamp,
            keystrokes: table.keystrokes,
            keybinds: table.keybinds,
            mouse_clicks: table.mouse_clicks,
            mouse_distance_mm: table.mouse_distance_mm,
            mouse_scroll_mm: table.mouse_scroll_mm,
            chars_written: table.chars_written,
            active_minutes: table.active_minutes,
            coding_minutes: table.coding_minutes,
          })
          .from(table)
          .where(gte(table.timestamp, startTime))
          .orderBy((t) => t.timestamp),
      label,
    ),
    safeDbQuery(
      () =>
        db
          .select({
            date: coding_by_language.date,
            language: coding_by_language.language,
            seconds: coding_by_language.seconds,
            chars_written: coding_by_language.chars_written,
          })
          .from(coding_by_language)
          .where(gte(coding_by_language.date, startTime))
          .orderBy((t) => t.date),
      `${label}.codingByLanguage`,
    ),
  ]);

  if (!rowsRes.ok || !codingRes.ok) {
    return {
      available: false,
      totals: { ...EMPTY_TOTALS },
      rows: [],
      codingByLanguage: [],
    };
  }

  return {
    available: true,
    totals: sumTotals(rowsRes.data),
    rows: rowsRes.data,
    codingByLanguage: codingRes.data,
  };
}

export const server = {
  fetchDays: defineAction({
    input: z.string(),
    handler: async (input) => {
      const { available, totals, rows, codingByLanguage } = await fetchIntervalRange(
        stats_day,
        input,
        "actions.fetchDays",
      );
      return { available, totals, days: rows, codingByLanguage };
    },
  }),
  fetchHours: defineAction({
    input: z.string(),
    handler: async (input) => {
      const { available, totals, rows, codingByLanguage } = await fetchIntervalRange(
        stats_hour,
        input,
        "actions.fetchHours",
      );
      return { available, totals, hours: rows, codingByLanguage };
    },
  }),
};
