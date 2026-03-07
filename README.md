# NetPulse

NetPulse is a **Windows-first local network monitoring dashboard** built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

It combines a modern web UI with a secure local Windows agent so you can inspect your LAN, run speed tests, monitor activity, and generate reports from one place.

---

## Documentation Language

- English: this file (`README.md`)
- Shqip (Albanian): [`README.sq.md`](README.sq.md)

---

## Quick Start

If you just want to run NetPulse quickly:

1. Clone and install
```bash
git clone https://github.com/Dionuk1/First-Repository-Net-Pulse-app.git
cd First-Repository-Net-Pulse-app
npm install
cd local-agent
npm install
cd ..
```

2. Create `.env.local` in the project root
```env
NETPULSE_AGENT_URL=http://127.0.0.1:5055
NETPULSE_TOKEN=change-me-local-token
```

3. Start the local agent (terminal 1)
```bash
cd local-agent
npm run dev
```

4. Start the web app (terminal 2)
```bash
npm run dev
```

5. Open in browser
- `http://localhost:3000`
- Speed test page: `http://localhost:3000/speedtest`

---

## What NetPulse Does

NetPulse helps you:
- See live network details (SSID, local IP, gateway, DNS)
- Scan local devices on your LAN
- Track network activity and device state changes
- Run real Ookla CLI speed tests
- Use a secure allowlisted terminal
- View trust score indicators and recommendations
- Generate advanced local reports

---

## Current Features

### Core Dashboard
- Home overview with live network/trust sections
- Dark security-style UI
- Language + theme controls

### Device & Activity Monitoring
- Manual / scheduled local device scans
- Activity feed with event snapshots
- Device-focused API routes for scan, ping, vendor/os/ports integration

### Speed Test
- Real speed test execution via `POST /api/speedtest/run`
- Ookla CLI JSON parsing (download/upload/ping/jitter/packet loss/etc.)
- Speed history saved in local SQLite DB
- Custom GO-style speed test UI and rocket/space animation flow

### Secure Terminal
- Allowlisted command execution only (proxied through local agent)

### Local Agent (Windows)
- Lightweight Node.js + TypeScript HTTP server
- Binds to `127.0.0.1:5055`
- Token-protected endpoints (`X-NETPULSE-TOKEN`)
- Rate limiting and localhost-only checks

---

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- SQLite (`node:sqlite`)
- Framer Motion (GO button/ring animations)
- Lottie React (available in project)
- Local Agent: Node.js + TypeScript

---

## Clone the Project

```bash
git clone https://github.com/Dionuk1/First-Repository-Net-Pulse-app.git
cd First-Repository-Net-Pulse-app
```

---

## Prerequisites

### Required
- Windows 10/11
- Node.js 20+ (recommended: latest LTS)
- npm

### Optional but recommended
- Ookla Speedtest CLI (`speedtest.exe`)

NetPulse tries these locations automatically:
1. `NETPULSE_SPEEDTEST_BIN` env var
2. `./ookla-speedtest-1.2.0-win64/speedtest.exe`
3. Any `./ookla-speedtest*/speedtest.exe`
4. `C:\Tools\speedtest\speedtest.exe`

---

## Install Dependencies

From project root:

```bash
npm install
```

For local agent:

```bash
cd local-agent
npm install
cd ..
```

---

## Environment Setup

Create `.env.local` in project root:

```env
NETPULSE_AGENT_URL=http://127.0.0.1:5055
NETPULSE_TOKEN=change-me-local-token
# Optional:
# NETPULSE_SPEEDTEST_BIN=C:\Path\To\speedtest.exe
```

The same token must be used by the local agent.

---

## Run the App

### 1) Start local agent (terminal 1)

```bash
cd local-agent
npm run dev
```

### 2) Start NetPulse web app (terminal 2)

```bash
npm run dev
```

Open:
- `http://localhost:3000`
- Speed views:
  - `http://localhost:3000/speed`
  - `http://localhost:3000/speedtest`

---

## Build for Production

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

## Local Agent Endpoints

Base: `http://127.0.0.1:5055`

Public:
- `GET /health`

Token required (`X-NETPULSE-TOKEN`):
- `GET /network/info`
- `GET /scan/devices`
- `GET /scan/ports?ip=...&range=...`
- `GET /scan/os?ip=...`
- `GET /scan/vendor?mac=...`
- `GET /ping?host=...`
- `POST /terminal/run`

---

## Project Structure

```text
netpulse-web/
  app/
    api/                  # Next.js API routes (proxy + app services)
    activity/             # Activity page
    devices/              # Devices page
    report/               # Report page
    settings/             # Settings page
    speed/                # Speed page
    speedtest/            # GO-style speedtest page
    terminal/             # Terminal page
    layout.tsx            # Root layout
    page.tsx              # Home page
  components/
    GoSpeedtestButton.tsx # Animated GO button
    RocketOverlay.tsx     # Premium rocket overlay animation
    StarshipCanvas.tsx    # Canvas starship animation
    ...                   # UI building blocks
  lib/
    api.ts                # Client API helpers
    agentProxy.ts         # Server-to-agent proxy helpers
    windowsNetwork.ts     # Windows network utilities/fallbacks
    server/db.ts          # SQLite persistence
    ...                   # i18n/settings/trust/activity logic
  local-agent/
    src/
      index.ts            # Agent server entry
      network.ts          # Network/scan handlers
      terminal.ts         # Allowlisted terminal runner
      oui.ts              # MAC vendor lookup
    package.json
  public/
    animations/
```

---

## Troubleshooting

### `/speed` or `/speedtest` not updating after changes
- Restart dev server and hard refresh browser (`Ctrl+F5`).

### Speed test executable not found
- Place `speedtest.exe` in one of supported paths, or set `NETPULSE_SPEEDTEST_BIN`.

### Agent auth errors
- Ensure `NETPULSE_TOKEN` in web app and local agent match exactly.

### Windows-only behavior
- Some APIs are intentionally Windows-only and will return fallback/error on non-Windows platforms.

---

## Scripts

### Root
- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint codebase

### `local-agent/`
- `npm run dev` - run agent with TSX
- `npm run build` - compile TypeScript
- `npm run start` - run built agent

---

## License

Private project repository. Add a license file if you plan public distribution.
