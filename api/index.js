export default async function handler(req, res) {
  try {
    const { default: app } = await import("../artifacts/api-server/dist/app.mjs");
    await new Promise((resolve, reject) => {
      app(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Server error", detail: message });
    }
  }
}
