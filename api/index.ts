import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { default: app } = await import("../artifacts/api-server/src/app");
    await new Promise<void>((resolve, reject) => {
      (app as unknown as (req: unknown, res: unknown, next: (err?: unknown) => void) => void)(
        req,
        res,
        (err?: unknown) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.stack ?? err.message : String(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error", detail: message });
    }
  }
}
