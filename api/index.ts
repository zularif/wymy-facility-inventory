import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { IncomingMessage, ServerResponse } from "http";

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let appHandler: NodeHandler | null = null;
let initError: string | null = null;

try {
  const { default: app } = await import("../artifacts/api-server/src/app");
  appHandler = app as unknown as NodeHandler;
} catch (err: unknown) {
  initError = err instanceof Error ? err.stack ?? err.message : String(err);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (initError || !appHandler) {
    res.status(500).json({ error: "Init failed", detail: initError });
    return;
  }
  return appHandler(req, res);
}
