import { NextRequest, NextResponse } from "next/server";
import { agentPost } from "@/lib/agentProxy";
import { runTerminalFallback } from "@/lib/server/terminalFallback";

type CommandPayload = {
  cmd?: unknown;
  args?: unknown;
};

function normalizeTerminalResult(cmdRaw: string, result: { ok: boolean; output: string }) {
  const cmd = cmdRaw.trim().toLowerCase();
  if (result.ok) {
    return result;
  }

  if (cmd === "tracert" && /Tracing route to/i.test(result.output)) {
    return { ...result, ok: true };
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CommandPayload;
    const cmd = typeof body.cmd === "string" ? body.cmd : "";
    const args = typeof body.args === "string" ? body.args : "";
    try {
      const result = await agentPost<{ ok: boolean; output: string }>("/terminal/run", { cmd, args });
      return NextResponse.json(normalizeTerminalResult(cmd, result));
    } catch (agentError) {
      const message = agentError instanceof Error ? agentError.message : "";
      if (/Local Agent is unreachable|fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT/i.test(message)) {
        const fallbackResult = await runTerminalFallback(cmd, args);
        return NextResponse.json(normalizeTerminalResult(cmd, fallbackResult), {
          headers: { "X-NetPulse-Data-Source": "fallback-local" },
        });
      }
      throw agentError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terminal command failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
