/**
 * Shared mixer domain types.
 *
 * All UI components are controlled: they receive values via props and emit
 * changes through callbacks, so a socket.io layer (or any store) can own the
 * state later without touching presentation code.
 */

export type ChannelKind = "live" | "backing";

export interface MixerChannel {
  /** Stable id used as the socket.io payload key. */
  id: string;
  name: string;
  kind: ChannelKind;
  /** 0..100 fader position. */
  volume: number;
  /** -50..50 pan position (live channels only). */
  pan: number;
  mute: boolean;
  solo: boolean;
  /** 0..100 input meter level (read-only, driven by the console). */
  level: number;
}

export interface MixerBus {
  id: string;
  name: string;
  /** Lucide icon name is resolved in the sidebar. */
  icon: "drum" | "guitar" | "mic" | "speech" | "piano" | "disc";
  channelCount: number;
}

export type ChannelPatch = Partial<
  Pick<MixerChannel, "volume" | "pan" | "mute" | "solo">
>;

/** Fader position (0..100) -> dB label used on the numeric display. */
export function positionToDb(position: number): number {
  if (position <= 0) return -Infinity;
  return Math.round((position / 100) * 70 - 60);
}

export function formatDb(position: number): string {
  const db = positionToDb(position);
  if (db === -Infinity) return "-∞";
  return `${db > 0 ? "+" : ""}${db.toFixed(1)}`;
}

export function formatPan(pan: number): string {
  const value = Math.round(pan);
  if (value === 0) return "C";
  return value < 0 ? `L${Math.abs(value)}` : `R${value}`;
}
