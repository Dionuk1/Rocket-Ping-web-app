# NetPulse (English)

NetPulse is a **Windows-first local network monitoring dashboard** built with **Next.js (App Router)**, **TypeScript**, and **Tailwind CSS**.

## Quick Start

1. Clone and install
```bash
git clone https://github.com/Dionuk1/Net-Pulse-app.git
cd Net-Pulse-app
npm install
cd local-agent
npm install
cd ..
```

2. Create `.env.local`
```env
NETPULSE_AGENT_URL=http://127.0.0.1:5055
NETPULSE_TOKEN=change-me-local-token
```

3. Start local agent (terminal 1)
```bash
cd local-agent
npm run dev
```

4. Start web app (terminal 2)
```bash
npm run dev
```

5. Open:
- `http://localhost:3000`
- `http://localhost:3000/speedtest`

## Features
- Live network details (SSID, IP, gateway, DNS)
- Device scan and activity feed
- Ookla CLI speed test + SQLite history
- Secure allowlisted terminal
- Trust score and reporting
- Local agent with token auth

## Scripts

Root:
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

Local agent (`local-agent/`):
- `npm run dev`
- `npm run build`
- `npm run start`
