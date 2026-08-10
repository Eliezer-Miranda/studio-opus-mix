# Midnight Mixer Pro — Servidor Ubuntu + REAPER via OSC (com VU real)

Guia passo a passo para rodar o painel em um **servidor Ubuntu (192.168.2.177)**,
falando com o **REAPER (192.168.2.151)** por **OSC**, com **medidores de VU reais**
de cada canal.

Endereços e portas usados neste guia (fixos, use exatamente estes):

| Peça | Endereço | Porta | Observação |
| --- | --- | --- | --- |
| Servidor Ubuntu (bridge + painel + API) | `192.168.2.177` | **11000** | HTTP + WebSocket + API do app |
| Bridge → REAPER (envio OSC) | `192.168.2.151` | **8200** | "Device port" do REAPER |
| REAPER → Bridge (recebimento OSC) | `192.168.2.177` | **9000** | "Local listen port" do REAPER |

```text
 ┌──────────────────────┐   OSC/UDP 8200   ┌───────────────────────────┐   WS/HTTP 11000   ┌──────────────┐
 │ REAPER               │◄─────────────────│ Ubuntu 192.168.2.177      │◄─────────────────►│ iPad/celular │
 │ 192.168.2.151        │─────────────────►│ bridge + painel (API)     │                   │ dos músicos  │
 └──────────────────────┘   OSC/UDP 9000   └───────────────────────────┘
```

---

## 1. Pré-requisitos

- Ubuntu Server 22.04/24.04 com IP **fixo 192.168.2.177**.
- PC do REAPER com IP **fixo 192.168.2.151**, na mesma sub-rede `192.168.2.0/24`.
- Roteador/AP com **AP isolation desligado** e Wi-Fi 5 GHz para os músicos.
- Node.js 20+ no Ubuntu.

```bash
sudo apt update && sudo apt install -y curl git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

### 1.1 IP fixo no Ubuntu (netplan)

```yaml
# /etc/netplan/01-mixer.yaml
network:
  version: 2
  ethernets:
    enp3s0:                      # troque pelo nome real (ip a)
      dhcp4: false
      addresses: [192.168.2.177/24]
      routes:
        - to: default
          via: 192.168.2.1
      nameservers:
        addresses: [192.168.2.1, 1.1.1.1]
```

```bash
sudo netplan apply
ip a | grep 192.168.2.177
ping -c 3 192.168.2.151
```

### 1.2 Firewall

```bash
sudo ufw allow from 192.168.2.0/24 to any port 11000 proto tcp   # painel + WebSocket
sudo ufw allow from 192.168.2.151 to any port 9000 proto udp     # OSC vindo do REAPER
sudo ufw enable && sudo ufw status numbered
```

---

## 2. Configurar o OSC no REAPER (192.168.2.151)

1. `Options → Preferences → Control/OSC/web`.
2. `Add` → **Control surface mode: OSC (Open Sound Control)**.
3. Preencha exatamente:

| Campo | Valor |
| --- | --- |
| Device name | `MidnightMixerPro` |
| Mode | `Configure device IP+local port` |
| Device IP | `192.168.2.177` |
| Device port | `9000` ← para onde o REAPER **envia** |
| Local listen port | `8200` ← onde o REAPER **escuta** o bridge |
| Allow binding messages to REAPER actions | ✅ |

4. Marque **"Send feedback"** / `Device track count` = **32** (ou o número de
   canais do seu projeto) e `Device send count` conforme seus buses de fone.
5. Clique em `(open config directory)` e crie o arquivo de padrão abaixo se quiser
   controlar o *VU pré/pós*; o padrão nativo do REAPER já envia
   `/track/@/vu` quando o track count está configurado.

> Regra de ouro: a **"Device port" do REAPER (8200)** é a porta para onde o
> **bridge envia**. A **"Local listen port"** não é o que o bridge escuta — o
> bridge escuta em **9000**, que é o `Device port` configurado do lado do REAPER
> como destino do feedback. Se o VU não chegar, esses dois estão trocados.

### 2.1 Endereços OSC úteis do REAPER

| Endereço | Direção | Significado |
| --- | --- | --- |
| `/track/N/volume` | escrita | fader do track N (float 0..1, escala REAPER) |
| `/track/N/send/M/volume` | escrita | send do track N para o bus M (o **fone** do músico) |
| `/track/N/pan` | escrita | pan (float 0..1, 0.5 = centro) |
| `/track/N/mute` | escrita | 0/1 |
| `/track/N/solo` | escrita | 0/1 |
| `/track/N/vu` | leitura | **VU real**, float 0..1 (pico do track) |
| `/track/N/vu/L`, `/track/N/vu/R` | leitura | VU por lado, quando estéreo |
| `/track/N/name` | leitura | nome do track |
| `/device/track/count` | escrita | quantos tracks o REAPER deve reportar |

---

## 3. Criar as AOIs (buses de fone) no REAPER

"AOI" aqui = **Area of Interest / bus de monitoração** de cada músico: um track
de destino que recebe **sends pré-fader** de todos os canais.

1. Crie 13 tracks de destino, nesta ordem, logo depois dos canais de entrada:

   `AOI Bateria`, `AOI Baixo`, `AOI Guitarra`, `AOI Violão`, `AOI Teclado 1`,
   `AOI Teclado 2`, `AOI Voz 1`, `AOI Voz 2`, `AOI Voz 3`, `AOI Voz 4`,
   `AOI Ministro`, `AOI Pastor`, `AOI Playback`.

2. Em cada AOI: desmarque `Master/parent send` (para não vazar no PA) e roteie a
   saída para o par de saídas físicas do fone correspondente
   (`Route → Audio Hardware Outputs`).

3. Em **cada canal de entrada**, crie um send para **cada** AOI:
   `Route → Add new send → AOI ...` e mude para **Pre-Fader (Post-FX)**.
   Assim o mix do fone não muda quando o técnico mexe no PA.

Atalho: selecione todos os canais → botão direito → `Route → Add new send` para
o AOI, repetindo por AOI. Salve como **template de projeto**
(`File → Project templates → Save as template`) para não refazer.

### 3.1 Mapa de canais/buses (espelha o app)

Crie este `map.js` no bridge com os números reais do seu projeto REAPER
(1-indexado, na ordem da TCP):

```js
// map.js — id do app -> número do track no REAPER
export const CHANNEL_MAP = {
  vs: 1, click: 2, guias: 3,
  bateria: 4, baixo: 5, guitarra: 6, violao: 7,
  teclado1: 8, teclado2: 9,
  voz1: 10, voz2: 11, voz3: 12, voz4: 13,
  ministro: 14, pastor: 15,
};

// id do bus no app -> índice do SEND dentro de cada canal (1..13)
export const BUS_SEND_INDEX = {
  bateria: 1, baixo: 2, guitarra: 3, violao: 4,
  teclado1: 5, teclado2: 6,
  voz1: 7, voz2: 8, voz3: 9, voz4: 10,
  ministro: 11, pastor: 12, playback: 13,
};

// id do bus -> número do track da AOI (para VU do fone, se quiser)
export const BUS_TRACK = {
  bateria: 16, baixo: 17, guitarra: 18, violao: 19,
  teclado1: 20, teclado2: 21,
  voz1: 22, voz2: 23, voz3: 24, voz4: 25,
  ministro: 26, pastor: 27, playback: 28,
};
```

> A **ordem dos sends** precisa ser idêntica em todos os canais, senão o músico
> mexe no fone do colega. Valide um por um antes do primeiro uso.

---

## 4. O bridge no Ubuntu (porta 11000)

```bash
sudo mkdir -p /opt/mixer-bridge && sudo chown $USER /opt/mixer-bridge
cd /opt/mixer-bridge
npm init -y && npm pkg set type=module
npm i osc socket.io express jsonwebtoken bcryptjs dotenv
```

`/opt/mixer-bridge/.env`:

```dotenv
REAPER_IP=192.168.2.151
REAPER_PORT=8200
OSC_LOCAL_PORT=9000
BRIDGE_PORT=11000
JWT_SECRET=troque-este-segredo
METER_HZ=20
TRACK_COUNT=32
```

### 4.1 Cliente OSC

```js
// osc-client.js
import osc from "osc";
import "dotenv/config";

export const udp = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: Number(process.env.OSC_LOCAL_PORT),   // 9000: escuta o REAPER
  remoteAddress: process.env.REAPER_IP,            // 192.168.2.151
  remotePort: Number(process.env.REAPER_PORT),     // 8200: envia ao REAPER
  metadata: true,
});

udp.open();

udp.on("ready", () => {
  // pede ao REAPER que reporte N tracks (habilita o feedback de VU/nome)
  udp.send({
    address: "/device/track/count",
    args: [{ type: "i", value: Number(process.env.TRACK_COUNT) }],
  });
  console.log(`OSC pronto: ${process.env.REAPER_IP}:${process.env.REAPER_PORT}`);
});

export const send = (address, args = []) => udp.send({ address, args });
```

### 4.2 Escrita (fader/pan/mute do músico)

```js
// writes.js
import { send } from "./osc-client.js";
import { CHANNEL_MAP, BUS_SEND_INDEX } from "./map.js";

const f = (v) => ({ type: "f", value: Math.min(1, Math.max(0, v)) });

export function setSendLevel(busId, channelId, position /* 0..100 */) {
  const t = CHANNEL_MAP[channelId], s = BUS_SEND_INDEX[busId];
  if (!t || !s) return;
  send(`/track/${t}/send/${s}/volume`, [f(position / 100)]);
}

export function setSendPan(busId, channelId, pan /* -50..50 */) {
  const t = CHANNEL_MAP[channelId], s = BUS_SEND_INDEX[busId];
  if (!t || !s) return;
  send(`/track/${t}/send/${s}/pan`, [f((pan + 50) / 100)]);
}

export function setSendMute(busId, channelId, mute) {
  const t = CHANNEL_MAP[channelId], s = BUS_SEND_INDEX[busId];
  if (!t || !s) return;
  send(`/track/${t}/send/${s}/mute`, [{ type: "f", value: mute ? 1 : 0 }]);
}
```

> Nunca escreva em `/track/N/volume` a partir do painel do músico: isso é o fader
> do PA. O painel só mexe em `/track/N/send/M/...`.

---

## 5. VU real de cada canal

O REAPER envia `/track/N/vu` continuamente quando o track count está setado.
O valor é **linear 0..1**; o painel precisa de escala logarítmica.

```js
// meters.js
import { udp } from "./osc-client.js";
import { CHANNEL_MAP } from "./map.js";

export const lastVu = new Map();   // trackNumber -> 0..1

udp.on("message", (msg) => {
  const m = /^\/track\/(\d+)\/vu(?:\/(L|R))?$/.exec(msg.address);
  if (!m) return;
  const track = Number(m[1]);
  const value = Number(msg.args?.[0]?.value ?? msg.args?.[0] ?? 0);
  // estéreo: guarda o maior dos dois lados
  const prev = lastVu.get(track) ?? 0;
  lastVu.set(track, m[2] ? Math.max(prev, value) : value);
});

const FLOOR_DB = -60;
export function linearToPosition(v) {
  if (v <= 1e-7) return 0;
  const db = 20 * Math.log10(v);
  const clamped = Math.max(FLOOR_DB, Math.min(0, db));
  return ((clamped - FLOOR_DB) / -FLOOR_DB) * 100;   // 0..100
}

// ballistics + peak hold (feito no servidor: todos os painéis veem igual)
const st = new Map();
const RELEASE = 0.25, PEAK_HOLD_MS = 1200;
export function ballistics(id, target) {
  const now = Date.now();
  const s = st.get(id) || { level: 0, peak: 0, peakAt: 0 };
  s.level = target > s.level ? target : s.level + (target - s.level) * RELEASE;
  if (target >= s.peak || now - s.peakAt > PEAK_HOLD_MS) { s.peak = target; s.peakAt = now; }
  st.set(id, s);
  return { level: Math.round(s.level), peak: Math.round(s.peak) };
}

export function buildFrame() {
  const ch = {};
  for (const [id, track] of Object.entries(CHANNEL_MAP)) {
    ch[id] = ballistics(id, linearToPosition(lastVu.get(track) ?? 0));
  }
  return { t: Date.now(), ch };
}
```

Faixas de cor já usadas pelo `Meter` do painel (18 segmentos):

| Segmentos | dBFS aprox. | Cor |
| --- | --- | --- |
| 0–12 | -60 a -20 | verde (`--level`) |
| 13–15 | -20 a -8 | amarelo (`--solo`) |
| 16–17 | -8 a 0 | vermelho (`--mute`) |

> **Volume ≠ VU.** O fader é o que o músico manda; o VU é o que o REAPER mede.
> São independentes — não derive um do outro.

---

## 6. Servidor HTTP + Socket.IO na porta 11000

```js
// server.js
import "dotenv/config";
import express from "express";
import http from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { setSendLevel, setSendPan, setSendMute } from "./writes.js";
import { buildFrame } from "./meters.js";
import { PIN_HASHES } from "./pins.js";     // { busId: bcryptHash }

const app = express();
app.use(express.json());
app.use(express.static("dist"));            // build do painel servido na LAN

app.post("/session/auth", async (req, res) => {
  const { busId, pin } = req.body ?? {};
  const hash = PIN_HASHES[busId];
  if (!hash || !(await bcrypt.compare(String(pin), hash)))
    return res.status(401).json({ error: "invalid_pin" });
  const token = jwt.sign({ busId }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.of("/monitor").use((socket, next) => {
  try {
    const { busId } = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
    socket.data.busId = busId;
    next();
  } catch { next(new Error("unauthorized")); }
});

io.of("/monitor").on("connection", (socket) => {
  const { busId } = socket.data;
  socket.join(`bus:${busId}`);

  socket.on("channel:update", ({ channelId, volume, pan, mute }) => {
    if (volume != null) setSendLevel(busId, channelId, volume);
    if (pan != null) setSendPan(busId, channelId, pan);
    if (mute != null) setSendMute(busId, channelId, mute);
    socket.to(`bus:${busId}`).emit("channel:patched", { channelId, volume, pan, mute });
  });
});

setInterval(
  () => io.of("/monitor").emit("meters", buildFrame()),
  1000 / Number(process.env.METER_HZ || 20),
);

server.listen(Number(process.env.BRIDGE_PORT), "0.0.0.0", () =>
  console.log("bridge em http://192.168.2.177:11000"),
);
```

Gerar hashes de PIN:

```bash
node -e "console.log(require('bcryptjs').hashSync('1111',10))"
```

### 6.1 Serviço systemd

```ini
# /etc/systemd/system/mixer-bridge.service
[Unit]
Description=Midnight Mixer Pro bridge
After=network-online.target

[Service]
WorkingDirectory=/opt/mixer-bridge
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
User=mixer
EnvironmentFile=/opt/mixer-bridge/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now mixer-bridge
journalctl -u mixer-bridge -f
```

---

## 7. Publicar o painel no Ubuntu

```bash
cd /opt/midnight-mixer-pro
echo 'VITE_BRIDGE_URL=http://192.168.2.177:11000' > .env
bun install && bun run build
cp -r dist /opt/mixer-bridge/dist
sudo systemctl restart mixer-bridge
```

Os músicos acessam **http://192.168.2.177:11000** e adicionam à tela inicial do
iPad para abrir em tela cheia.

### 7.1 Trocar o mock pelo socket no app

Em `src/hooks/use-mixer-state.ts` (três pontos, e só eles):

```ts
// a) authenticate: POST http://192.168.2.177:11000/session/auth -> guarda o token
// b) patchChannel: setState otimista + socket.emit("channel:update", ...) com throttle 50 ms
// c) apagar o setInterval que simula meters e escutar o evento "meters":
socket.on("meters", ({ ch }) =>
  setChannels((prev) =>
    prev.map((c) => (ch[c.id] ? { ...c, level: ch[c.id].level, peak: ch[c.id].peak } : c)),
  ),
);
```

Detalhes completos desses trechos estão em
[`guia-completo-operacao.md`](./guia-completo-operacao.md) §6.

---

## 8. Testes na rede

```bash
# 1. O REAPER responde?
ping -c 3 192.168.2.151

# 2. O bridge está escutando UDP 9000 e TCP 11000?
sudo ss -lunp | grep 9000
sudo ss -ltnp | grep 11000

# 3. Ver o OSC cru chegando do REAPER (Ctrl+C para sair)
sudo tcpdump -i any -n udp port 9000 -c 20

# 4. Login pelo terminal
curl -s -X POST http://192.168.2.177:11000/session/auth \
  -H 'Content-Type: application/json' \
  -d '{"busId":"bateria","pin":"1111"}'
```

Checklist:

- [ ] `ping` do iPad ao 192.168.2.177 abaixo de 20 ms.
- [ ] `tcpdump` mostra `/track/N/vu` chegando quando há som no REAPER.
- [ ] VU sobe nos 15 canais; silêncio zera o medidor em ~1 s.
- [ ] Peak hold segura ~1,2 s.
- [ ] Fader do painel mexe **só** no send da AOI daquele músico.
- [ ] Token de outro bus não altera canais alheios.
- [ ] `systemctl restart mixer-bridge` reconecta sem reabrir o REAPER.

---

## 9. Solução de problemas

| Sintoma | Causa provável | Correção |
| --- | --- | --- |
| VU parado em zero | `Device track count` = 0 no REAPER | setar 32 na config OSC ou enviar `/device/track/count` |
| Nada chega em UDP 9000 | `Device IP/port` do REAPER apontando errado | Device IP = `192.168.2.177`, Device port = `9000` |
| Painel abre mas não controla | bridge envia para porta errada | `REAPER_PORT=8200` (= Local listen port do REAPER) |
| VU sempre no topo | falta de `log10` | usar `linearToPosition` (§5) |
| VU pula/trava | Wi-Fi ruim ou taxa alta | `METER_HZ=12` |
| Músico mexe no fone errado | ordem dos sends diferente entre canais | revalidar `BUS_SEND_INDEX` canal a canal |
| Mix muda quando o técnico mexe no PA | sends pós-fader | mudar todos para **Pre-Fader (Post-FX)** |
| Erro de CORS | origem não liberada | servir o `dist` pelo próprio bridge (§7) |
| Conexão recusada na 11000 | firewall | `sudo ufw allow from 192.168.2.0/24 to any port 11000 proto tcp` |
| Funciona no Wi-Fi do técnico e não no do músico | AP isolation | desativar isolamento de clientes no AP |
