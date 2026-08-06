import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { formatPan } from "@/lib/mixer-types";

interface PanKnobProps {
  value: number; // -50..50
  onChange: (value: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}

const MIN = -50;
const MAX = 50;
const SWEEP = 270; // degrees

/** Rotary PAN knob. Vertical drag changes the value; double click recenters. */
export function PanKnob({
  value,
  onChange,
  disabled = false,
  ariaLabel,
}: PanKnobProps) {
  const dragRef = useRef<{ y: number; start: number } | null>(null);

  const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      e.preventDefault();
      const delta = (drag.y - e.clientY) * 0.6;
      onChange(clamp(Math.round(drag.start + delta)));
    },
    [onChange],
  );

  useEffect(() => {
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [onPointerMove]);

  const ratio = (value - MIN) / (MAX - MIN);
  const angle = -SWEEP / 2 + ratio * SWEEP;
  const arcFrom = 50;
  const arcTo = ratio * 100;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-valuemin={MIN}
        aria-valuemax={MAX}
        aria-valuenow={Math.round(value)}
        aria-valuetext={formatPan(value)}
        onDoubleClick={() => !disabled && onChange(0)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") {
            e.preventDefault();
            onChange(clamp(value + 2));
          } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
            e.preventDefault();
            onChange(clamp(value - 2));
          }
        }}
        onPointerDown={(e) => {
          if (disabled) return;
          dragRef.current = { y: e.clientY, start: value };
        }}
        className={cn(
          "relative h-11 w-11 cursor-ns-resize touch-none select-none rounded-full outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          disabled && "cursor-not-allowed opacity-40",
        )}
      >
        {/* arc indicator */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from ${180 + (360 - SWEEP) / 2}deg, color-mix(in oklab, var(--pan) 12%, transparent) 0deg, color-mix(in oklab, var(--pan) 12%, transparent) ${SWEEP}deg, transparent ${SWEEP}deg)`,
          }}
        />
        <div
          className="absolute inset-0 rounded-full transition-[background] duration-100"
          style={{
            background: `conic-gradient(from ${180 + (360 - SWEEP) / 2}deg, transparent ${(Math.min(arcFrom, arcTo) / 100) * SWEEP}deg, var(--pan) ${(Math.min(arcFrom, arcTo) / 100) * SWEEP}deg, var(--pan) ${(Math.max(arcFrom, arcTo) / 100) * SWEEP}deg, transparent ${(Math.max(arcFrom, arcTo) / 100) * SWEEP}deg)`,
            filter: "drop-shadow(0 0 5px color-mix(in oklab, var(--pan) 60%, transparent))",
          }}
        />
        {/* body */}
        <div className="absolute inset-[5px] rounded-full border border-border bg-gradient-to-b from-surface-raised to-surface shadow-[0_3px_8px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)]" />
        {/* pointer line */}
        <div
          className="absolute inset-[5px] transition-transform duration-100 ease-out"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <span className="absolute left-1/2 top-[3px] h-[9px] w-[2px] -translate-x-1/2 rounded-full bg-pan" />
        </div>
      </div>
      <span className="font-mono text-[10px] tabular-nums text-pan">
        {formatPan(value)}
      </span>
    </div>
  );
}
