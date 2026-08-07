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
  { id: "bateria", name: "Bateria", icon: "drum", channelCount: 16 },
  { id: "baixo", name: "Baixo", icon: "guitar", channelCount: 16 },
  { id: "teclado", name: "Teclado", icon: "piano", channelCount: 16 },
  { id: "vozes", name: "Vozes", icon: "mic", channelCount: 16 },
  { id: "pastor", name: "Pastor", icon: "speech", channelCount: 16 },
  { id: "playback", name: "Playback", icon: "disc", channelCount: 16 },
];

const BASE_CHANNELS: MixerChannel[] = [
  { id: "vs", name: "VS", kind: "backing", volume: 55, pan: 0, mute: false, solo: false, level: 32 },
  { id: "click", name: "Click", kind: "backing", volume: 52, pan: 0, mute: false, solo: false, level: 30 },
  { id: "guias", name: "Guias", kind: "backing", volume: 48, pan: 0, mute: false, solo: false, level: 27 },
  { id: "bateria", name: "Bateria", kind: "live", volume: 78, pan: 0, mute: false, solo: false, level: 62 },
  { id: "baixo", name: "Baixo", kind: "live", volume: 68, pan: 0, mute: false, solo: false, level: 48 },
  { id: "guitarra", name: "Guitarra", kind: "live", volume: 61, pan: 24, mute: false, solo: false, level: 41 },
  { id: "violao", name: "Violão", kind: "live", volume: 59, pan: -24, mute: false, solo: false, level: 38 },
  { id: "teclado1", name: "Teclado 1", kind: "live", volume: 66, pan: -20, mute: false, solo: false, level: 45 },
  { id: "teclado2", name: "Teclado 2", kind: "live", volume: 63, pan: 20, mute: false, solo: false, level: 42 },
  { id: "voz1", name: "Voz 1", kind: "live", volume: 84, pan: 0, mute: false, solo: false, level: 71 },
  { id: "voz2", name: "Voz 2", kind: "live", volume: 74, pan: -10, mute: false, solo: false, level: 55 },
  { id: "voz3", name: "Voz 3", kind: "live", volume: 72, pan: 10, mute: false, solo: false, level: 52 },
  { id: "voz4", name: "Voz 4", kind: "live", volume: 70, pan: 14, mute: false, solo: false, level: 49 },
  { id: "ministro", name: "Ministro", kind: "live", volume: 82, pan: 0, mute: false, solo: false, level: 64 },
  { id: "pastor", name: "Pastor", kind: "live", volume: 80, pan: 0, mute: false, solo: false, level: 58 },
];


/**
 * Mock PINs. In production the PIN is NEVER validated in the browser:
 * emit `session:auth { busId, pin }` and keep the returned session token.
 * See docs/monitor-console-endpoints.md.
 */
const MOCK_PINS: Record<string, string> = {
  bateria: "1111",
  baixo: "2222",
  teclado: "3333",
  vozes: "4444",
  pastor: "5555",
  playback: "6666",
};

export function useMixerState() {
  const [activeBusId, setActiveBusId] = useState<string>("bateria");
  const [unlockedBusId, setUnlockedBusId] = useState<string | null>(null);
  const [master, setMaster] = useState(82);
  const [channels, setChannels] = useState<MixerChannel[]>(BASE_CHANNELS);

  /** Replace with the socket round-trip; keep the boolean contract. */
  const authenticate = useCallback(
    (busId: string, pin: string): boolean => {
      const ok = MOCK_PINS[busId] === pin;
      if (ok) setUnlockedBusId(busId);
      return ok;
    },
    [],
  );

  const lock = useCallback(() => setUnlockedBusId(null), []);

  const selectBus = useCallback((id: string) => {
    setActiveBusId(id);
    // Trocar de músico exige novo PIN.
    setUnlockedBusId((prev) => (prev === id ? prev : null));
  }, []);

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
    setActiveBusId: selectBus,
    unlockedBusId,
    authenticate,
    lock,
    channels,
    patchChannel,
    soloActive,
    master,
    setMaster,
  };
}
