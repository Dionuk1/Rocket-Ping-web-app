"use client";

import { useMemo, useState } from "react";
import AnimatedButton from "@/components/AnimatedButton";
import Card from "@/components/Card";
import { Send, TerminalSquare } from "lucide-react";
import { runTerminalCommand, type TerminalCommand } from "@/lib/api";
import useSettings from "@/lib/useSettings";

type LogItem = {
  id: string;
  command: string;
  output: string;
  ok: boolean;
  createdAt: number;
};

const quickCommands: Array<{ label: string; cmd: TerminalCommand; args?: string }> = [
  { label: "ipconfig", cmd: "ipconfig" },
  { label: "arp", cmd: "arp" },
  { label: "netstat", cmd: "netstat" },
  { label: "ping 1.1.1.1", cmd: "ping", args: "1.1.1.1" },
  { label: "tracert 8.8.8.8", cmd: "tracert", args: "8.8.8.8" },
  { label: "nslookup cloudflare.com", cmd: "nslookup", args: "cloudflare.com" },
];

function parseInput(input: string): { cmd: TerminalCommand; args: string } | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const [rawCmd, ...rest] = trimmed.split(/\s+/);
  const cmd = rawCmd.toLowerCase();
  if (!["ping", "tracert", "nslookup", "ipconfig", "arp", "netstat"].includes(cmd)) {
    return null;
  }

  return { cmd: cmd as TerminalCommand, args: rest.join(" ") };
}

export default function TerminalPage() {
  const { settings } = useSettings();
  const isSq = settings.language === "sq";
  const ui = isSq
    ? {
        invalidCmd: "Komandat e lejuara: ping, tracert, nslookup, ipconfig, arp, netstat.",
        commandFailed: "Komanda dështoi.",
        title: "Terminali",
        allowlist: "Lista e komandave të lejuara: ping, tracert, nslookup, ipconfig, arp, netstat",
        placeholder: "p.sh. ping 1.1.1.1",
        quick: "Komanda të Shpejta",
        noOutput: "Nuk ka ende rezultat komande.",
        ok: "OK",
        error: "Gabim",
      }
    : {
        invalidCmd: "Allowed commands: ping, tracert, nslookup, ipconfig, arp, netstat.",
        commandFailed: "Command failed.",
        title: "Terminal",
        allowlist: "Secure terminal allowlist enabled: ping, tracert, nslookup, ipconfig, arp, netstat",
        placeholder: "e.g. ping 1.1.1.1",
        quick: "Quick Commands",
        noOutput: "No command output yet.",
        ok: "OK",
        error: "Error",
      };

  const [input, setInput] = useState("ipconfig");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  const canSubmit = useMemo(() => parseInput(input) != null, [input]);

  const submit = async () => {
    if (running) {
      return;
    }

    const parsed = parseInput(input);
    if (!parsed) {
      setErrorText(ui.invalidCmd);
      return;
    }

    setRunning(true);
    setErrorText(null);

    try {
      const result = await runTerminalCommand(parsed.cmd, parsed.args);
      setLogs((current) => [
        {
          id: `log-${Date.now()}`,
          command: `${parsed.cmd}${parsed.args ? ` ${parsed.args}` : ""}`,
          output: result.output,
          ok: result.ok,
          createdAt: Date.now(),
        },
        ...current,
      ].slice(0, 30));
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : ui.commandFailed);
    } finally {
      setRunning(false);
    }
  };

  const runQuick = (command: TerminalCommand, args = "") => {
    setInput(`${command}${args ? ` ${args}` : ""}`);
    void (async () => {
      if (running) {
        return;
      }
      setRunning(true);
      setErrorText(null);
      try {
        const result = await runTerminalCommand(command, args);
        setLogs((current) => [
          {
            id: `log-${Date.now()}`,
            command: `${command}${args ? ` ${args}` : ""}`,
            output: result.output,
            ok: result.ok,
            createdAt: Date.now(),
          },
          ...current,
        ].slice(0, 30));
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : ui.commandFailed);
      } finally {
        setRunning(false);
      }
    })();
  };

  return (
    <main className="space-y-5 pb-4 md:space-y-6 md:pb-8">
      <header className="pt-2 text-center md:text-left">
        <h1 className="text-[46px] font-bold text-white sm:text-[36px]">{ui.title}</h1>
      </header>

      <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
        <p className="mb-3 text-sm text-white/60">{ui.allowlist}</p>
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={ui.placeholder}
            className="h-12 flex-1 rounded-xl border border-[color:var(--np-border)] bg-[color:var(--np-surface)] px-3 font-mono text-sm text-white outline-none focus:border-[color:var(--np-primary)]"
          />
          <AnimatedButton
            variant="primary"
            className="flex h-12 w-12 items-center justify-center rounded-xl"
            onClick={() => void submit()}
            disabled={running || !canSubmit}
            loading={running}
          >
            <Send size={18} className="text-white" />
          </AnimatedButton>
        </div>
        {errorText && <p className="mt-2 text-xs text-[color:var(--np-danger)]">{errorText}</p>}
      </Card>

      <section>
        <p className="mb-2 flex items-center gap-2 text-[30px] text-white/50 sm:text-[22px]"><TerminalSquare size={18} className="text-[color:var(--np-primary)]" />{ui.quick}</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {quickCommands.map((item) => (
            <AnimatedButton
              key={item.label}
              variant="ghost"
              className="rounded-xl px-3 py-2 text-xs text-white/80"
              onClick={() => runQuick(item.cmd, item.args ?? "")}
              disabled={running}
            >
              {item.label}
            </AnimatedButton>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        {logs.length === 0 && (
          <Card className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
            <p className="text-sm text-white/60">{ui.noOutput}</p>
          </Card>
        )}

        {logs.map((log) => (
          <Card key={log.id} className="border-[color:var(--np-border)] bg-[color:var(--np-card)] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-xs text-white/80">$ {log.command}</p>
              <p className={`text-xs ${log.ok ? "text-[color:var(--np-accent)]" : "text-[color:var(--np-warn)]"}`}>
                {log.ok ? ui.ok : ui.error}
              </p>
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 font-mono text-xs text-white/80">
              {log.output}
            </pre>
            <p className="mt-2 text-[11px] text-white/45">{new Date(log.createdAt).toLocaleString()}</p>
          </Card>
        ))}
      </section>
    </main>
  );
}
