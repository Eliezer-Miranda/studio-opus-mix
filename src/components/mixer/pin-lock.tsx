import { useState } from "react";
import { Delete, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MixerBus } from "@/lib/mixer-types";

interface PinLockProps {
  bus: MixerBus;
  /** All mixes, rendered as a picker so the musician selects who they are. */
  buses?: MixerBus[];
  onSelectBus?: (id: string) => void;
  /**
   * Validates the typed PIN. Mocked locally today — replace with
   * `socket.emit("session:auth", { busId, pin }, cb)` (server-side check).
   */
  onSubmit: (pin: string) => Promise<boolean> | boolean;
  onCancel?: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "del"];
const PIN_LENGTH = 4;

export function PinLock({
  bus,
  buses,
  onSelectBus,
  onSubmit,
  onCancel,
}: PinLockProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const press = async (key: string) => {
    if (checking) return;
    setError(false);
    if (key === "del") return setPin((p) => p.slice(0, -1));
    if (key === "clear") return setPin("");
    if (pin.length >= PIN_LENGTH) return;

    const next = pin + key;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setChecking(true);
      const ok = await onSubmit(next);
      setChecking(false);
      if (!ok) {
        setError(true);
        setPin("");
      }
    }
  };

  return (
    <div className="console-grid-bg flex min-h-screen items-center justify-center bg-background p-4">
      <div className="glass-panel w-full max-w-sm rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-surface text-level">
            <Lock className="h-5 w-5" />
          </span>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Acesso restrito
          </p>
          <h1 className="font-mono text-lg font-bold uppercase tracking-tight">
            Mix — {bus.name}
          </h1>
          <p className="font-mono text-[11px] text-muted-foreground">
            Digite o PIN do músico para liberar este mix
          </p>
        </div>

        {buses && onSelectBus && (
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {buses.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setPin("");
                  setError(false);
                  onSelectBus(b.id);
                }}
                aria-pressed={b.id === bus.id}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
                  b.id === bus.id
                    ? "border-level/50 bg-level/15 text-level"
                    : "border-border bg-surface/60 text-muted-foreground hover:bg-surface-raised",
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        )}

        <div className="my-6 flex justify-center gap-3">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => {
            const filled = i < pin.length;
            return (
              <span
                key={i}
                className={cn(
                  "h-11 w-9 rounded-lg border transition-all duration-150",
                  error
                    ? "border-mute/70 bg-mute/10"
                    : filled
                      ? "border-level/60 bg-level/10"
                      : "border-border bg-background/60",
                )}
              >
                <span className="grid h-full w-full place-items-center font-mono text-xl text-level">
                  {filled ? "•" : ""}
                </span>
              </span>
            );
          })}
        </div>

        <p
          role="status"
          className={cn(
            "mb-4 text-center font-mono text-[11px] uppercase tracking-widest transition-opacity",
            error ? "text-mute opacity-100" : "text-muted-foreground opacity-0",
          )}
        >
          PIN inválido — tente novamente
        </p>

        <div className="grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              disabled={checking}
              aria-label={
                key === "del" ? "Apagar" : key === "clear" ? "Limpar" : key
              }
              className={cn(
                "h-14 rounded-xl border border-border bg-surface/70 font-mono text-lg tabular-nums transition-colors active:scale-[0.97]",
                "hover:bg-surface-raised disabled:opacity-50",
                key === "clear" || key === "del"
                  ? "text-muted-foreground"
                  : "text-foreground",
              )}
            >
              {key === "del" ? (
                <Delete className="mx-auto h-4 w-4" />
              ) : key === "clear" ? (
                <span className="text-[11px] uppercase tracking-widest">C</span>
              ) : (
                key
              )}
            </button>
          ))}
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-4 w-full rounded-xl border border-border bg-background/60 py-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-surface"
          >
            Escolher outro mix
          </button>
        )}

        <p className="mt-5 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-level" />
          Sessão validada pelo console
        </p>
      </div>
    </div>
  );
}
