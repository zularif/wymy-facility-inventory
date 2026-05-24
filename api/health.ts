import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json({
    ok: true,
    nodeEnv: process.env.NODE_ENV,
    hasDb: !!process.env.DATABASE_URL,
    hasSecret: !!process.env.SESSION_SECRET,
  });
}
