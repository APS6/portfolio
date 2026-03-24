import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { db, stats_day, stats_hour, coding_by_language, gte } from "astro:db";

export const server = {
  fetchDays: defineAction({
    input: z.string(),
    handler: async (input) => {
      const duration = parseInt(input);
      const now = Math.floor(Date.now() / 1000);

      const startTime = now - duration * 24 * 60 * 60;

      const daysPromise = db
        .select({
          timestamp: stats_day.timestamp,
          keystrokes: stats_day.keystrokes,
          keybinds: stats_day.keybinds,
          mouse_clicks: stats_day.mouse_clicks,
          mouse_distance_mm: stats_day.mouse_distance_mm,
          mouse_scroll_mm: stats_day.mouse_scroll_mm,
          chars_written: stats_day.chars_written,
          active_minutes: stats_day.active_minutes,
          coding_minutes: stats_day.coding_minutes,
        })
        .from(stats_day)
        .where(gte(stats_day.timestamp, startTime))
        .orderBy((table) => table.timestamp);

      const codingByLanguagePromise = db
        .select({
          date: coding_by_language.date,
          language: coding_by_language.language,
          seconds: coding_by_language.seconds,
          chars_written: coding_by_language.chars_written,
        })
        .from(coding_by_language)
        .where(gte(coding_by_language.date, startTime))
        .orderBy((table) => table.date);

      const [days, codingByLanguage] = await Promise.all([
        daysPromise,
        codingByLanguagePromise,
      ]);

      const totals = days.reduce(
        (acc, day) => ({
          keystrokes: acc.keystrokes + (day.keystrokes ?? 0),
          keybinds: acc.keybinds + (day.keybinds ?? 0),
          mouse_clicks: acc.mouse_clicks + (day.mouse_clicks ?? 0),
          mouse_distance_mm:
            acc.mouse_distance_mm + (day.mouse_distance_mm ?? 0),
          mouse_scroll_mm: acc.mouse_scroll_mm + (day.mouse_scroll_mm ?? 0),
          chars_written: acc.chars_written + (day.chars_written ?? 0),
          active_minutes: acc.active_minutes + (day.active_minutes ?? 0),
          coding_minutes: acc.coding_minutes + (day.coding_minutes ?? 0),
        }),
        {
          keystrokes: 0,
          keybinds: 0,
          mouse_clicks: 0,
          mouse_distance_mm: 0,
          mouse_scroll_mm: 0,
          chars_written: 0,
          active_minutes: 0,
          coding_minutes: 0,
        },
      );

      return { totals, days, codingByLanguage };
    },
  }),
  fetchHours: defineAction({
    input: z.string(),
    handler: async (input) => {
      const duration = parseInt(input);
      const now = Math.floor(Date.now() / 1000);

      const startTime = now - duration * 24 * 60 * 60;

      const hoursPromise = db
        .select({
          timestamp: stats_hour.timestamp,
          keystrokes: stats_hour.keystrokes,
          keybinds: stats_hour.keybinds,
          mouse_clicks: stats_hour.mouse_clicks,
          mouse_distance_mm: stats_hour.mouse_distance_mm,
          mouse_scroll_mm: stats_hour.mouse_scroll_mm,
          chars_written: stats_hour.chars_written,
          active_minutes: stats_hour.active_minutes,
          coding_minutes: stats_hour.coding_minutes,
        })
        .from(stats_hour)
        .where(gte(stats_hour.timestamp, startTime))
        .orderBy((table) => table.timestamp);

      const codingByLanguagePromise = db
        .select({
          date: coding_by_language.date,
          language: coding_by_language.language,
          seconds: coding_by_language.seconds,
          chars_written: coding_by_language.chars_written,
        })
        .from(coding_by_language)
        .where(gte(coding_by_language.date, startTime))
        .orderBy((table) => table.date);

      const [hours, codingByLanguage] = await Promise.all([
        hoursPromise,
        codingByLanguagePromise,
      ]);

      const totals = hours.reduce(
        (acc, day) => ({
          keystrokes: acc.keystrokes + (day.keystrokes ?? 0),
          keybinds: acc.keybinds + (day.keybinds ?? 0),
          mouse_clicks: acc.mouse_clicks + (day.mouse_clicks ?? 0),
          mouse_distance_mm:
            acc.mouse_distance_mm + (day.mouse_distance_mm ?? 0),
          mouse_scroll_mm: acc.mouse_scroll_mm + (day.mouse_scroll_mm ?? 0),
          chars_written: acc.chars_written + (day.chars_written ?? 0),
          active_minutes: acc.active_minutes + (day.active_minutes ?? 0),
          coding_minutes: acc.coding_minutes + (day.coding_minutes ?? 0),
        }),
        {
          keystrokes: 0,
          keybinds: 0,
          mouse_clicks: 0,
          mouse_distance_mm: 0,
          mouse_scroll_mm: 0,
          chars_written: 0,
          active_minutes: 0,
          coding_minutes: 0,
        },
      );

      return { totals, hours, codingByLanguage };
    },
  }),
};
