"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatDate } from "@/lib/format";

type Point = { day: string; value: number };

type TrendChartProps = {
  title: string;
  description?: string;
  valueLabel: string;
  points: Point[];
  kind?: "line" | "bar";
};

const HEIGHT = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 40 };
const BRAND = "#74342b";
const GRID = "#e6ddd4";
const SURFACE = "#f9f9f9";
const number = new Intl.NumberFormat("id-ID");

/** Batas atas sumbu y: 4 jarak tick yang rapi (mis. 0·30·60·90·120) dan selalu bilangan bulat. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const rough = value / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].filter((candidate) =>
    Number.isInteger(candidate * magnitude),
  );
  const step = steps.find((candidate) => candidate * magnitude >= rough) ?? 10;
  return step * magnitude * 4;
}

/**
 * Grafik tren harian satu seri (garis + area tipis, atau batang).
 * Crosshair mengikuti pointer dan panah kiri/kanan; angka yang sama ada di tampilan tabel.
 */
export function TrendChart({
  title,
  description,
  valueLabel,
  points,
  kind = "line",
}: TrendChartProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (!wrap.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(280, entry.contentRect.width)),
    );
    observer.observe(wrap.current);
    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const step = points.length > 1 ? innerW / (points.length - (kind === "bar" ? 0 : 1)) : innerW;
  const xOf = (index: number) =>
    PAD.left +
    (kind === "bar" ? step * index + step / 2 : points.length > 1 ? step * index : innerW / 2);
  const yOf = (value: number) => PAD.top + innerH - (value / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => Math.round(max * fraction));
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.floor(innerW / 64)));

  const line = points
    .map((point, index) => `${index ? "L" : "M"}${xOf(index)},${yOf(point.value)}`)
    .join("");
  const area = points.length
    ? `${line}L${xOf(points.length - 1)},${yOf(0)}L${xOf(0)},${yOf(0)}Z`
    : "";
  const barWidth = Math.min(24, Math.max(2, step - 2));

  function indexFromPointer(event: PointerEvent<SVGSVGElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * width;
    let nearest = 0;
    points.forEach((_, index) => {
      if (Math.abs(xOf(index) - x) < Math.abs(xOf(nearest) - x)) nearest = index;
    });
    setActive(nearest);
  }

  function handleKey(event: KeyboardEvent<SVGSVGElement>) {
    if (!points.length) return;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      setActive((current) =>
        Math.min(
          points.length - 1,
          Math.max(0, (current ?? (delta > 0 ? -1 : points.length)) + delta),
        ),
      );
    }
  }

  const activePoint = active !== null ? points[active] : null;
  const tooltipLeft = active !== null ? Math.min(Math.max(xOf(active), 70), width - 70) : 0;

  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="text-base">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink/70">{description}</p>}

      <div ref={wrap} className="relative mt-4">
        <svg
          width="100%"
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label={`${title}. Gunakan panah kiri dan kanan untuk membaca nilai per hari.`}
          tabIndex={0}
          onPointerMove={indexFromPointer}
          onPointerLeave={() => setActive(null)}
          onKeyDown={handleKey}
          onBlur={() => setActive(null)}
          className="touch-pan-y overflow-visible rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yOf(tick)}
                y2={yOf(tick)}
                stroke={GRID}
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={yOf(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink/60 text-[11px] tabular-nums"
              >
                {number.format(tick)}
              </text>
            </g>
          ))}

          {points.map((point, index) =>
            index % labelEvery === 0 || index === points.length - 1 ? (
              <text
                key={point.day}
                x={xOf(index)}
                y={HEIGHT - 8}
                textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
                className="fill-ink/60 text-[11px]"
              >
                {formatDate(point.day).replace(/ \d{4}$/, "")}
              </text>
            ) : null,
          )}

          {kind === "line" ? (
            <>
              <path d={area} fill={BRAND} fillOpacity={0.1} />
              <path
                d={line}
                fill="none"
                stroke={BRAND}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {points.length > 0 && (
                <circle
                  cx={xOf(points.length - 1)}
                  cy={yOf(points[points.length - 1].value)}
                  r={4}
                  fill={BRAND}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              )}
            </>
          ) : (
            points.map((point, index) => {
              const x = xOf(index) - barWidth / 2;
              const y = yOf(point.value);
              const h = yOf(0) - y;
              const r = Math.min(4, h, barWidth / 2);
              return h > 0 ? (
                <path
                  key={point.day}
                  d={`M${x},${yOf(0)}V${y + r}Q${x},${y} ${x + r},${y}H${x + barWidth - r}Q${x + barWidth},${y} ${x + barWidth},${y + r}V${yOf(0)}Z`}
                  fill={BRAND}
                  opacity={active === null || active === index ? 1 : 0.55}
                />
              ) : null;
            })
          )}

          {activePoint && active !== null && (
            <>
              <line
                x1={xOf(active)}
                x2={xOf(active)}
                y1={PAD.top}
                y2={yOf(0)}
                stroke="#2b1a17"
                strokeOpacity={0.35}
                strokeWidth={1}
              />
              {kind === "line" && (
                <circle
                  cx={xOf(active)}
                  cy={yOf(activePoint.value)}
                  r={4}
                  fill={BRAND}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              )}
            </>
          )}
        </svg>

        {activePoint && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-line bg-paper px-3 py-2 text-sm shadow-lift"
            style={{ left: tooltipLeft }}
          >
            <p className="font-heading text-base font-bold text-ink tabular-nums">
              {number.format(activePoint.value)}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-ink/70">
              <span aria-hidden className="inline-block h-0.5 w-3 rounded bg-brand" />
              {valueLabel} · {formatDate(activePoint.day)}
            </p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-ink/75 hover:text-ink">Lihat sebagai tabel</summary>
        <div className="mt-2 max-h-56 overflow-y-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-ink/70">
                <th className="py-1 font-medium">Tanggal</th>
                <th className="py-1 text-right font-medium">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.day} className="border-t border-line">
                  <td className="py-1">{formatDate(point.day)}</td>
                  <td className="py-1 text-right tabular-nums">{number.format(point.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
