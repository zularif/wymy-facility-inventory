import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { IncomingMessage, ServerResponse } from "http";
import app from "../artifacts/api-server/src/app";

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

export default function handler(req: VercelRequest, res: VercelResponse) {
  return (app as unknown as NodeHandler)(req, res);
}
