
import { MongoClient, Db } from 'mongodb';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  salt: string;
  hash: string;
  role: 'admin' | 'scientist' | 'educator' | 'citizen';
  institution?: string;
  createdAt: string;
}

interface SessionTelemetry {
  id: string;
  userId: string;
  userName: string;
  datasetId: string;
  datasetName: string;
  listenSeconds: number;
  probesCount: number;
  activeScale?: string;
  timestamp: string;
}

let client: MongoClient | null = null;
let db: Db | null = null;

export async function initMongoDB(): Promise<boolean> {
  try {
    if (db) return true;

    const uri = process.env.MONGODB_URI;
    const databaseName = process.env.MONGODB_DB_NAME || 'earth_jukebox';

    if (!uri) throw new Error('MONGODB_URI is missing');

    client = new MongoClient(uri);
    await client.connect();

    db = client.db(databaseName);
    await db.command({ ping: 1 });

    await db.collection<StoredUser>('users').createIndex(
      { email: 1 },
      { unique: true }
    );

    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    db = null;
    client = null;
    return false;
  }
}

function getDB(): Db {
  if (!db) throw new Error('MongoDB is not connected');
  return db;
}

export async function findUserByEmail(
  email: string
): Promise<StoredUser | null> {
  return getDB().collection<StoredUser>('users').findOne({
    email: email.toLowerCase()
  });
}

export async function insertUser(user: StoredUser): Promise<void> {
  await getDB().collection<StoredUser>('users').insertOne({
    ...user,
    email: user.email.toLowerCase()
  });
}

export async function getAllUsers(): Promise<StoredUser[]> {
  return getDB().collection<StoredUser>('users').find({}).toArray();
}

export async function updateUserRole(
  id: string,
  role: StoredUser['role']
): Promise<void> {
  const result = await getDB()
    .collection<StoredUser>('users')
    .updateOne({ id }, { $set: { role } });

  if (result.matchedCount === 0) {
    throw new Error('User not found');
  }
}

export async function deleteUser(id: string): Promise<void> {
  const result = await getDB()
    .collection<StoredUser>('users')
    .deleteOne({ id });

  if (result.deletedCount === 0) {
    throw new Error('User not found');
  }
}

export async function getMongoStatus() {
  const database = getDB();
  const userCount = await database
    .collection<StoredUser>('users')
    .countDocuments();

  return { connected: true, userCount };
}

export async function recordSessionTelemetry(
  data: SessionTelemetry
): Promise<void> {
  await getDB()
    .collection<SessionTelemetry>('session_telemetry')
    .insertOne(data);
}

export async function getEngagementStats() {
  const sessions = await getDB()
    .collection<SessionTelemetry>('session_telemetry')
    .find({})
    .toArray();

  return {
    totalSessions: sessions.length,
    totalListenSeconds: sessions.reduce(
      (sum, item) => sum + item.listenSeconds, 0
    ),
    totalProbes: sessions.reduce(
      (sum, item) => sum + item.probesCount, 0
    ),
    uniqueUsers: new Set(sessions.map(item => item.userId)).size
  };
}
