# NetPulse (Shqip)

NetPulse është një **dashboard lokal për monitorim rrjeti në Windows** i ndërtuar me **Next.js (App Router)**, **TypeScript** dhe **Tailwind CSS**.

## Nisje e Shpejtë

1. Klono projektin dhe instalo varësitë
```bash
git clone https://github.com/Dionuk1/Net-Pulse-app.git
cd Net-Pulse-app
npm install
cd local-agent
npm install
cd ..
```

2. Krijo `.env.local`
```env
NETPULSE_AGENT_URL=http://127.0.0.1:5055
NETPULSE_TOKEN=change-me-local-token
```

3. Nise local agent (terminali 1)
```bash
cd local-agent
npm run dev
```

4. Nise web app (terminali 2)
```bash
npm run dev
```

5. Hape:
- `http://localhost:3000`
- `http://localhost:3000/speedtest`

## Veçoritë
- Detaje live të rrjetit (SSID, IP, gateway, DNS)
- Skanim pajisjesh dhe aktiviteti
- Speed test real me Ookla CLI + histori në SQLite
- Terminal i sigurt me komandat e lejuara
- Trust score dhe raportim
- Local agent me autentikim me token

## Skriptet

Root:
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`

Local agent (`local-agent/`):
- `npm run dev`
- `npm run build`
- `npm run start`
