"use client";

export type DonutSlice = { key: string; label: string; amountKrw: number; color: string };

const SIZE = 96;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** A small ring chart with a colored legend — a quick shape-of-spending
 * glance to sit beside a full ranked breakdown list. */
export function DonutChart({ slices, totalKrw, ariaLabel }: { slices: DonutSlice[]; totalKrw: number; ariaLabel: string }) {
  if (totalKrw <= 0) return null;

  const arcs = slices.reduce<{ offset: number; length: number; slice: DonutSlice }[]>((acc, slice) => {
    const previousEnd = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    const length = (slice.amountKrw / totalKrw) * CIRCUMFERENCE;
    return [...acc, { offset: previousEnd, length, slice }];
  }, []);

  return (
    <div className="flex items-center gap-4">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="shrink-0" role="img" aria-label={ariaLabel}>
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--secondary)" strokeWidth={STROKE} />
          {arcs.map(({ offset, length, slice }) => (
            <circle
              key={slice.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset}
            >
              <title>
                {slice.label} · {((slice.amountKrw / totalKrw) * 100).toFixed(0)}%
              </title>
            </circle>
          ))}
        </g>
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{slice.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{((slice.amountKrw / totalKrw) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
