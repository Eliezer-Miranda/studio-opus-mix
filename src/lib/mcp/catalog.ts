/**
 * Static, non-sensitive catalog of the console layout.
 * Safe to expose publicly (no PINs, no live state).
 */
export interface CatalogBus {
  id: string;
  name: string;
}

export interface CatalogChannel {
  id: string;
  name: string;
  kind: "live" | "backing";
  group: string;
}

export const CATALOG_BUSES: CatalogBus[] = [
  { id: "bateria", name: "Bateria" },
  { id: "baixo", name: "Baixo" },
  { id: "guitarra", name: "Guitarra" },
  { id: "violao", name: "Violão" },
  { id: "teclado", name: "Teclado 1" },
  { id: "teclado2", name: "Teclado 2" },
  { id: "voz1", name: "Voz 1" },
  { id: "voz2", name: "Voz 2" },
  { id: "voz3", name: "Voz 3" },
  { id: "voz4", name: "Voz 4" },
  { id: "ministro", name: "Ministro" },
  { id: "pastor", name: "Pastor" },
  { id: "playback", name: "Playback" },
];

export const CATALOG_CHANNELS: CatalogChannel[] = [
  { id: "vs", name: "VS", kind: "backing", group: "tracks" },
  { id: "click", name: "Click", kind: "backing", group: "tracks" },
  { id: "guias", name: "Guias", kind: "backing", group: "tracks" },
  { id: "bateria", name: "Bateria", kind: "live", group: "ritmo" },
  { id: "baixo", name: "Baixo", kind: "live", group: "ritmo" },
  { id: "guitarra", name: "Guitarra", kind: "live", group: "cordas" },
  { id: "violao", name: "Violão", kind: "live", group: "cordas" },
  { id: "teclado1", name: "Teclado 1", kind: "live", group: "teclas" },
  { id: "teclado2", name: "Teclado 2", kind: "live", group: "teclas" },
  { id: "voz1", name: "Voz 1", kind: "live", group: "vozes" },
  { id: "voz2", name: "Voz 2", kind: "live", group: "vozes" },
  { id: "voz3", name: "Voz 3", kind: "live", group: "vozes" },
  { id: "voz4", name: "Voz 4", kind: "live", group: "vozes" },
  { id: "ministro", name: "Ministro", kind: "live", group: "fala" },
  { id: "pastor", name: "Pastor", kind: "live", group: "fala" },
];
