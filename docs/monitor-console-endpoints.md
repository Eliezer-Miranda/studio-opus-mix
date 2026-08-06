# Monitor Console — Contrato de API e Eventos

Documento de integração entre o app (React) e o servidor do mixer.
Todos os payloads são JSON. IDs são strings estáveis (`busId`, `channelId`).

Versão: 1.0 · Transporte: HTTP (REST) para sessão/config, Socket.IO para tempo real.

---

## 1. Modelo de dados

```ts
type ChannelKind = "live" | "backing";

interface MixerBus {          // um mix de monitoração (um músico)
  id: string;                 // "bateria"
  name: string;               // "Bateria"
  icon: "drum" | "guitar" | "mic" | "speech" | "piano" | "disc";
  channelCount: number;
}

interface MixerChannel {
  id: string;                 // "kick"
  name: string;               // "Kick"
  kind: ChannelKind;          // "backing" não expõe PAN na UI
  volume: number;             // 0..100 (posição do fader)
  pan: number;                // -50..50 (apenas kind === "live")
  mute: boolean;
  solo: boolean;
  level: number;              // 0..100 (somente leitura, medidor)
}
```

Conversão usada na UI: `dB = round(volume/100 * 70 - 60)`, faixa `-60 dB .. +10 dB`.
`volume = 0` é exibido como `-∞`.

---

## 2. Autenticação por PIN

O PIN existe para o músico não abrir/alterar o mix de outra pessoa por engano.

> **Regra de segurança:** o PIN NUNCA é validado no navegador. Hoje o app usa PINs
> mock (`src/hooks/use-mixer-state.ts`); ao integrar, apenas troque o corpo de
> `authenticate()` pela chamada abaixo. O contrato (`(busId, pin) => boolean`)
> permanece igual.

### `POST /api/public/session/auth`

Request:
```json
{ "busId": "bateria", "pin": "1111", "deviceId": "ipad-palco-03" }
```

Resposta `200`:
```json
{
  "ok": true,
  "token": "eyJhbGciOi...",
  "busId": "bateria",
  "expiresAt": "2026-08-06T23:59:00Z",
  "role": "musician"
}
```

Resposta `401`:
```json
{ "ok": false, "error": "INVALID_PIN", "retryAfterMs": 0 }
```

Regras:
- PIN de 4 dígitos, armazenado com hash (bcrypt/argon2) — nunca em texto puro.
- Rate limit: 5 tentativas por `deviceId` + `busId` a cada 60 s; em seguida
  `429` com `retryAfterMs`.
- O token é escopado a **um** `busId`. Trocar de músico exige novo PIN.
- Papel `engineer` (PIN mestre) recebe `role: "engineer"` e pode escrever em
  qualquer bus, incluindo o fader Master.

### `POST /api/public/session/lock`
Invalida o token atual (botão “Bloquear” do cabeçalho). Resposta `204`.

### `POST /api/session/pin` *(somente `role: "engineer"`)*
```json
{ "busId": "vozes", "pin": "4444" }
```
Redefine o PIN de um mix. Resposta `204`.

---

## 3. REST — configuração

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/buses` | token | Lista de mixes disponíveis (`MixerBus[]`) |
| GET | `/api/mixes/:busId` | token do bus | Snapshot completo do mix |
| PATCH | `/api/mixes/:busId/channels/:channelId` | token do bus | Fallback HTTP quando o socket cai |
| GET | `/api/health` | pública | `{ "status": "ok", "sampleRate": 48000 }` |

`GET /api/mixes/:busId` → `200`:
```json
{
  "busId": "bateria",
  "master": 82,
  "channels": [
    { "id": "kick", "name": "Kick", "kind": "live", "volume": 78,
      "pan": 0, "mute": false, "solo": false, "level": 62 }
  ]
}
```

`PATCH .../channels/:channelId` aceita patch parcial:
```json
{ "volume": 74 }
```
Campos aceitos: `volume`, `pan`, `mute`, `solo`. Qualquer outro campo → `400`.
`pan` em canal `backing` → `422 PAN_NOT_SUPPORTED`.

---

## 4. Socket.IO — tempo real

Conexão:
```ts
const socket = io(SERVER_URL, {
  auth: { token },            // token retornado no /session/auth
  transports: ["websocket"],
});
```
Namespace: `/monitor`. Sala automática: `bus:{busId}`.

### Eventos do servidor → cliente

| Evento | Payload | Uso na UI |
|---|---|---|
| `mixer:state` | `{ busId, master, channels: MixerChannel[] }` | Snapshot inicial e re-sync após reconexão |
| `channel:changed` | `{ busId, channelId, patch }` | Aplica mudança feita por outro dispositivo |
| `master:changed` | `{ busId, volume }` | Atualiza fader Master |
| `meters` | `{ busId, levels: { [channelId]: number } }` | Medidores; enviar ~10–20 Hz, sem persistir |
| `session:revoked` | `{ reason: "LOCKED" \| "EXPIRED" \| "ENGINEER" }` | Volta para a tela de PIN |

### Eventos do cliente → servidor

| Evento | Payload | ACK |
|---|---|---|
| `channel:update` | `{ channelId, patch: { volume?, pan?, mute?, solo? } }` | `{ ok: true }` ou `{ ok: false, error }` |
| `master:update` | `{ volume: number }` | idem |
| `mix:subscribe` | `{ busId }` | `{ ok, state }` |
| `session:heartbeat` | `{}` | mantém o token vivo |

Exemplo de escrita:
```ts
socket.emit("channel:update", { channelId: "kick", patch: { volume: 74 } });
```

### Regras de consistência
- **Optimistic UI:** a interface aplica o valor localmente e reconcilia com o
  próximo `channel:changed`/`mixer:state`.
- **Throttle:** o cliente envia no máximo 1 evento a cada 50 ms por canal
  durante o arraste do fader, e sempre um evento final no `pointerup`.
- **Autoridade:** o servidor é a fonte da verdade; divergências são corrigidas
  pelo `mixer:state`.
- **Reconexão:** ao reconectar, emitir `mix:subscribe` e substituir o estado local.

---

## 5. Códigos de erro

| Código | HTTP | Significado |
|---|---|---|
| `INVALID_PIN` | 401 | PIN incorreto |
| `RATE_LIMITED` | 429 | Muitas tentativas de PIN |
| `TOKEN_EXPIRED` | 401 | Sessão expirada — pedir PIN novamente |
| `FORBIDDEN_BUS` | 403 | Token não pertence ao `busId` solicitado |
| `PAN_NOT_SUPPORTED` | 422 | PAN em canal de backing track |
| `OUT_OF_RANGE` | 400 | `volume` fora de 0..100 ou `pan` fora de -50..50 |

---

## 6. Onde ligar no código

| Arquivo | Ponto de integração |
|---|---|
| `src/hooks/use-mixer-state.ts` | `authenticate()` → `POST /session/auth`; `lock()` → `POST /session/lock`; `patchChannel()` → `socket.emit("channel:update")`; `setChannels()` alimentado por `mixer:state` / `meters` |
| `src/components/mixer/pin-lock.tsx` | Recebe `onSubmit(pin) => Promise<boolean>` — já é assíncrono |
| `src/components/mixer/channel-strip.tsx` | Componente controlado; não precisa mudar |
| `src/components/mixer/vertical-fader.tsx` | Aplicar o throttle de 50 ms aqui, se desejado |

Os componentes de UI são todos controlados (valor via props, mudança via
callback), então a troca do estado mock pelo socket não exige alterações visuais.
