import { defineDb, defineTable, column } from "astro:db";

const current_status = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    last_activity_at: column.number({ default: 0 }),
    last_coding_at: column.number({ default: 0 }),
  },
});

const stats_hour = defineTable({
  columns: {
    timestamp: column.number({ primaryKey: true }),
    keystrokes: column.number({ default: 0 }),
    keybinds: column.number({ default: 0 }),
    mouse_clicks: column.number({ default: 0 }),
    mouse_distance_mm: column.number({ default: 0 }),
    mouse_scroll_mm: column.number({ default: 0 }),
    chars_written: column.number({ default: 0 }),
    active_minutes: column.number({ default: 0 }),
    coding_minutes: column.number({ default: 0 }),
  },
});

const stats_day = defineTable({
  columns: {
    timestamp: column.number({ primaryKey: true }),
    keystrokes: column.number({ default: 0 }),
    keybinds: column.number({ default: 0 }),
    mouse_clicks: column.number({ default: 0 }),
    mouse_distance_mm: column.number({ default: 0 }),
    mouse_scroll_mm: column.number({ default: 0 }),
    chars_written: column.number({ default: 0 }),
    git_commits: column.number({ default: 0 }),
    git_lines_added: column.number({ default: 0 }),
    git_lines_removed: column.number({ default: 0 }),
    active_minutes: column.number({ default: 0 }),
    coding_minutes: column.number({ default: 0 }),
  },
});

const coding_by_language = defineTable({
  columns: {
    date: column.number(),
    language: column.text(),
    seconds: column.number({ default: 0 }),
    chars_written: column.number({ default: 0 }),
  },
  indexes: [{ on: ["date", "language"], unique: true }],
});

// https://astro.build/db/config
export default defineDb({
  tables: {
    current_status,
    stats_hour,
    stats_day,
    coding_by_language,
  },
});
