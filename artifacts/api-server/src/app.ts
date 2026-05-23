import path from "path";
import { createRequire } from "module";
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
});

app.use("/api/auth/login", authRateLimit);

const PgSession = connectPgSimple(session);

const isProduction = process.env.NODE_ENV === "production";

// In production (Vercel serverless) the table already exists in Supabase —
// skip schemaFile resolution which relies on local filesystem paths.
const pgSessionConfig: connectPgSimple.PGStoreOptions = {
  pool,
  tableName: "user_sessions",
  createTableIfMissing: !isProduction,
};

if (!isProduction) {
  const require = createRequire(import.meta.url);
  const pgSimpleDir = path.dirname(require.resolve("connect-pg-simple"));
  pgSessionConfig.schemaFile = path.join(pgSimpleDir, "table.sql");
}

app.use(
  session({
    store: new PgSession(pgSessionConfig),
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    name: "sid",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
      sameSite: "strict",
    },
  }),
);

app.use("/api", router);

export default app;
