import session from 'express-session';
import type { RequestHandler } from 'express';
import type { UserRole } from '@shared/index';

const SESSION_SECRET = process.env.SESSION_SECRET ?? 'dev-session-secret';
const isProd = process.env.NODE_ENV === 'production';
const secureCookie = (() => {
  const override = process.env.SESSION_COOKIE_SECURE?.toLowerCase();
  if (override === 'true') return true;
  if (override === 'false') return false;
  return isProd;
})();

export interface SessionPrincipal {
  id: string;
  username: string;
  role: UserRole;
  displayName?: string;
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionPrincipal;
  }
}

export const sessionMiddleware = session({
  name: 'sd.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: isProd,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    maxAge: 1000 * 60 * 60 * 8
  }
});

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.session?.user) {
    return next();
  }
  return res.status(401).json({ error: 'AUTH_REQUIRED' });
};

export const requireRole = (role: UserRole): RequestHandler => {
  return (req, res, next) => {
    if (req.session?.user?.role === role) {
      return next();
    }
    return res.status(403).json({ error: 'FORBIDDEN' });
  };
};

export const attachSessionUser = (
  req: Parameters<RequestHandler>[0],
  user: SessionPrincipal
) => {
  req.session.user = user;
};

export const destroySession = (req: Parameters<RequestHandler>[0]) =>
  new Promise<void>((resolve, reject) => {
    req.session.destroy((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
