import { Headphones, VolumeX, Music4, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { VerticalFader } from "./vertical-fader";
import { PanKnob } from "./pan-knob";
import { formatDb, type ChannelPatch, type MixerChannel } from "@/lib/mixer-types";

interface ChannelStripProps {
  channel: MixerChannel;
  /** Emit partial updates — wire this to socket.emit("channel:update", ...). */
  onChange: (id: string, patch: ChannelPatch) => void;
  soloActive?: boolean;
}

function Led({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      className={cn("h-1.5 w-1.5 rounded-full transition-all", on && "led-on")}
      style={{ color, backgroundColor: on ? color : "var(--muted)" }}
    />
  );
}

function Meter({ level, dimmed }: { level: number; dimmed: boolean }) {
  return (
    <div className="flex h-44 w-1.5 flex-col-reverse gap-[2px] overflow-hidden rounded-full bg-background/80 p-[1px] sm:h-52">
      {Array.from({ length: 18 }).map((_, i) => {
        const on = !dimmed && level > (i / 18) * 100;
        const color =
          i > 15 ? "var(--mute)" : i > 12 ? "var(--solo)" : "var(--level)";
        return (
          <span
            key={i}
            className="w-full flex-1 rounded-[1px] transition-opacity duration-150"
            style={{
              backgroundColor: on ? color : "var(--muted)",
              opacity: on ? 1 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
}

export function ChannelStrip({ channel, onChange, soloActive }: ChannelStripProps) {
  const dimmed = channel.mute || (soloActive === true && !channel.solo);
  const isLive = channel.kind === "live";

  return (
    <article
      className={cn(
        "glass-panel flex w-[132px] shrink-0 flex-col items-center gap-3 rounded-2xl px-3 py-4 transition-all duration-200",
        dimmed && "opacity-60",
        channel.solo && "ring-1 ring-solo/50",
      )}
    >
      <header className="flex w-full flex-col items-center gap-1">
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-widest",
            isLive
              ? "bg-level/10 text-level"
              : "bg-pan/10 text-pan",
          )}
        >
          {isLive ? <Radio className="h-2.5 w-2.5" /> : <Music4 className="h-2.5 w-2.5" />}
          {isLive ? "live" : "track"}
        </span>
        <h3 className="w-full truncate text-center font-mono text-xs font-semibold uppercase tracking-tight">
          {channel.name}
        </h3>
      </header>

      <div className="flex h-[52px] items-start">
        {isLive ? (
          <PanKnob
            value={channel.pan}
            onChange={(pan) => onChange(channel.id, { pan })}
            ariaLabel={`Pan ${channel.name}`}
          />
        ) : (
          <span className="pt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            stereo
          </span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <VerticalFader
          value={channel.volume}
          onChange={(volume) => onChange(channel.id, { volume })}
          ariaLabel={`Volume ${channel.name}`}
        />
        <Meter level={channel.level} dimmed={dimmed} />
      </div>

      <div className="w-full rounded-lg border border-border bg-background/70 py-1 text-center">
        <span className="font-mono text-sm tabular-nums text-level">
          {formatDb(channel.volume)}
        </span>
        <span className="ml-0.5 font-mono text-[9px] text-muted-foreground">dB</span>
      </div>

      <div className="grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={channel.mute}
          onClick={() => onChange(channel.id, { mute: !channel.mute })}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg border py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
            channel.mute
              ? "border-mute/60 bg-mute/20 text-mute"
              : "border-border bg-surface/60 text-muted-foreground hover:bg-surface-raised",
          )}
        >
          <Led on={channel.mute} color="var(--mute)" />
          <VolumeX className="h-3 w-3" />
        </button>
        <button
          type="button"
          aria-pressed={channel.solo}
          onClick={() => onChange(channel.id, { solo: !channel.solo })}
          className={cn(
            "flex items-center justify-center gap-1 rounded-lg border py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
            channel.solo
              ? "border-solo/60 bg-solo/20 text-solo"
              : "border-border bg-surface/60 text-muted-foreground hover:bg-surface-raised",
          )}
        >
          <Led on={channel.solo} color="var(--solo)" />
          <Headphones className="h-3 w-3" />
        </button>
      </div>
    </article>
  );
}
