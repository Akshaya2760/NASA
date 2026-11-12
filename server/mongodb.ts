import { MongoClient, Db, Collection } from 'mongodb';
import fs from 'fs';
import path from 'path';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  role: 'admin' | 'scientist' | 'educator' | 'citizen';
  institution?: string;
  createdAt: string;
}

export interface AnalyticsSessionRecord {
  id?: string;
  userId?: string;
  userName?: string;
  datasetId: string;
  datasetName: string;
  listenSeconds: number;
  probesCount: number;
  activeScale?: string;
  timestamp: string;
}

export interface MongoStatus {
  connected: boolean;
  state: 'connected' | 'connecting' | 'disconnected' | 'fallback_mode';
  uriConfigured: boolean;
  databaseName: string;
  host?: string;
  collections: string[];
  userCount: number;
  lastConnected?: string;
  lastError?: string;
  mode: 'MongoDB' | 'Local Persistent JSON (Fallback)';
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let isConnecting = false;
let lastError: string | undefined = undefined;
let lastConnectedTime: string | undefined = undefined;

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'earth_jukebox';

// Local File Store Fallbacks
function getLocalUsers(): StoredUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[Database] Error reading local users file:', err);
  }
  return [];
}

function saveLocalUsers(users: StoredUser[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Error saving local users file:', err);
  }
}

function saveLocalSession(session: AnalyticsSessionRecord): void {
  try {
    let sessions: AnalyticsSessionRecord[] = [];
    if (fs.existsSync(SESSIONS_FILE)) {
      sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
    sessions.push(session);
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Database] Error saving local session:', err);
  }
}

/**
 * Initialize connection to MongoDB with timeout and automatic migration
 */
export async function initMongoDB(): Promise<boolean> {
  if (!MONGODB_URI) {
    console.log('[MongoDB] MONGODB_URI environment variable not configured. Running in high-reliability Local Persistent JSON mode.');
    return false;
  }

  if (isConnected && db) {
    return true;
  }

  if (isConnecting) {
    return false;
  }

  isConnecting = true;
  try {
    console.log(`[MongoDB] Connecting to MongoDB instance for database "${DB_NAME}"...`);
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(DB_NAME);
    isConnected = true;
    lastError = undefined;
    lastConnectedTime = new Date().toISOString();

    console.log(`[MongoDB] ✅ Successfully connected to MongoDB database "${DB_NAME}"!`);

    // Ensure indexes for fast lookups
    const usersCol = db.collection<StoredUser>('users');
    await usersCol.createIndex({ email: 1 }, { unique: true }).catch(() => {});
    await usersCol.createIndex({ id: 1 }).catch(() => {});

    const sessionsCol = db.collection<AnalyticsSessionRecord>('analytics_sessions');
    await sessionsCol.createIndex({ datasetId: 1 }).catch(() => {});
    await sessionsCol.createIndex({ timestamp: -1 }).catch(() => {});

    // Sync any pre-existing local users into MongoDB if not present
    await migrateLocalUsersToMongo(usersCol);

    return true;
  } catch (err: any) {
    isConnected = false;
    lastError = err?.message || String(err);
    console.warn(`[MongoDB] ⚠️ Could not connect to MongoDB: ${lastError}. Falling back seamlessly to local persistent JSON store.`);
    return false;
  } finally {
    isConnecting = false;
  }
}

/**
 * Migrate existing JSON users to MongoDB seamlessly on initial connection
 */
async function migrateLocalUsersToMongo(usersCol: Collection<StoredUser>) {
  try {
    const localUsers = getLocalUsers();
    if (localUsers.length > 0) {
      for (const u of localUsers) {
        await usersCol.updateOne(
          { email: u.email },
          { $setOnInsert: u },
          { upsert: true }
        );
      }
      console.log(`[MongoDB] Synchronized ${localUsers.length} local user records to MongoDB collection "users".`);
    }
  } catch (err) {
    console.error('[MongoDB] Local migration sync notice:', err);
  }
}

/**
 * Get comprehensive MongoDB connection & telemetry status
 */
export async function getMongoStatus(): Promise<MongoStatus> {
  const uriConfigured = Boolean(MONGODB_URI);
  let collections: string[] = [];
  let userCount = 0;
  let host: string | undefined = undefined;

  if (isConnected && db && client) {
    try {
      const cols = await db.listCollections().toArray();
      collections = cols.map((c) => c.name);
      userCount = await db.collection('users').countDocuments();
      // Extract sanitized host name
      if (MONGODB_URI.includes('@')) {
        host = MONGODB_URI.split('@')[1].split('/')[0].split('?')[0];
      } else {
        host = MONGODB_URI.replace('mongodb://', '').replace('mongodb+srv://', '').split('/')[0];
      }
    } catch {
      // ignore
    }
  } else {
    userCount = getLocalUsers().length;
  }

  return {
    connected: isConnected,
    state: isConnected ? 'connected' : isConnecting ? 'connecting' : uriConfigured ? 'disconnected' : 'fallback_mode',
    uriConfigured,
    databaseName: DB_NAME,
    host: host || (uriConfigured ? 'configured (connecting/retry)' : 'local-storage'),
    collections,
    userCount,
    lastConnected: lastConnectedTime,
    lastError,
    mode: isConnected ? 'MongoDB' : 'Local Persistent JSON (Fallback)',
  };
}

/**
 * Find user by email (MongoDB first, fallback to JSON)
 */
export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const cleanEmail = email.trim().toLowerCase();

  if (isConnected && db) {
    try {
      const user = await db.collection<StoredUser>('users').findOne({ email: cleanEmail });
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          salt: user.salt,
          hash: user.hash,
          role: user.role,
          institution: user.institution,
          createdAt: user.createdAt,
        };
      }
    } catch (err) {
      console.warn('[MongoDB] Query failed, falling back to local store:', err);
    }
  }

  const localUsers = getLocalUsers();
  return localUsers.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

/**
 * Insert or register new user into MongoDB (and mirror to local JSON for zero-downtime safety)
 */
export async function insertUser(newUser: StoredUser): Promise<void> {
  // Always update local storage for redundancy
  const localUsers = getLocalUsers();
  if (!localUsers.some((u) => u.email.toLowerCase() === newUser.email.toLowerCase())) {
    localUsers.push(newUser);
    saveLocalUsers(localUsers);
  }

  if (isConnected && db) {
    try {
      await db.collection<StoredUser>('users').insertOne({ ...newUser });
      console.log(`[MongoDB] Stored new user ${newUser.email} in MongoDB users collection.`);
    } catch (err) {
      console.error('[MongoDB] Failed inserting user into MongoDB:', err);
    }
  }
}

/**
 * Fetch all users (for Admin Dashboard)
 */
export async function getAllUsers(): Promise<Omit<StoredUser, 'salt' | 'hash'>[]> {
  if (isConnected && db) {
    try {
      const users = await db
        .collection<StoredUser>('users')
        .find({}, { projection: { hash: 0, salt: 0 } })
        .toArray();
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        institution: u.institution,
        createdAt: u.createdAt,
      }));
    } catch (err) {
      console.warn('[MongoDB] Query users failed, using local store:', err);
    }
  }

  return getLocalUsers().map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    institution: u.institution,
    createdAt: u.createdAt,
  }));
}

/**
 * Record user engagement & sonification session metrics in MongoDB
 */
export async function recordSessionTelemetry(session: AnalyticsSessionRecord): Promise<void> {
  saveLocalSession(session);

  if (isConnected && db) {
    try {
      await db.collection<AnalyticsSessionRecord>('analytics_sessions').insertOne(session);
    } catch (err) {
      console.warn('[MongoDB] Failed saving analytics session:', err);
    }
  }
}

/**
 * Aggregate dataset engagement statistics
 */
export async function getEngagementStats(): Promise<{
  totalSessions: number;
  totalListenSeconds: number;
  datasetBreakdown: Record<string, { sessions: number; totalListenSeconds: number; probes: number }>;
}> {
  if (isConnected && db) {
    try {
      const sessions = await db.collection<AnalyticsSessionRecord>('analytics_sessions').find().toArray();
      const datasetBreakdown: Record<string, { sessions: number; totalListenSeconds: number; probes: number }> = {};
      let totalListen = 0;

      for (const s of sessions) {
        totalListen += s.listenSeconds || 0;
        if (!datasetBreakdown[s.datasetId]) {
          datasetBreakdown[s.datasetId] = { sessions: 0, totalListenSeconds: 0, probes: 0 };
        }
        datasetBreakdown[s.datasetId].sessions += 1;
        datasetBreakdown[s.datasetId].totalListenSeconds += s.listenSeconds || 0;
        datasetBreakdown[s.datasetId].probes += s.probesCount || 0;
      }

      return {
        totalSessions: sessions.length,
        totalListenSeconds: totalListen,
        datasetBreakdown,
      };
    } catch {
      // fallback
    }
  }

  // Local fallback aggregation
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const sessions: AnalyticsSessionRecord[] = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      const datasetBreakdown: Record<string, { sessions: number; totalListenSeconds: number; probes: number }> = {};
      let totalListen = 0;

      for (const s of sessions) {
        totalListen += s.listenSeconds || 0;
        if (!datasetBreakdown[s.datasetId]) {
          datasetBreakdown[s.datasetId] = { sessions: 0, totalListenSeconds: 0, probes: 0 };
        }
        datasetBreakdown[s.datasetId].sessions += 1;
        datasetBreakdown[s.datasetId].totalListenSeconds += s.listenSeconds || 0;
        datasetBreakdown[s.datasetId].probes += s.probesCount || 0;
      }

      return {
        totalSessions: sessions.length,
        totalListenSeconds: totalListen,
        datasetBreakdown,
      };
    }
  } catch {
    // empty
  }

  return { totalSessions: 0, totalListenSeconds: 0, datasetBreakdown: {} };
}
