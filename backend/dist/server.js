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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
app.set('trust proxy', 1);
app.use(cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/analytics/embeds', embedRouter);
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
app.use((err, _req, res, _next) => {
    const statusCode = err.status ?? 500;
    // eslint-disable-next-line no-console
    console.error(`[API ERROR] (${statusCode})`, err);
    res.status(statusCode).json({
        error: err.message ?? 'Internal Server Error'
    });
});
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server ready on http://localhost:${PORT}`);
});
