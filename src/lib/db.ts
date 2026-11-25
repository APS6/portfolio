export interface StatsTotals {
  keystrokes: number;
  keybinds: number;
  mouse_clicks: number;
  mouse_distance_mm: number;
  mouse_scroll_mm: number;
  chars_written: number;
  active_minutes: number;
  coding_minutes: number;
}

export const EMPTY_TOTALS: StatsTotals = {
  keystrokes: 0,
  keybinds: 0,
  mouse_clicks: 0,
  mouse_distance_mm: 0,
  mouse_scroll_mm: 0,
  chars_written: 0,
  active_minutes: 0,
  coding_minutes: 0,
};

export interface ActivityRow {
  keystrokes: number | null;
  keybinds: number | null;
  mouse_clicks: number | null;
  mouse_distance_mm: number | null;
  mouse_scroll_mm: number | null;
  chars_written: number | null;
  active_minutes: number | null;
  coding_minutes: number | null;
}

/** Aggregate per-interval activity rows into summary totals. */
export function sumTotals(rows: ActivityRow[]): StatsTotals {
  return rows.reduce<StatsTotals>(
    (acc, row) => ({
      keystrokes: acc.keystrokes + (row.keystrokes ?? 0),
      keybinds: acc.keybinds + (row.keybinds ?? 0),
      mouse_clicks: acc.mouse_clicks + (row.mouse_clicks ?? 0),
      mouse_distance_mm: acc.mouse_distance_mm + (row.mouse_distance_mm ?? 0),
      mouse_scroll_mm: acc.mouse_scroll_mm + (row.mouse_scroll_mm ?? 0),
      chars_written: acc.chars_written + (row.chars_written ?? 0),
      active_minutes: acc.active_minutes + (row.active_minutes ?? 0),
      coding_minutes: acc.coding_minutes + (row.coding_minutes ?? 0),
    }),
    { ...EMPTY_TOTALS },
  );
}

export type QueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: unknown };

/**
 * Execute a database query without throwing on connection, quota, or timeout errors.
 * Ensures SSR pages and actions degrade gracefully when Turso is unavailable.
 */
export async function safeDbQuery<T>(
  queryFn: () => Promise<T>,
  label: string,
  timeoutMs = 5000,
): Promise<QueryResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Database query "${label}" timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    const data = await Promise.race([queryFn(), timeoutPromise]);
    return { ok: true, data };
  } catch (error) {
    console.error(`[db] ${label} failed:`, error);
    return { ok: false, error };
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
