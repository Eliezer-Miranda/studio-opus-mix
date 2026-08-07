import { createFileRoute } from "@tanstack/react-router";
import { Activity, Columns, Lock, RotateCcw, Sliders } from "lucide-react";
import { BusSidebar } from "@/components/mixer/bus-sidebar";
import { ChannelStrip } from "@/components/mixer/channel-strip";
import { VerticalFader } from "@/components/mixer/vertical-fader";
import { PinLock } from "@/components/mixer/pin-lock";
import { useMixerState } from "@/hooks/use-mixer-state";
import { formatDb } from "@/lib/mixer-types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Monitor Console — Mixer Digital de Monitoração" },
      {
        name: "description",
        content:
          "Console digital de monitoração com faders verticais, pan rotativo, mute e solo por músico. Interface dark otimizada para tablet e desktop.",
      },
      { property: "og:title", content: "Monitor Console — Mixer Digital" },
      {
        property: "og:description",
        content:
          "Controle mixes de monitoração por músico: faders, pan, mute, solo e master em tempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MonitorConsole,
});

function MonitorConsole() {
  const {
    buses,
    activeBusId,
    setActiveBusId,
    unlockedBusId,
    authenticate,
    lock,
    compact,
    setCompact,
    channels,
    patchChannel,
    soloActive,
    master,
    setMaster,
  } = useMixerState();

  const activeBus = buses.find((b) => b.id === activeBusId)!;

  if (unlockedBusId !== activeBusId) {
    return (
      <PinLock
        bus={activeBus}
        buses={buses}
        onSelectBus={setActiveBusId}
        onSubmit={(pin) => authenticate(activeBusId, pin)}
      />
    );
  }

  return (
    <div className="console-grid-bg min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col lg:flex-row">
        <aside className="p-3 lg:h-screen lg:sticky lg:top-0 lg:p-0">
          <div className="lg:h-full lg:border-r lg:border-border lg:bg-sidebar">
            <BusSidebar
              buses={buses}
              activeBusId={activeBusId}
              onSelect={setActiveBusId}
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col gap-4 p-3 sm:p-6">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Monitor console
              </p>
              <h1 className="truncate font-mono text-xl font-bold uppercase tracking-tight sm:text-2xl">
                Mix — {activeBus.name}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="hidden items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-level sm:flex">
                <Activity className="h-3 w-3" /> 48 kHz · 32 bit
              </span>
              <span className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <Sliders className="h-3 w-3" /> {channels.length} ch
              </span>
              <button
                type="button"
                onClick={lock}
                className="flex items-center gap-2 rounded-full border border-mute/40 bg-mute/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-mute transition-colors hover:bg-mute/20"
              >
                <Lock className="h-3 w-3" /> bloquear
              </button>
            </div>
          </header>

          <section
            aria-label="Canais do mixer"
            className="flex flex-1 items-start gap-3 overflow-x-auto pb-2"
          >
            {channels.map((channel) => (
              <ChannelStrip
                key={channel.id}
                channel={channel}
                onChange={patchChannel}
                soloActive={soloActive}
              />
            ))}

            {/* Master */}
            <article className="sticky right-0 flex w-[112px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-master/30 bg-surface px-2 py-3 shadow-[-12px_0_24px_-12px_rgba(0,0,0,0.9)] sm:w-[124px] sm:gap-3 sm:px-3 sm:py-4 lg:w-[132px]">
              <header className="flex flex-col items-center gap-1">
                <span className="rounded-full bg-master/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-master">
                  master
                </span>
                <h2 className="font-mono text-xs font-semibold uppercase">
                  {activeBus.name}
                </h2>
              </header>
              <div className="h-[52px] pt-2">
                <button
                  type="button"
                  onClick={() => setMaster(82)}
                  className="flex items-center gap-1 rounded-lg border border-border bg-surface/60 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition-colors hover:bg-surface-raised"
                >
                  <RotateCcw className="h-3 w-3" /> reset
                </button>
              </div>
              <VerticalFader
                value={master}
                onChange={setMaster}
                accent="master"
                ariaLabel="Volume master"
              />
              <div className="w-full rounded-lg border border-master/30 bg-background/70 py-1 text-center">
                <span className="font-mono text-sm tabular-nums text-master">
                  {formatDb(master)}
                </span>
                <span className="ml-0.5 font-mono text-[9px] text-muted-foreground">
                  dB
                </span>
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}
