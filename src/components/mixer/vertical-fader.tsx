import { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface VerticalFaderProps {
  value: number; // 0..100
  onChange: (value: number) => void;
  disabled?: boolean;
  accent?: "level" | "master";
  ariaLabel: string;
}

/**
 * Custom vertical fader. Pointer-driven (mouse + touch), keyboard accessible.
 * Purely controlled — the parent owns the value.
 */
export function VerticalFader({
  value,
  onChange,
  disabled = false,
  accent = "level",
  ariaLabel,
}: VerticalFaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const clamp = (v: number) => Math.min(100, Math.max(0, v));

  const updateFromClientY = useCallback(
    (clientY: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = 1 - (clientY - rect.top) / rect.height;
      onChange(clamp(Math.round(ratio * 1000) / 10));
    },
    [onChange],
  );

  useEffect(() => {
    if (disabled) return;
    const move = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      updateFromClientY(e.clientY);
    };
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [disabled, updateFromClientY]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onChange(clamp(value + step));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onChange(clamp(value - step));
    }
  };

  const accentVar = accent === "master" ? "var(--master)" : "var(--level)";

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-disabled={disabled}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        if (disabled) return;
        draggingRef.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        updateFromClientY(e.clientY);
      }}
      className={cn(
        "relative h-36 w-10 shrink-0 cursor-ns-resize touch-none select-none rounded-full outline-none sm:h-44 lg:h-52",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {/* track well */}
      <div className="absolute inset-x-[13px] inset-y-1 rounded-full bg-background/80 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)]" />

      {/* tick marks */}
      <div className="pointer-events-none absolute inset-y-1 left-[3px] flex w-1.5 flex-col justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className="h-px w-full bg-border" />
        ))}
      </div>

      {/* filled level */}
      <div
        className="absolute inset-x-[13px] bottom-1 rounded-full transition-[height] duration-100 ease-out"
        style={{
          height: `calc(${value}% - ${(value / 100) * 8}px)`,
          background: `linear-gradient(to top, color-mix(in oklab, ${accentVar} 45%, transparent), ${accentVar})`,
          boxShadow: `0 0 12px color-mix(in oklab, ${accentVar} 55%, transparent)`,
        }}
      />

      {/* thumb */}
      <div
        className="pointer-events-none absolute left-1/2 flex h-7 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-surface-raised transition-[top] duration-100 ease-out"
        style={{
          top: `calc(${100 - value}% * 0.88 + 6%)`,
          boxShadow: `0 4px 12px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in oklab, ${accentVar} 25%, transparent)`,
        }}
      >
        <span
          className="h-[2px] w-6 rounded-full"
          style={{ backgroundColor: accentVar }}
        />
      </div>
    </div>
  );
}
