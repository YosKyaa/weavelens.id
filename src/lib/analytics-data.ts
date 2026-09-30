import "server-only";
import { todayJakarta } from "@/lib/format";
import type { SessionClient } from "@/lib/supabase/server";

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

export function parseRange(value: string | undefined): RangeDays {
  const number = Number(value);
  return (RANGES as readonly number[]).includes(number) ? (number as RangeDays) : 30;
}

function jakartaMidnight(day: string): Date {
  return new Date(`${day}T00:00:00+07:00`);
}

function shiftDay(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** N hari terakhir termasuk hari ini (zona Jakarta), plus periode sebelumnya untuk perbandingan. */
export function rangeWindow(days: RangeDays) {
  const today = todayJakarta();
  const from = jakartaMidnight(shiftDay(today, -(days - 1)));
  const to = jakartaMidnight(shiftDay(today, 1));
  const previousFrom = jakartaMidnight(shiftDay(today, -(2 * days - 1)));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    previousFrom: previousFrom.toISOString(),
  };
}

export type Overview = {
  visitors: number;
  pageviews: number;
  ctaClicks: number;
  ctaVisitors: number;
};

export type DailyPoint = { day: string; visitors: number; pageviews: number; ctaClicks: number };
export type BreakdownRow = {
  label: string;
  visitors: number;
  pageviews: number;
  ctaClicks: number;
};

const EMPTY: Overview = { visitors: 0, pageviews: 0, ctaClicks: 0, ctaVisitors: 0 };

function toOverview(
  row:
    { visitors: number; pageviews: number; cta_clicks: number; cta_visitors: number } | undefined,
): Overview {
  if (!row) return EMPTY;
  return {
    visitors: Number(row.visitors),
    pageviews: Number(row.pageviews),
    ctaClicks: Number(row.cta_clicks),
    ctaVisitors: Number(row.cta_visitors),
  };
}

function toBreakdown(
  rows: { label: string; visitors: number; pageviews: number; cta_clicks: number }[] | null,
): BreakdownRow[] {
  return (rows ?? []).map((row) => ({
    label: row.label,
    visitors: Number(row.visitors),
    pageviews: Number(row.pageviews),
    ctaClicks: Number(row.cta_clicks),
  }));
}

/** Semua angka dashboard analitik dalam satu putaran query paralel. */
export async function loadAnalytics(supabase: SessionClient, days: RangeDays) {
  const { from, to, previousFrom } = rangeWindow(days);
  const breakdown = (dimension: string, limit = 8) =>
    supabase.rpc("analytics_breakdown", {
      p_from: from,
      p_to: to,
      p_dimension: dimension,
      p_limit: limit,
    });

  const [current, previous, daily, sources, pages, devices, cities, sections, admins] =
    await Promise.all([
      supabase.rpc("analytics_overview", { p_from: from, p_to: to }),
      supabase.rpc("analytics_overview", { p_from: previousFrom, p_to: from }),
      supabase.rpc("analytics_daily", { p_from: from, p_to: to }),
      breakdown("source"),
      breakdown("path"),
      breakdown("device", 3),
      breakdown("city"),
      breakdown("section"),
      breakdown("admin", 4),
    ]);

  const failed = [current, daily].some((result) => result.error);

  return {
    failed,
    current: toOverview(current.data?.[0]),
    previous: toOverview(previous.data?.[0]),
    daily: (daily.data ?? []).map((row) => ({
      day: row.day,
      visitors: Number(row.visitors),
      pageviews: Number(row.pageviews),
      ctaClicks: Number(row.cta_clicks),
    })),
    sources: toBreakdown(sources.data),
    pages: toBreakdown(pages.data),
    devices: toBreakdown(devices.data),
    cities: toBreakdown(cities.data),
    sections: toBreakdown(sections.data),
    admins: toBreakdown(admins.data),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof loadAnalytics>>;
