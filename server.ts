
import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';

import {
  initMongoDB,
  findUserByEmail,
  insertUser,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getMongoStatus,
  recordSessionTelemetry,
  getEngagementStats
} from './database.js';

dotenv.config();

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  'earth-jukebox-local-development-secret-change-this';

const ROLES = ['admin', 'scientist', 'educator', 'citizen'] as const;
type UserRole = typeof ROLES[number];

interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  role: UserRole;
  institution?: string;
  createdAt: string;
}

interface AuthRequest extends Request {
  authenticatedUser?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// --------------------------------------------------
// GEMINI AI
// --------------------------------------------------

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    })
  : null;

const SYSTEM_INSTRUCTION = `
You are AeroSonic AI, the Earth Jukebox NASA Earth Science
sonification assistant.

Explain Earth science datasets and translate visual data
into understandable sound concepts.

Specialize in:
- Sea Surface Temperature
- Atmospheric CO2 and Methane
- Polar Ice and Cryosphere
- Wildfires and aerosols
- Vegetation and chlorophyll
- Solar wind and auroras
- Precipitation and storms

Explain pitch, tempo, timbre and spatial sound in
scientifically accurate and accessible language.

Never claim to be an official NASA representative.
`;

// --------------------------------------------------
// SECURITY
// --------------------------------------------------

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function safeUser(user: StoredUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    institution: user.institution || 'NASA Earth Science Investigator',
    avatarBg:
      user.role === 'admin'
        ? 'from-amber-500 to-rose-600'
        : 'from-sky-500 to-indigo-600',
    savedPresets: [
      'Ocean Warming Pentatonic',
      'Amazon Thermal Surge'
    ],
    bookmarks: [
      'sea-surface-temp',
      'atmospheric-co2'
    ]
  };
}

function createToken(user: StoredUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 86400
    })
  ).toString('base64url');

  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');

  return `${payload}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;

    const expected = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(payload)
      .digest();

    const actual = Buffer.from(signature, 'base64url');

    if (
      actual.length !== expected.length ||
      !crypto.timingSafeEqual(actual, expected)
    ) {
      return null;
    }

    const data = JSON.parse(
      Buffer.from(payload, 'base64url').toString()
    );

    if (data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

// --------------------------------------------------
// ACTIVITY LOGS
// --------------------------------------------------

interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  service: string;
  message: string;
}

const systemActivityLogs: SystemLog[] = [];

function logActivity(
  level: SystemLog['level'],
  service: string,
  message: string
) {
  systemActivityLogs.unshift({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    level,
    service,
    message
  });

  if (systemActivityLogs.length > 100) {
    systemActivityLogs.pop();
  }
}

// --------------------------------------------------
// DEFAULT ADMIN
// --------------------------------------------------

async function initializeDefaultAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      'Admin bootstrap skipped: configure ADMIN_EMAIL and ADMIN_PASSWORD.'
    );
    return;
  }

  const existing = await findUserByEmail(email);

  if (existing) {
    if (existing.role !== 'admin') {
      console.warn('Configured admin account is not an admin.');
    }
    return;
  }

  const salt = crypto.randomBytes(16).toString('hex');

  const admin: StoredUser = {
    id: crypto.randomUUID(),
    name: 'Earth Jukebox Administrator',
    email,
    salt,
    hash: hashPassword(password, salt),
    role: 'admin',
    institution: 'NASA Earth Information Center',
    createdAt: new Date().toISOString()
  };

  await insertUser(admin);

  console.log('Initial administrator account created.');
}

// --------------------------------------------------
// DATABASE
// --------------------------------------------------

let databaseReady = false;

async function ensureDatabase(): Promise<boolean> {
  if (databaseReady) return true;

  try {
    const connected = await initMongoDB();

    if (!connected) return false;

    await initializeDefaultAdmin();

    databaseReady = true;

    console.log('Database initialization completed.');

    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// MongoDB middleware
app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();

  try {
    if (!(await ensureDatabase())) {
      return res.status(503).json({
        success: false,
        error: 'Database unavailable. Please try again later.'
      });
    }

    next();
  } catch (error) {
    console.error('Database middleware error:', error);

    return res.status(503).json({
      success: false,
      error: 'Database connection failed.'
    });
  }
});

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const payload = verifyToken(header.slice(7));

    if (!payload) {
      return res.status(401).json({
        error: 'Invalid or expired session.'
      });
    }

    const user = await findUserByEmail(payload.email);

    if (
      !user ||
      user.id !== payload.id ||
      user.role !== payload.role
    ) {
      return res.status(401).json({
        error: 'User session is no longer valid.'
      });
    }

    req.authenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);

    return res.status(401).json({
      error: 'Authentication failed.'
    });
  }
}

function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.authenticatedUser?.role !== 'admin') {
    return res.status(403).json({
      error: 'Administrator access required.'
    });
  }

  next();
}

// --------------------------------------------------
// REGISTER
// --------------------------------------------------

app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      name,
      fullName,
      email,
      password,
      confirmPassword,
      institution
    } = req.body;

    const cleanName = name || fullName;

    if (
      typeof cleanName !== 'string' ||
      !cleanName.trim()
    ) {
      return res.status(400).json({
        error: 'Full name is required.'
      });
    }

    if (
      typeof email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        error: 'Enter a valid email address.'
      });
    }

    if (
      typeof password !== 'string' ||
      password.length < 8
    ) {
      return res.status(400).json({
        error: 'Password must contain at least 8 characters.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        error: 'Passwords do not match.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await findUserByEmail(cleanEmail);

    if (existing) {
      return res.status(409).json({
        error: 'An account already exists with this email.'
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');

    const user: StoredUser = {
      id: crypto.randomUUID(),
      name: cleanName.trim(),
      email: cleanEmail,
      salt,
      hash: hashPassword(password, salt),
      role: 'scientist',
      institution:
        typeof institution === 'string' && institution.trim()
          ? institution.trim()
          : 'NASA Space Apps Investigator',
      createdAt: new Date().toISOString()
    };

    await insertUser(user);

    const token = createToken(user);

    logActivity(
      'info',
      'AuthGateway',
      `New investigator registered: ${cleanEmail}`
    );

    return res.status(201).json({
      success: true,
      message: 'Investigator registered successfully.',
      user: safeUser(user),
      token
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error?.code === 11000) {
      return res.status(409).json({
        error: 'An account already exists with this email.'
      });
    }

    return res.status(500).json({
      error: 'Registration failed.'
    });
  }
});

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !password
    ) {
      return res.status(400).json({
        error: 'Email and password are required.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await findUserByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({
        error: 'Account not found. Please register first.'
      });
    }

    const inputHash = hashPassword(password, user.salt);
    const inputBuffer = Buffer.from(inputHash, 'hex');
    const storedBuffer = Buffer.from(user.hash, 'hex');

    const valid =
      inputBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(inputBuffer, storedBuffer);

    if (!valid) {
      logActivity(
        'warn',
        'AuthGateway',
        `Failed login: ${cleanEmail}`
      );

      return res.status(401).json({
        error: 'Incorrect email or password.'
      });
    }

    const token = createToken(user);

    logActivity(
      'info',
      'AuthGateway',
      `User logged in: ${cleanEmail}`
    );

    return res.json({
      success: true,
      message: 'Login successful.',
      user: safeUser(user),
      token
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      error: 'Login failed.'
    });
  }
});

// --------------------------------------------------
// ADMIN LOGIN
// --------------------------------------------------

app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        error: 'Admin email and password are required.'
      });
    }

    const user = await findUserByEmail(
      email.trim().toLowerCase()
    );

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        error: 'Administrator access required.'
      });
    }

    const inputHash = hashPassword(password, user.salt);
    const inputBuffer = Buffer.from(inputHash, 'hex');
    const storedBuffer = Buffer.from(user.hash, 'hex');

    const valid =
      inputBuffer.length === storedBuffer.length &&
      crypto.timingSafeEqual(inputBuffer, storedBuffer);

    if (!valid) {
      return res.status(401).json({
        error: 'Invalid administrator credentials.'
      });
    }

    logActivity(
      'info',
      'MissionControl',
      `Administrator logged in: ${user.email}`
    );

    return res.json({
      success: true,
      message: 'Administrator authenticated.',
      user: safeUser(user),
      token: createToken(user),
      isAdmin: true
    });
  } catch (error) {
    console.error('Admin login error:', error);

    return res.status(500).json({
      error: 'Admin authentication failed.'
    });
  }
});

// --------------------------------------------------
// CURRENT USER
// --------------------------------------------------

app.get(
  '/api/auth/me',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const user = await findUserByEmail(
        req.authenticatedUser!.email
      );

      if (!user) {
        return res.status(404).json({
          error: 'User not found.'
        });
      }

      return res.json({
        success: true,
        user: safeUser(user)
      });
    } catch (error) {
      console.error('Current user error:', error);

      return res.status(500).json({
        error: 'Unable to retrieve user.'
      });
    }
  }
);

// --------------------------------------------------
// ADMIN USER MANAGEMENT
// --------------------------------------------------

app.get(
  '/api/admin/users',
  authenticate,
  requireAdmin,
  async (_req, res) => {
    try {
      const users = await getAllUsers();

      return res.json({
        success: true,
        count: users.length,
        users: users.map(safeUser)
      });
    } catch (error) {
      console.error('Get users error:', error);

      return res.status(500).json({
        error: 'Unable to retrieve users.'
      });
    }
  }
);

app.patch(
  '/api/admin/users/:id/role',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const { role } = req.body;

      if (
        typeof role !== 'string' ||
        !ROLES.includes(role as UserRole)
      ) {
        return res.status(400).json({
          error: 'Invalid user role.'
        });
      }

      if (
        req.params.id === req.authenticatedUser!.id &&
        role !== 'admin'
      ) {
        return res.status(400).json({
          error: 'You cannot remove your own administrator role.'
        });
      }

      await updateUserRole(req.params.id, role as UserRole);

      logActivity(
        'info',
        'UserRegistry',
        `User role updated: ${req.params.id} -> ${role}`
      );

      return res.json({
        success: true,
        message: 'User role updated successfully.'
      });
    } catch (error) {
      console.error('Update role error:', error);

      return res.status(500).json({
        error: 'Failed to update user role.'
      });
    }
  }
);

app.delete(
  '/api/admin/users/:id',
  authenticate,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      if (req.params.id === req.authenticatedUser!.id) {
        return res.status(400).json({
          error: 'You cannot delete your own administrator account.'
        });
      }

      await deleteUser(req.params.id);

      logActivity(
        'warn',
        'UserRegistry',
        `User deleted: ${req.params.id}`
      );

      return res.json({
        success: true,
        message: 'User deleted successfully.'
      });
    } catch (error) {
      console.error('Delete user error:', error);

      return res.status(500).json({
        error: 'Failed to delete user.'
      });
    }
  }
);

// --------------------------------------------------
// ADMIN MONITORING
// --------------------------------------------------

app.get(
  '/api/admin/activity-logs',
  authenticate,
  requireAdmin,
  async (_req, res) => {
    try {
      const mongo = await getMongoStatus();
      const engagement = await getEngagementStats();

      return res.json({
        success: true,
        logs: systemActivityLogs,
        telemetryStatus: {
          eonetApi: 'ONLINE',
          webAudioSynth: 'CALIBRATED',
          database: mongo.connected ? 'OPERATIONAL' : 'OFFLINE',
          activeUsers: mongo.userCount,
          aiGuide: ai ? 'ONLINE' : 'STANDBY'
        },
        database: mongo,
        engagement
      });
    } catch (error) {
      console.error('Admin monitoring error:', error);

      return res.status(500).json({
        error: 'Unable to retrieve system status.'
      });
    }
  }
);

// --------------------------------------------------
// ANALYTICS
// --------------------------------------------------

app.post(
  '/api/analytics/session',
  authenticate,
  async (req: AuthRequest, res) => {
    try {
      const {
        datasetId,
        datasetName,
        listenSeconds,
        probesCount,
        activeScale
      } = req.body;

      if (
        typeof datasetId !== 'string' ||
        typeof datasetName !== 'string' ||
        !Number.isFinite(listenSeconds) ||
        !Number.isFinite(probesCount) ||
        listenSeconds < 0 ||
        probesCount < 0 ||
        listenSeconds > 86400 ||
        probesCount > 100000
      ) {
        return res.status(400).json({
          error: 'Invalid analytics data.'
        });
      }

      await recordSessionTelemetry({
        id: crypto.randomUUID(),
        userId: req.authenticatedUser!.id,
        userName: req.authenticatedUser!.email,
        datasetId,
        datasetName,
        listenSeconds,
        probesCount,
        activeScale:
          typeof activeScale === 'string' ? activeScale : undefined,
        timestamp: new Date().toISOString()
      });

      return res.json({
        success: true,
        message: 'Analytics session saved.'
      });
    } catch (error) {
      console.error('Analytics error:', error);

      return res.status(500).json({
        error: 'Failed to save analytics session.'
      });
    }
  }
);

// --------------------------------------------------
// NASA EONET
// --------------------------------------------------

let cachedEvents: any[] = [];
let cacheTimestamp = 0;

const CACHE_TTL_MS = 90 * 1000;

app.get('/api/nasa/current-events', async (_req, res) => {
  const now = Date.now();

  if (
    cachedEvents.length &&
    now - cacheTimestamp < CACHE_TTL_MS
  ) {
    return res.json({
      success: true,
      cached: true,
      lastUpdated: new Date(cacheTimestamp).toISOString(),
      count: cachedEvents.length,
      events: cachedEvents
    });
  }

  try {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      10000
    );

    try {
      const response = await fetch(
        'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=30',
        { signal: controller.signal }
      );

      if (!response.ok) {
        throw new Error(`NASA EONET returned ${response.status}`);
      }

      const data: any = await response.json();

      cachedEvents = (data.events || []).map((ev: any) => {
        const geometry = ev.geometry?.at(-1);
        const category = ev.categories?.[0]?.id || 'unknown';

        const magnitude = geometry?.magnitudeValue;
        let frequency = 261.63;
        let wave: OscillatorType = 'sine';

        if (category === 'severeStorms') {
          frequency = Math.min(
            650,
            180 + (
              typeof magnitude === 'number' ? magnitude : 45
            ) * 4.5
          );
          wave = 'sawtooth';
        } else if (category === 'wildfires') {
          frequency = Math.min(
            750,
            320 + Math.log10(Math.max(10, magnitude || 800)) * 80
          );
          wave = 'square';
        } else if (category === 'seaLakeIce') {
          frequency = 85;
          wave = 'triangle';
        } else if (category === 'volcanoes') {
          frequency = 130.8;
          wave = 'sawtooth';
        }

        return {
          id: ev.id,
          title: ev.title,
          category,
          categoryTitle:
            ev.categories?.[0]?.title || 'Earth Observation',
          date: geometry?.date || new Date().toISOString(),
          lat: geometry?.coordinates?.[1] ?? 0,
          lng: geometry?.coordinates?.[0] ?? 0,
          magnitude,
          magnitudeUnit: geometry?.magnitudeUnit || '',
          sourceUrl: ev.sources?.[0]?.url || ev.link,
          sourceName: ev.sources?.[0]?.id || 'NASA EIC',
          sonificationFreqHz: Math.round(frequency * 10) / 10,
          sonificationWave: wave,
          acousticNote: `${Math.round(frequency)} Hz Earth Event Tone`
        };
      });

      cacheTimestamp = Date.now();
    } finally {
      clearTimeout(timeout);
    }

    return res.json({
      success: true,
      cached: false,
      lastUpdated: new Date(cacheTimestamp).toISOString(),
      count: cachedEvents.length,
      events: cachedEvents
    });
  } catch (error) {
    console.error('NASA EONET error:', error);

    return res.json({
      success: true,
      cached: cachedEvents.length > 0,
      lastUpdated: cacheTimestamp
        ? new Date(cacheTimestamp).toISOString()
        : null,
      count: cachedEvents.length,
      events: cachedEvents
    });
  }
});

// --------------------------------------------------
// GEMINI CHAT
// --------------------------------------------------

app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (
      typeof message !== 'string' ||
      !message.trim() ||
      message.length > 10000
    ) {
      return res.status(400).json({
        error: 'A valid message is required.'
      });
    }

    if (!ai) {
      return res.json({
        simulated: true,
        response:
          `Welcome to Earth Jukebox! Your current dataset is ${
            context?.datasetName || 'Global Earth Science'
          }. I can explain how Earth observations can be transformed into sound.`
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: JSON.stringify({
        question: message,
        context: context || {},
        nasaEvents: cachedEvents.slice(0, 5)
      }),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    return res.json({
      response:
        response.text ||
        'Unable to generate an AI response.'
    });
  } catch (error) {
    console.error('Gemini error:', error);

    return res.status(500).json({
      error: 'AI service is temporarily unavailable.'
    });
  }
});

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/api/health', async (_req, res) => {
  const mongo = await getMongoStatus().catch(() => null);

  return res.json({
    status: 'healthy',
    system: 'Earth Jukebox - EIC Sonification Lab',
    timestamp: new Date().toISOString(),
    aiReady: Boolean(ai),
    databaseConnected: mongo?.connected || false
  });
});

// --------------------------------------------------
// FRONTEND AND SERVER STARTUP
// --------------------------------------------------

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true
      },
      appType: 'spa'
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');

    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0');

  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  console.log(`Earth Jukebox listening at http://127.0.0.1:${PORT}`);

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

  server.on('close', () => {
    console.log('Earth Jukebox server stopped.');
  });
}

// Export Express app
export default app;

// Start the server locally
startServer().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
