import { useEffect, useState } from "react";
import { Radio, Clock, Waves, WifiOff } from "lucide-react";
import type { MixerBus, MixerChannel } from "@/lib/mixer-types";
import { cn } from "@/lib/utils";

interface StatusPanelProps {
  /** true = bridge/OSC entregando frames de meters. */
  online: boolean;
  /** Epoch ms do último frame `meters` recebido (null = nenhum). */
  lastMeterAt: number | null;
  /** Hz medido do fluxo de meters. */
  meterHz: number;
  /** Ids dos canais que mudaram de nível no último frame. */
  updatingChannelIds: string[];
  channels: MixerChannel[];
  activeBus: MixerBus;
}

function useTick(ms: number) {
  const [, setN] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setN((n) => n + 1), ms);
    return () => window.clearInterval(t);
  }, [ms]);
}

function formatAge(lastMeterAt: number | null) {
  if (!lastMeterAt) return "—";
  const age = Date.now() - lastMeterAt;
  if (age < 1000) return `${age} ms atrás`;
  return `${(age / 1000).toFixed(1)} s atrás`;
}

function formatClock(ts: number | null) {
  if (!ts) return "--:--:--";
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${String(
    d.getMilliseconds(),
  ).padStart(3, "0")}`;
}

export function StatusPanel({
  online,
  lastMeterAt,
  meterHz,
  updatingChannelIds,
  channels,
  activeBus,
}: StatusPanelProps) {
  useTick(250);

  const stale = !lastMeterAt || Date.now() - lastMeterAt > 2000;
  const live = online && !stale;

  return (
    <section
      aria-label="Status da conexão OSC"
      className="glass rounded-2xl border border-border bg-surface/60 p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              live
                ? "animate-pulse bg-level shadow-[0_0_10px_2px_hsl(var(--level)/0.7)]"
                : "bg-mute shadow-[0_0_10px_2px_hsl(var(--mute)/0.6)]",
            )}
          />
          <span
            className={cn(
              "font-mono text-[11px] uppercase tracking-widest",
              live ? "text-level" : "text-mute",
            )}
          >
            {live ? (
              <span className="flex items-center gap-1.5">
                <Radio className="h-3 w-3" /> OSC ativo
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <WifiOff className="h-3 w-3" /> OSC sem sinal
              </span>
            )}
          </span>
        </div>

        <span className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          <Waves className="h-3 w-3" /> {live ? meterHz.toFixed(1) : "0.0"} Hz
        </span>

        <span className="flex items-center gap-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="uppercase tracking-widest">meters</span>
          {formatClock(lastMeterAt)}
          <span className="text-foreground/60">({formatAge(lastMeterAt)})</span>
        </span>

        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          bus <span className="text-pan">{activeBus.name}</span>
        </span>

        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {updatingChannelIds.length}/{channels.length} canais atualizando
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {channels.map((c) => {
          const updating = live && updatingChannelIds.includes(c.id);
          return (
            <li key={c.id}>
              <span
                title={
                  updating
                    ? `${c.name}: recebendo meters`
                    : `${c.name}: sem atualização`
                }
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
                  updating
                    ? "border-level/50 bg-level/10 text-level"
                    : "border-border bg-background/50 text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    updating ? "bg-level" : "bg-muted-foreground/40",
                  )}
                />
                {c.name}
                <span className="tabular-nums text-foreground/60">
                  {Math.round(c.level)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
