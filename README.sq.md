# RocketPing

RocketPing është një **dashboard lokal për monitorim rrjeti në Windows** i ndërtuar me **Next.js (App Router)**, **TypeScript** dhe **Tailwind CSS**.

Ai kombinon një UI moderne në web me një agjent lokal të sigurt në Windows, që të mund të inspektoni LAN-in, të kryeni speed test, të monitoroni aktivitetin dhe të gjeneroni raporte nga një vend i vetëm.

---

## Gjuha e Dokumentimit

- Anglisht: [`README.md`](README.md)
- Shqip: ky dokument (`README.sq.md`)

---

## Çfarë Bën RocketPing

RocketPing ju ndihmon të:
- shihni detaje live të rrjetit (SSID, IP lokale, gateway, DNS)
- skanoni pajisjet në LAN
- ndiqni aktivitetin e rrjetit dhe ndryshimet e gjendjes së pajisjeve
- ekzekutoni speed test real me Ookla CLI
- përdorni terminal të sigurt me komanda të lejuara
- shihni tregues të trust score dhe rekomandime
- gjeneroni raporte të avancuara lokale

---

## Veçoritë Aktuale

### Dashboard Kryesor
- Pamje kryesore me informacione live për rrjetin/trust score
- UI e errët me stil security
- Kontroll i gjuhës dhe temës
- Mbështetje gjuhësore në UI: **Anglisht (`en`)** dhe **Shqip (`sq`)**

### Monitorimi i Pajisjeve dhe Aktivitetit
- Skanime manuale / të planifikuara të pajisjeve lokale
- Activity feed me event snapshots
- API route për scan, ping, vendor/os/ports

### Speed Test
- Ekzekutim real përmes `POST /api/speedtest/run`
- Parsim JSON nga Ookla CLI (download/upload/ping/jitter/packet loss, etj.)
- Historik speed test i ruajtur në SQLite lokale
- UI e personalizuar me GO button dhe animacione rocket/space

### Terminal i Sigurt
- Ekzekutim komandash vetëm nga allowlist (përmes local agent)

### Local Agent (Windows)
- HTTP server i lehtë me Node.js + TypeScript
- Binds vetëm në `127.0.0.1:5055`
- Endpoints të mbrojtura me token (`X-ROCKETPING-TOKEN`)
- Rate limiting dhe kontroll localhost-only

---

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- SQLite (`node:sqlite`)
- Framer Motion (animacione GO button/ring)
- Lottie React (i disponueshëm në projekt)
- Local Agent: Node.js + TypeScript

---

## Klonimi i Projektit

```bash
git clone https://github.com/Dionuk1/Net-Pulse-app.git
cd Net-Pulse-app
```

---

## Parakushtet

### Të detyrueshme
- Windows 10/11
- Node.js 20+ (rekomandohet LTS më i fundit)
- npm

### Opsionale (të rekomanduara)
- Ookla Speedtest CLI (`speedtest.exe`)

RocketPing provon automatikisht këto lokacione:
1. variabla `ROCKETPING_SPEEDTEST_BIN`
2. `./ookla-speedtest-1.2.0-win64/speedtest.exe`
3. çdo `./ookla-speedtest*/speedtest.exe`
4. `C:\Tools\speedtest\speedtest.exe`

---

## Instalimi i Varësive

Nga root i projektit:

```bash
npm install
```

Për local agent:

```bash
cd local-agent
npm install
cd ..
```

---

## Konfigurimi i Environment

Krijo `.env.local` në root të projektit:

```env
ROCKETPING_AGENT_URL=http://127.0.0.1:5055
ROCKETPING_TOKEN=change-me-local-token
# Opsionale:
# ROCKETPING_SPEEDTEST_BIN=C:\Path\To\speedtest.exe
```

I njëjti token duhet të përdoret edhe nga local agent.

---

## Nisja e Aplikacionit

### 1) Nis local agent (terminali 1)

```bash
cd local-agent
npm run dev
```

### 2) Nis RocketPing web app (terminali 2)

```bash
npm run dev
```

Hape në browser:
- `http://localhost:3000`
- pamje speed:
  - `http://localhost:3000/speed`
  - `http://localhost:3000/speedtest`

---

## Build për Production

### Web app
```bash
npm run build
npm start
```

### Local agent
```bash
cd local-agent
npm run build
npm run start
```

---

## Endpoint-et e Local Agent

Base: `http://127.0.0.1:5055`

Publike:
- `GET /health`

Kërkojnë token (`X-NETPULSE-TOKEN`):
- `GET /network/info`
- `GET /scan/devices`
- `GET /scan/ports?ip=...&range=...`
- `GET /scan/os?ip=...`
- `GET /scan/vendor?mac=...`
- `GET /ping?host=...`
- `POST /terminal/run`

---

## Statusi i Projektit

- Zhvillim aktiv lokal
- Veçoritë kryesore janë implementuar dhe integruar
- Iterim i vazhdueshëm në UI/animacione
- Fokus në runtime Windows-first

---

## Pse Local Agent?

NetPulse përdor local agent për të ekzekutuar operacione të rrjetit/sistemit në Windows në mënyrë më të sigurt dhe më të qëndrueshme, krahasuar me ekzekutimin direkt të komandave në web routes.

Përfitimet:
- Izolon ekzekutimin e komandave të nivelit OS nga logjika e UI
- Centralizon validimin e komandave dhe allowlist
- Rrit qëndrueshmërinë për mjetet Windows-specific (scan/ping/terminal/network info)
- E mban web app më të pastër duke përdorur proxy routes

---

## Shënime Sigurie

- Agent bind vetëm në `127.0.0.1` (localhost-only)
- Header token i detyrueshëm për route të mbrojtura:
  - `X-ROCKETPING-TOKEN`
- Endpoint i terminalit përdor command allowlist
- Input validation dhe output sanitization aplikohen në route të agent-it
- Rate limiting bazik është aktiv në local agent
- Mbajeni `.env.local` private dhe mos commit secrets/token real

---

## Struktura e Projektit

```text
netpulse-web
|-- app
|   |-- api
|   |   |-- activity/snapshot/route.ts
|   |   |-- network/info/route.ts
|   |   |-- ping/route.ts
|   |   |-- report/advanced/route.ts
|   |   |-- scan
|   |   |   |-- devices/route.ts
|   |   |   |-- os/route.ts
|   |   |   |-- ports/route.ts
|   |   |   `-- vendor/route.ts
|   |   |-- speed/history/route.ts
|   |   |-- speed/ookla/route.ts
|   |   |-- speedtest/run/route.ts
|   |   |-- terminal/run/route.ts
|   |   `-- trust/live/route.ts
|   |-- activity/page.tsx
|   |-- devices/page.tsx
|   |-- report/page.tsx
|   |-- settings/page.tsx
|   |-- speed/page.tsx
|   |-- speedtest/page.tsx
|   |-- terminal/page.tsx
|   |-- layout.tsx
|   `-- page.tsx
|-- components
|   |-- GoSpeedtestButton.tsx
|   |-- RocketOverlay.tsx
|   |-- StarshipCanvas.tsx
|   |-- AppControls.tsx
|   |-- SidebarNav.tsx
|   `-- ...
|-- lib
|   |-- api.ts
|   |-- agentProxy.ts
|   |-- windowsNetwork.ts
|   |-- trustScore.ts
|   |-- activityLogic.ts
|   `-- server/db.ts
|-- local-agent
|   |-- src
|   |   |-- index.ts
|   |   |-- network.ts
|   |   |-- terminal.ts
|   |   |-- oui.ts
|   |   |-- config.ts
|   |   `-- utils.ts
|   |-- package.json
|   `-- tsconfig.json
|-- public
|   `-- animations
|-- package.json
`-- README.md
```

---

## Zgjidhja e Problemeve

### `/speed` ose `/speedtest` nuk përditësohet pas ndryshimeve
- Rinise dev server dhe bëj hard refresh në browser (`Ctrl+F5`).

### Nuk gjendet `speedtest.exe`
- Vendose `speedtest.exe` në një nga path-et e mbështetura ose vendos `NETPULSE_SPEEDTEST_BIN`.

### Probleme me auth të agent-it
- Verifiko që `NETPULSE_TOKEN` në web app dhe local agent të jetë i njëjtë.

### Sjellje Windows-only
- Disa API janë qëllimisht vetëm për Windows dhe kthejnë fallback/error në platforma të tjera.

---

## Skriptet

### Root
- `npm run dev` - nis Next.js dev server
- `npm run build` - build për production
- `npm run start` - nis production server
- `npm run lint` - lint i codebase

### `local-agent/`
- `npm run dev` - nis agent me TSX
- `npm run build` - kompilon TypeScript
- `npm run start` - nis agent-in e build-uar

---

## Licenca

Ky projekt licencohet me **MIT License**.

Shiko [LICENSE](LICENSE) për detajet e plota.

---

## Kontributi

Kontributet janë të mirëpritura! Nëse doni ta përmirësoni NetPulse:

- Fork repository
- Krijo branch të ri:
  `git checkout -b feature/your-feature-name`
- Bëj ndryshimet dhe commit:
  `git commit -m "Add new feature or improvement"`
- Shtyje branch-in në fork-un tënd
- Hape një Pull Request

---

## Kontakt

Projekti është i hapur për përmirësime dhe kontribute të reja.

Për bashkëpunim, sugjerime ose pyetje:

Email: [dukshini123@gmail.com](mailto:dukshini123@gmail.com)
