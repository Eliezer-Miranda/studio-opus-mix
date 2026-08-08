import { Layers, Disc3, Drum, Guitar, Piano, Mic, Speech } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHANNEL_GROUPS } from "@/lib/channel-groups";

const ICONS = {
  layers: Layers,
  disc: Disc3,
  drum: Drum,
  guitar: Guitar,
  piano: Piano,
  mic: Mic,
  speech: Speech,
} as const;

interface GroupMenuProps {
  activeGroupId: string;
  onSelect: (id: string) => void;
  counts: Record<string, number>;
}

export function GroupMenu({ activeGroupId, onSelect, counts }: GroupMenuProps) {
  return (
    <nav
      aria-label="Focar grupo de canais"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      {CHANNEL_GROUPS.map((group) => {
        const Icon = ICONS[group.icon];
        const active = group.id === activeGroupId;
        const count = counts[group.id] ?? 0;
        if (count === 0) return null;
        return (
          <button
            key={group.id}
            type="button"
            onClick={() => onSelect(group.id)}
            aria-pressed={active}
            className={cn(
              "flex min-h-[40px] shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors active:scale-95",
              active
                ? "border-level/50 bg-level/15 text-level"
                : "border-border bg-surface/60 text-muted-foreground hover:bg-surface-raised",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{group.label}</span>
            <span className="tabular-nums opacity-70">{count}</span>
          </button>
        );
      })}
    </nav>
  );
}
