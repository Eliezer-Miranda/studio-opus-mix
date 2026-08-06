import { useCallback, useEffect, useState } from "react";
import type { ChannelPatch, MixerBus, MixerChannel } from "@/lib/mixer-types";

/**
 * Local mixer state with mock data.
 *
 * Swap the body of `patchChannel` for `socket.emit("channel:update", ...)` and
 * feed `setChannels` from `socket.on("mixer:state", ...)` to go live. The UI
 * components stay untouched because they are fully controlled.
 */

export const BUSES: MixerBus[] = [
  { id: "bateria", name: "Bateria", icon: "drum", channelCount: 6 },
  { id: "baixo", name: "Baixo", icon: "guitar", channelCount: 6 },
  { id: "teclado", name: "Teclado", icon: "piano", channelCount: 6 },
  { id: "vozes", name: "Vozes", icon: "mic", channelCount: 6 },
  { id: "pastor", name: "Pastor", icon: "speech", channelCount: 6 },
  { id: "playback", name: "Playback", icon: "disc", channelCount: 6 },
];

const BASE_CHANNELS: MixerChannel[] = [
  { id: "kick", name: "Kick", kind: "live", volume: 78, pan: 0, mute: false, solo: false, level: 62 },
  { id: "snare", name: "Snare", kind: "live", volume: 72, pan: -8, mute: false, solo: false, level: 54 },
  { id: "bass", name: "Baixo", kind: "live", volume: 68, pan: 0, mute: false, solo: false, level: 48 },
  { id: "gtr", name: "Guitarra", kind: "live", volume: 61, pan: 24, mute: false, solo: false, level: 41 },
  { id: "keys", name: "Teclado", kind: "live", volume: 66, pan: -20, mute: false, solo: false, level: 45 },
  { id: "voxlead", name: "Voz Lead", kind: "live", volume: 84, pan: 0, mute: false, solo: false, level: 71 },
  { id: "voxbk", name: "Backing Vox", kind: "live", volume: 57, pan: 14, mute: true, solo: false, level: 33 },
  { id: "pastor", name: "Pastor", kind: "live", volume: 80, pan: 0, mute: false, solo: false, level: 58 },
  { id: "trkclick", name: "Click", kind: "backing", volume: 52, pan: 0, mute: false, solo: false, level: 30 },
  { id: "trkpads", name: "Pads Trk", kind: "backing", volume: 47, pan: 0, mute: false, solo: false, level: 26 },
];

export function useMixerState() {
  const [activeBusId, setActiveBusId] = useState(BUSES[0].id);
  const [master, setMaster] = useState(82);
  const [channels, setChannels] = useState<MixerChannel[]>(BASE_CHANNELS);

  const patchChannel = useCallback((id: string, patch: ChannelPatch) => {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  // Simulated input meters — replace with socket meter frames.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setChannels((prev) =>
        prev.map((c) => ({
          ...c,
          level: Math.max(
            8,
            Math.min(100, c.level + (Math.random() * 34 - 17)),
          ),
        })),
      );
    }, 320);
    return () => window.clearInterval(timer);
  }, []);

  const soloActive = channels.some((c) => c.solo);

  return {
    buses: BUSES,
    activeBusId,
    setActiveBusId,
    channels,
    patchChannel,
    soloActive,
    master,
    setMaster,
  };
}
