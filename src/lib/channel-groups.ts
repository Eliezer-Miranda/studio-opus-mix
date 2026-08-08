import type { MixerChannel } from "./mixer-types";

export interface ChannelGroup {
  id: string;
  label: string;
  /** Lucide icon key resolved in the group menu. */
  icon: "layers" | "disc" | "drum" | "guitar" | "piano" | "mic" | "speech";
  channelIds: string[];
}

/** Groups used by the mobile/tablet focus menu. */
export const CHANNEL_GROUPS: ChannelGroup[] = [
  { id: "todos", label: "Todos", icon: "layers", channelIds: [] },
  { id: "tracks", label: "Tracks", icon: "disc", channelIds: ["vs", "click", "guias"] },
  { id: "ritmo", label: "Ritmo", icon: "drum", channelIds: ["bateria", "baixo"] },
  { id: "cordas", label: "Cordas", icon: "guitar", channelIds: ["guitarra", "violao"] },
  { id: "teclas", label: "Teclas", icon: "piano", channelIds: ["teclado1", "teclado2"] },
  { id: "vozes", label: "Vozes", icon: "mic", channelIds: ["voz1", "voz2", "voz3", "voz4"] },
  { id: "fala", label: "Palavra", icon: "speech", channelIds: ["ministro", "pastor"] },
];

export function filterChannelsByGroup(
  channels: MixerChannel[],
  groupId: string,
): MixerChannel[] {
  const group = CHANNEL_GROUPS.find((g) => g.id === groupId);
  if (!group || group.channelIds.length === 0) return channels;
  return channels.filter((c) => group.channelIds.includes(c.id));
}
