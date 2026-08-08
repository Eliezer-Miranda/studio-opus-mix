# Guia Completo — Como colocar o painel para funcionar (com VU real)

Este documento descreve, do zero ao palco, como transformar o painel Midnight Mixer Pro
(hoje rodando com dados simulados) em um controle real de monitoração, incluindo
**medidores de VU alimentados pela mesa de som**.

Sumário:

1. [Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
2. [Pré-requisitos de hardware e rede](#2-pré-requisitos-de-hardware-e-rede)
3. [O bridge server (ponte OSC ↔ WebSocket)](#3-o-bridge-server-ponte-osc--websocket)
4. [Mapeamento de canais e buses](#4-mapeamento-de-canais-e-buses)
5. [VU real: como funciona de verdade](#5-vu-real-como-funciona-de-verdade)
6. [Mudanças no app React](#6-mudanças-no-app-react)
7. [PIN e sessões](#7-pin-e-sessões)
8. [Deploy e operação no culto/show](#8-deploy-e-operação-no-cultoshow)
9. [Checklist de testes](#9-checklist-de-testes)
10. [Solução de problemas](#10-solução-de-problemas)

---

## 1. Visão geral da arquitetura

```text
  ┌────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
  │  Mesa digital  │  OSC   │   Bridge server      │ Socket │  Painel (React) │
  │  X32 / M32 /   │◄──────►│   Node.js            │◄──────►│  iPad / celular │
  │  SQ / Wing ... │  UDP   │   (osc + socket.io)  │   WS   │  do músico      │
  └────────────────┘        └──────────────────────┘        └─────────────────┘
        LAN cabeada              LAN / Wi-Fi 5 GHz              Wi-Fi 5 GHz
```

Por que um bridge? Navegadores não falam UDP nem OSC. O bridge:

- mantém **uma única** conexão com a mesa (mesas aceitam poucos clientes simultâneos);
- traduz `volume 0..100` ↔ o formato da mesa (float 0..1, dB, etc.);
- assina os **medidores** da mesa e reemite para os painéis em taxa controlada;
- valida PIN e escopo (o músico só altera o bus dele);
- guarda o último estado, para um painel que conecta atrasado já receber tudo.

O contrato de mensagens está em [`monitor-console-endpoints.md`](./monitor-console-endpoints.md).
Este guia é o "como fazer"; aquele é a "referência".

---

## 2. Pré-requisitos de hardware e rede

**Mesa de som** com controle remoto por rede. Compatibilidade testada/documentada:

| Mesa | Protocolo | Porta | Medidores |
| --- | --- | --- | --- |
| Behringer X32 / Midas M32 | OSC sobre UDP | 10023 | `/meters/1`, `/meters/2`, `/batchsubscribe` |
| Behringer Wing | OSC sobre UDP | 2223 | `/$meters` |
| Allen & Heath SQ / Qu | MIDI over TCP (protocolo próprio) | 51325 | via `SysEx` de metering |
| Yamaha TF / QL | SCP (texto sobre TCP) | 49280 | `MTRStart` |
| Sem mesa (áudio local) | — | — | Web Audio API `AnalyserNode` (ver §5.3) |

**Rede — o item que mais causa problema:**

- Mesa e bridge **sempre no cabo**. Nunca a mesa em Wi-Fi.
- Roteador/AP dedicado só para o palco, **5 GHz**, SSID separado do Wi-Fi de visitantes.
- IP fixo (ou reserva de DHCP) para a mesa e para o bridge.
- Desligue "isolamento de clientes" (AP isolation) no AP.
- Reserve banda: 12 painéis × 20 Hz de metering ≈ 60–120 kB/s. Trivial, mas
  **latência** importa: mantenha o ping do iPad ao bridge abaixo de 20 ms.

---

## 3. O bridge server (ponte OSC ↔ WebSocket)

Projeto separado do app (roda em um mini-PC, Raspberry Pi 4+ ou notebook no palco).

```bash
mkdir monitor-bridge && cd monitor-bridge
npm init -y
npm i socket.io osc dotenv jsonwebtoken
```

`.env`:

```dotenv
MIXER_IP=192.168.10.20
MIXER_PORT=10023
BRIDGE_PORT=8787
JWT_SECRET=troque-isto
METER_HZ=20
```

### 3.1 Conexão com a mesa e keep-alive

O X32 só continua enviando dados se receber `/xremote` a cada **< 10 s**.

```js
// osc-client.js
import osc from "osc";

export const udp = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 10024,
  remoteAddress: process.env.MIXER_IP,
  remotePort: Number(process.env.MIXER_PORT),
  metadata: true,
});

udp.open();

udp.on("ready", () => {
  setInterval(() => udp.send({ address: "/xremote", args: [] }), 8000);
});
```

### 3.2 Escrita (fader, pan, mute do músico)

O X32 usa float `0..1` na escala do fader, não dB linear. Conversão:

```js
// escala X32: 0..1 -> dB (-90..+10)
export const posToFloat = (p) => Math.min(1, Math.max(0, p / 100));

export function setSendLevel(busIndex, channelIndex, position) {
  const ch = String(channelIndex).padStart(2, "0");
  const bus = String(busIndex).padStart(2, "0");
  udp.send({
    address: `/ch/${ch}/mix/${bus}/level`,
    args: [{ type: "f", value: posToFloat(position) }],
  });
}

export function setSendPan(busIndex, channelIndex, pan) {
  const ch = String(channelIndex).padStart(2, "0");
  const bus = String(busIndex).padStart(2, "0");
  udp.send({
    address: `/ch/${ch}/mix/${bus}/pan`,
    args: [{ type: "f", value: (pan + 50) / 100 }], // -50..50 -> 0..1
  });
}

export function setSendOn(busIndex, channelIndex, on) {
  const ch = String(channelIndex).padStart(2, "0");
  const bus = String(busIndex).padStart(2, "0");
  udp.send({
    address: `/ch/${ch}/mix/${bus}/on`,
    args: [{ type: "i", value: on ? 1 : 0 }],
  });
}
```

> **Importante:** o painel do músico altera o **send do canal para o bus dele**
> (`/ch/XX/mix/BB/level`), **nunca** o fader principal (`/ch/XX/mix/fader`).
> Mexer no fader principal muda o som da casa/PA.

### 3.3 Servidor Socket.IO

```js
// server.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { setSendLevel, setSendPan, setSendOn } from "./osc-client.js";
import { CHANNEL_MAP, BUS_MAP } from "./map.js";

const io = new Server(Number(process.env.BRIDGE_PORT), {
  cors: { origin: "*" },
});

io.of("/monitor").use((socket, next) => {
  try {
    const { busId } = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    socket.data.busId = busId;
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.of("/monitor").on("connection", (socket) => {
  const { busId } = socket.data;
  socket.join(`bus:${busId}`);
  socket.emit("mixer:state", snapshotFor(busId)); // estado atual

  socket.on("channel:update", ({ channelId, volume, pan, mute }) => {
    const ch = CHANNEL_MAP[channelId];
    const bus = BUS_MAP[busId];
    if (!ch || bus == null) return;
    if (volume != null) setSendLevel(bus, ch, volume);
    if (pan != null) setSendPan(bus, ch, pan);
    if (mute != null) setSendOn(bus, ch, !mute);
    socket.to(`bus:${busId}`).emit("channel:patched", { channelId, volume, pan, mute });
  });
});
```

Rode com `node server.js` e mantenha vivo com `pm2 start server.js --name bridge`
ou um serviço systemd.

---

## 4. Mapeamento de canais e buses

Crie `map.js` no bridge espelhando os IDs usados no app
(`src/hooks/use-mixer-state.ts` e `src/lib/mcp/catalog.ts`):

```js
// map.js — id do app -> número na mesa
export const CHANNEL_MAP = {
  vs: 29, click: 30, guias: 31,       // tracks (canais/aux de playback)
  bateria: 1, baixo: 9, guitarra: 11,
  violao: 12, teclado1: 13, teclado2: 14,
  voz1: 17, voz2: 18, voz3: 19, voz4: 20,
  ministro: 21, pastor: 22,
};

export const BUS_MAP = {
  bateria: 1, baixo: 2, guitarra: 3, violao: 4,
  teclado: 5, teclado2: 6,
  voz1: 7, voz2: 8, voz3: 9, voz4: 10,
  ministro: 11, pastor: 12, playback: 13,
};
```

Regras:

- Buses de fone **mono** = 1 bus por músico; **estéreo (in-ear)** = par de buses
  ligado como stereo-link na mesa; o `pan` então faz sentido.
- Ajuste os buses para **Pre-Fader** na mesa, senão o mix do fone muda quando o
  técnico mexe no PA.
- Se o número não bater, o app fica "mexendo em canal errado" — valide item a item
  antes do primeiro uso.

---

## 5. VU real: como funciona de verdade

### 5.1 Assinando os medidores no X32

O X32 envia blobs binários com floats de nível. Assinatura precisa ser renovada
a cada ~10 s.

```js
// meters.js
import { udp } from "./osc-client.js";

const HZ = Number(process.env.METER_HZ || 20);
const EVERY = Math.round(50 / HZ) || 1; // fator de decimação do X32 (1 = 50 Hz)

function subscribe() {
  // /meters/1 = todos os canais de entrada (pós-preamp)
  udp.send({
    address: "/batchsubscribe",
    args: [
      { type: "s", value: "meters/1" },
      { type: "s", value: "/meters/1" },
      { type: "i", value: 0 },
      { type: "i", value: 0 },
      { type: "i", value: EVERY },
    ],
  });
}

subscribe();
setInterval(subscribe, 9000); // renovação obrigatória
```

Decodificando o blob (little-endian: `int32` com a contagem + N floats lineares 0..1):

```js
export function decodeMeters(blob) {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const count = view.getInt32(0, true);
  const values = [];
  for (let i = 0; i < count; i++) values.push(view.getFloat32(4 + i * 4, true));
  return values; // índice 0 = canal 1
}
```

### 5.2 Convertendo para a escala do painel (0..100)

O valor da mesa é **amplitude linear**. VU precisa ser logarítmico, senão tudo
parece parado embaixo.

```js
const FLOOR_DB = -60;

export function linearToPosition(v) {
  if (v <= 0.0000001) return 0;
  const db = 20 * Math.log10(v);            // -inf .. 0 dBFS
  const clamped = Math.max(FLOOR_DB, Math.min(0, db));
  return ((clamped - FLOOR_DB) / -FLOOR_DB) * 100; // 0..100
}
```

Faixas de cor já usadas pelo `Meter` do painel (18 segmentos):

| Segmentos | dBFS aprox. | Cor |
| --- | --- | --- |
| 0–12 | -60 a -20 | verde (`--level`) |
| 13–15 | -20 a -8 | amarelo (`--solo`) |
| 16–17 | -8 a 0 | vermelho (`--mute`) |

### 5.3 Peak hold e ballistics (o que faz parecer um VU de verdade)

Faça isso **no bridge**, para todos os painéis verem o mesmo:

```js
const state = new Map(); // channelId -> { level, peak, peakAt }
const ATTACK = 1;        // sobe instantâneo
const RELEASE = 0.25;    // desce suave (quanto menor, mais lento)
const PEAK_HOLD_MS = 1200;

export function ballistics(channelId, target) {
  const now = Date.now();
  const s = state.get(channelId) || { level: 0, peak: 0, peakAt: 0 };
  s.level = target > s.level
    ? s.level + (target - s.level) * ATTACK
    : s.level + (target - s.level) * RELEASE;
  if (target >= s.peak || now - s.peakAt > PEAK_HOLD_MS) {
    s.peak = target;
    s.peakAt = now;
  }
  state.set(channelId, s);
  return { level: Math.round(s.level), peak: Math.round(s.peak) };
}
```

### 5.4 Emitindo para os painéis

Nunca emita um evento por canal. Envie **um frame** com todos, em 15–20 Hz:

```js
setInterval(() => {
  const frame = {};
  for (const [channelId, num] of Object.entries(CHANNEL_MAP)) {
    const linear = lastMeterValues[num - 1] ?? 0;
    frame[channelId] = ballistics(channelId, linearToPosition(linear));
  }
  io.of("/monitor").emit("meters", { t: Date.now(), ch: frame });
}, 1000 / HZ);
```

Payload de exemplo:

```json
{
  "t": 1723074000123,
  "ch": {
    "bateria": { "level": 74, "peak": 88 },
    "voz1":    { "level": 61, "peak": 70 }
  }
}
```

> **Volume ≠ VU.** O fader (`volume`) é o que o músico manda; o VU (`level`) é o
> que a mesa está medindo. Eles são independentes — não derive um do outro.

### 5.5 Alternativa sem mesa: VU pelo microfone/áudio do dispositivo

Serve para demonstração ou setups sem OSC. Roda 100% no navegador:

```ts
// src/hooks/use-local-vu.ts
export async function createLocalVu() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Float32Array(analyser.fftSize);

  return () => {
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const rms = Math.sqrt(sum / buf.length);
    const db = 20 * Math.log10(rms || 1e-7);
    return Math.max(0, Math.min(100, ((Math.max(-60, db) + 60) / 60) * 100));
  };
}
```

Chame o retorno dentro de um `requestAnimationFrame` e alimente `level`.
Requer HTTPS e permissão do usuário; só existe no cliente (nunca no SSR).

---

## 6. Mudanças no app React

Todos os componentes já são **controlados**, então a troca é isolada no hook.

### 6.1 Instalar o cliente

```bash
bun add socket.io-client
```

### 6.2 Variável de ambiente

`.env` do app (valor público, pode ter prefixo `VITE_`):

```dotenv
VITE_BRIDGE_URL=http://192.168.10.30:8787
```

### 6.3 Substituir os pontos marcados em `src/hooks/use-mixer-state.ts`

Três trechos, e só eles:

**a) `authenticate` — hoje compara com `MOCK_PINS`:**

```ts
const authenticate = useCallback(async (busId: string, pin: string) => {
  const res = await fetch(`${import.meta.env.VITE_BRIDGE_URL}/session/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ busId, pin }),
  });
  if (!res.ok) return false;
  const { token } = await res.json();
  sessionStorage.setItem("monitor.token", token);
  setUnlockedBusId(busId);
  return true;
}, []);
```

**b) `patchChannel` — otimista + emit com throttle de 50 ms:**

```ts
const patchChannel = useCallback((id: string, patch: ChannelPatch) => {
  setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  throttledEmit(id, patch); // socket.emit("channel:update", { channelId: id, ...patch })
}, []);
```

**c) O `setInterval` que simula meters — apague e troque pelo socket:**

```ts
useEffect(() => {
  if (!unlockedBusId) return;
  const socket = io(`${import.meta.env.VITE_BRIDGE_URL}/monitor`, {
    auth: { token: sessionStorage.getItem("monitor.token") },
    transports: ["websocket"],
  });

  socket.on("mixer:state", (state) => setChannels(state.channels));

  socket.on("meters", ({ ch }) => {
    setChannels((prev) =>
      prev.map((c) => (ch[c.id] ? { ...c, level: ch[c.id].level, peak: ch[c.id].peak } : c)),
    );
  });

  socket.on("channel:patched", ({ channelId, ...patch }) =>
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, ...patch } : c))),
  );

  return () => socket.disconnect();
}, [unlockedBusId]);
```

### 6.4 Exibir o peak hold no medidor

`MixerChannel` ganha `peak?: number` em `src/lib/mixer-types.ts`. No `Meter`
(`src/components/mixer/channel-strip.tsx`), acenda o segmento do pico mesmo quando
o nível já caiu:

```tsx
const peakIndex = Math.floor((peak / 100) * 18);
const on = !dimmed && (level > (i / 18) * 100 || i === peakIndex);
```

### 6.5 Regras de performance no cliente

- 20 Hz × 15 canais em `setState` é aceitável; acima de 30 Hz, agrupe o frame em
  um `useRef` e pinte com `requestAnimationFrame`.
- Não anime os medidores com `transition` de altura — use `opacity`/cor por
  segmento (é o que o componente já faz).
- Faders: só emita ao mover (throttle 50 ms) e um emit final no `pointerup`.

---

## 7. PIN e sessões

- PIN **nunca** é validado no navegador. Hoje `MOCK_PINS` existe só para demo —
  remova ao integrar.
- Guarde os PINs com hash no bridge (`bcrypt`), um por bus.
- Token JWT com `busId` no payload e expiração de 6–12 h (duração do evento).
- O bridge deve **rejeitar** qualquer `channel:update` cujo `busId` do token não
  seja o do socket — é o que impede o baterista de mexer no fone do pastor.
- Botão de cadeado no cabeçalho limpa o token e volta para a tela de PIN.
- Sugestão operacional: trocar os PINs a cada temporada e imprimir uma etiqueta
  discreta em cada rack de fone.

---

## 8. Deploy e operação no culto/show

**Onde roda o quê:**

| Peça | Onde | Como subir |
| --- | --- | --- |
| Painel React | Lovable (publicado) ou servido pelo próprio bridge na LAN | `Publish` no Lovable |
| Bridge | mini-PC/RPi no rack, IP fixo | `pm2 start server.js` + `pm2 startup` |
| Mesa | rack, cabo Ethernet | IP fixo |

**Modo offline (recomendado para palco):** sirva o build do painel a partir do
próprio bridge (`express.static('dist')`), assim nada depende de internet.
Adicione o app à tela inicial do iPad (`Adicionar à Tela de Início`) para abrir
em tela cheia.

**Rotina antes do evento (5 min):**

1. Ligar mesa → esperar boot → ligar bridge.
2. Abrir o painel em um iPad, entrar com um PIN, verificar VU se movendo com um
   microfone aberto.
3. Conferir que mover um fader no painel muda **só** o fone daquele músico.
4. Travar o iPad em Acesso Guiado (iOS) para o músico não sair do app.

---

## 9. Checklist de testes

- [ ] `ping` da mesa < 5 ms; do iPad ao bridge < 20 ms.
- [ ] Bridge reconecta sozinho depois de desligar/religar a mesa.
- [ ] Fader do painel move o send correto (confirmar na tela da mesa).
- [ ] Mute do painel não muta o canal no PA.
- [ ] VU sobe em todos os 15 canais; silêncio → medidor zera em ~1 s.
- [ ] Peak hold segura ~1,2 s e cai.
- [ ] Dois painéis no mesmo bus ficam sincronizados.
- [ ] PIN errado é rejeitado pelo servidor (teste com o app offline: `curl`).
- [ ] Token de outro bus não consegue alterar canais (teste de escopo).
- [ ] Painel volta ao estado correto depois de recarregar a página.
- [ ] Bateria do iPad aguenta o evento com a tela ligada (metering consome CPU).

---

## 10. Solução de problemas

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| VU parado em zero | assinatura de meters expirou | reenviar `/batchsubscribe` a cada 9 s |
| VU pula/trava | frames em excesso ou Wi-Fi ruim | reduzir `METER_HZ` para 12–15 |
| VU sempre no topo | conversão linear sem `log10` | usar `linearToPosition` (§5.2) |
| Fader "volta sozinho" | eco do servidor sobrescrevendo o gesto | ignorar `channel:patched` do próprio socket enquanto arrasta |
| Mudança demora ~1 s | sem throttle/otimismo | aplicar UI otimista + throttle 50 ms |
| Mexe no fone errado | `BUS_MAP`/`CHANNEL_MAP` incorreto | revalidar mapa canal a canal |
| Mix muda quando o técnico mexe no PA | bus pós-fader | mudar os buses para Pre-Fader |
| Mesa para de responder | `/xremote` não renovado | keep-alive de 8 s (§3.1) |
| Erro de CORS no navegador | origem não liberada | `cors.origin` do Socket.IO com a URL do painel |
| Funciona no Wi-Fi do técnico e não no do músico | AP isolation ligado | desativar isolamento de clientes |

---

## Referência rápida de eventos

| Evento | Direção | Payload |
| --- | --- | --- |
| `mixer:state` | servidor → painel | `{ channels, master }` (snapshot ao conectar) |
| `meters` | servidor → painel | `{ t, ch: { [id]: { level, peak } } }` a 15–20 Hz |
| `channel:update` | painel → servidor | `{ channelId, volume?, pan?, mute?, solo? }` |
| `channel:patched` | servidor → painéis | eco confirmado da alteração |
| `master:update` | painel → servidor | `{ volume }` |
| `session:expired` | servidor → painel | `{}` — painel volta à tela de PIN |

O contrato completo, com códigos HTTP e erros, está em
[`monitor-console-endpoints.md`](./monitor-console-endpoints.md).
