
import dgram from "node:dgram";
import { randomUUID } from "node:crypto";

export type OnvifCameraInfo = {
  manufacturer?: string;
  model?: string;
};

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function getTag(xml: string, tag: string): string {
  const match = xml.match(
    new RegExp(
      `<(?:(?:\\w+):)?${tag}[^>]*>([\\s\\S]*?)<\\/(?:(?:\\w+):)?${tag}>`,
      "i",
    ),
  );

  return match ? decodeXml(match[1]) : "";
}

function getScopeValue(
  scopes: string,
  key: string,
): string | undefined {
  const match = scopes.match(
    new RegExp(
      `(?:^|\\s)onvif://www\\.onvif\\.org/${key}/([^\\s]+)`,
      "i",
    ),
  );

  if (!match) return undefined;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function isPrivateIPv4(ip: string): boolean {
  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
}

/**
 * Discovers ONVIF devices on the local network using WS-Discovery.
 * Does not attempt login or access video streams.
 */
export function discoverOnvifCameras(
  timeoutMs = 1800,
): Promise<Map<string, OnvifCameraInfo>> {
  return new Promise((resolve) => {
    const found = new Map<string, OnvifCameraInfo>();
    const socket = dgram.createSocket({
      type: "udp4",
      reuseAddr: true,
    });

    let finished = false;

    const finish = () => {
      if (finished) return;

      finished = true;
      clearTimeout(timer);

      try {
        socket.close();
      } catch {
        // Socket may already be closed.
      }

      resolve(found);
    };

    const timer = setTimeout(finish, timeoutMs);

    socket.on("error", () => finish());

    socket.on("message", (message, remote) => {
      const xml = message.toString("utf8");

      if (!/ProbeMatch/i.test(xml)) return;

      const scopes = getTag(xml, "Scopes");
      const xaddrs = getTag(xml, "XAddrs");

      let ip = remote.address;

      if (xaddrs) {
        try {
          const address = new URL(xaddrs.split(/\s+/)[0]);

          if (isPrivateIPv4(address.hostname)) {
            ip = address.hostname;
          }
        } catch {
          // Use the sender IP if XAddrs cannot be parsed.
        }
      }

      if (!isPrivateIPv4(ip)) return;

      found.set(ip, {
        manufacturer: getScopeValue(scopes, "manufacturer"),
        model:
          getScopeValue(scopes, "model") ||
          getScopeValue(scopes, "hardware"),
      });
    });

    socket.bind(0, () => {
      const probe = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope
 xmlns:e="http://www.w3.org/2003/05/soap-envelope"
 xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
 xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
 xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
 <e:Header>
  <w:MessageID>urn:uuid:${randomUUID()}</w:MessageID>
  <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
  <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
 </e:Header>
 <e:Body>
  <d:Probe>
   <d:Types>dn:NetworkVideoTransmitter</d:Types>
  </d:Probe>
 </e:Body>
</e:Envelope>`;

      socket.send(
        Buffer.from(probe),
        3702,
        "239.255.255.250",
        (error) => {
          if (error) finish();
        },
      );
    });
  });
}
