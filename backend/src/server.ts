import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { sessionMiddleware } from './middleware/session';
import authRouter from './api/auth/routes';
import adminRouter from './api/admin/routes';
import analyticsRouter from './api/analytics/ordersRoutes';
import embedRouter from './api/analytics/embedRoutes';
import integrationsRouter from './api/integrations/routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
const EXTRA_FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string) {
  const explicitOrigins = new Set([
    FRONTEND_ORIGIN,
    'http://localhost:5174',
    'http://localhost:5175',
    ...EXTRA_FRONTEND_ORIGINS
  ]);

  if (explicitOrigins.has(origin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

app.set('trust proxy', 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) callback(null, true);
      else callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/analytics/embeds', embedRouter);
app.use('/api/integrations', integrationsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/static', express.static(path.join(__dirname, '../public')));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'NOT_FOUND', path: req.path });
  }
  return next();
});

app.use(
  (
    err: Error & { status?: number },
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const statusCode = err.status ?? 500;
    console.error(`[API ERROR] (${statusCode})`, err);
    res.status(statusCode).json({
      error: err.message ?? 'Internal Server Error'
    });
  }
);

app.listen(PORT, () => {
  console.info(`API server ready on http://localhost:${PORT}`);
});
