import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import serverRoutes from './routes/server.routes';
import authRoutes from './routes/auth.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import pluginRoutes from './routes/plugin.routes';
import versionRoutes from './routes/version.routes';
import scheduleRoutes from './routes/schedule.routes';
import webhookRoutes from './routes/webhook.routes';
import userRoutes from './routes/user.routes';
import auditRoutes from './routes/audit.routes';
import customPluginRoutes from './routes/custom-plugin.routes';
import rateLimit from 'express-rate-limit';

import './queues/plugin.queue';

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app: Express = express();

app.set('trust proxy', 1);

import path from 'path';

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Increased limit for dashboard usage
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many login attempts, please try again later.' }
});

// Middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            styleSrcAttr: ["'unsafe-inline'"],
            imgSrc: [
                "'self'",
                "data:",
                "https://www.spigotmc.org",
                "https://cdn.modrinth.com",
                "https://ui-avatars.com",
                "https://via.placeholder.com"
            ],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));
app.use(morgan('dev'));
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/plugins', pluginRoutes);
app.use('/api/custom-plugins', customPluginRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', webhookRoutes);
app.use('/api/audit', auditRoutes);

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === 'production') {
    const publicPath = path.join(__dirname, '../../public');
    app.use(express.static(publicPath));

    app.get('*', (req: Request, res: Response) => {
        if (req.path.startsWith('/api')) {
            return res.status(404).json({
                status: 'error',
                message: `Can't find ${req.originalUrl} on this server!`
            });
        }
        res.sendFile(path.join(publicPath, 'index.html'));
    });
} else {
    app.all('*', (req: Request, res: Response) => {
        res.status(404).json({
            status: 'error',
            message: `Can't find ${req.originalUrl} on this server!`
        });
    });
}

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal Server Error'
    });
});

export default app;
