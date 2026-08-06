import { Drum, Guitar, Mic, Speech, Piano, Disc3, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MixerBus } from "@/lib/mixer-types";

const ICONS = {
  drum: Drum,
  guitar: Guitar,
  mic: Mic,
  speech: Speech,
  piano: Piano,
  disc: Disc3,
} as const;

interface BusSidebarProps {
  buses: MixerBus[];
  activeBusId: string;
  onSelect: (id: string) => void;
}

export function BusSidebar({ buses, activeBusId, onSelect }: BusSidebarProps) {
  return (
    <nav
      aria-label="Buses de monitoração"
      className="glass-panel flex shrink-0 gap-2 overflow-x-auto rounded-2xl p-2 lg:h-full lg:w-60 lg:flex-col lg:overflow-visible lg:rounded-none lg:border-y-0 lg:border-l-0 lg:p-4"
    >
      <div className="hidden lg:mb-2 lg:block">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Monitor mixes
        </p>
      </div>

      {buses.map((bus) => {
        const Icon = ICONS[bus.icon];
        const active = bus.id === activeBusId;
        return (
          <button
            key={bus.id}
            type="button"
            onClick={() => onSelect(bus.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 lg:w-full",
              active
                ? "border-level/40 bg-level/10 shadow-[inset_3px_0_0_0_var(--level)]"
                : "border-transparent hover:border-border hover:bg-sidebar-accent",
            )}
          >
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border transition-colors",
                active ? "bg-level/15 text-level" : "bg-surface text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate font-mono text-xs font-semibold uppercase tracking-wide",
                  active ? "text-level" : "text-sidebar-foreground",
                )}
              >
                {bus.name}
              </span>
              <span className="hidden font-mono text-[10px] text-muted-foreground lg:block">
                {bus.channelCount} ch
              </span>
            </span>
          </button>
        );
      })}

      <div className="mt-auto hidden items-center gap-2 rounded-xl border border-border bg-surface/50 px-3 py-2 lg:flex">
        <Wifi className="h-3.5 w-3.5 text-level" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Console online
        </span>
      </div>
    </nav>
  );
}
