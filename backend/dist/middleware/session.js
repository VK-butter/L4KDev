import session from 'express-session';
const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-session-secret';
const isProd = process.env.NODE_ENV === 'production';
export const sessionMiddleware = session({
    name: 'sd.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: isProd,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: isProd,
        maxAge: 1000 * 60 * 60 * 8
    }
});
export const requireAuth = (req, res, next) => {
    if (req.session?.user) {
        return next();
    }
    return res.status(401).json({ error: 'AUTH_REQUIRED' });
};
export const requireRole = (role) => {
    return (req, res, next) => {
        if (req.session?.user?.role === role) {
            return next();
        }
        return res.status(403).json({ error: 'FORBIDDEN' });
    };
};
export const attachSessionUser = (req, user) => {
    req.session.user = user;
};
export const destroySession = (req) => new Promise((resolve, reject) => {
    req.session.destroy((err) => {
        if (err) {
            reject(err);
        }
        else {
            resolve();
        }
    });
});
