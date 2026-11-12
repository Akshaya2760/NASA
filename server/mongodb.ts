
import { MongoClient, Db } from 'mongodb';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  createdAt: Date;
}

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;

/**
 * Connect to MongoDB
 */
export async function connectToMongoDB(): Promise<void> {
  if (isConnected && db) return;

  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGODB_DB_NAME || 'earth_jukebox';

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is missing');
  }

  try {
    client = new MongoClient(uri);
    await client.connect();

    db = client.db(databaseName);

    await db.command({ ping: 1 });

    isConnected = true;

    console.log('MongoDB connected successfully');
  } catch (error) {
    isConnected = false;
    db = null;
    client = null;

    console.error('MongoDB connection failed:', error);
    throw new Error('Unable to connect to MongoDB');
  }
}

/**
 * Get database connection
 */
export function getDatabase(): Db {
  if (!isConnected || !db) {
    throw new Error('MongoDB is not connected');
  }

  return db;
}

/**
 * Add a new user
 */
export async function createUser(user: StoredUser): Promise<void> {
  const database = getDatabase();

  const existingUser = await database.collection<StoredUser>('users')
    .findOne({ email: user.email.toLowerCase() });

  if (existingUser) {
    throw new Error('User already exists');
  }

  await database.collection<StoredUser>('users').insertOne({
    ...user,
    email: user.email.toLowerCase(),
  });
}

/**
 * Find user by email
 */
export async function findUserByEmail(
  email: string
): Promise<StoredUser | null> {
  const database = getDatabase();

  return database.collection<StoredUser>('users').findOne({
    email: email.toLowerCase(),
  });
}

/**
 * Find user by ID
 */
export async function findUserById(
  id: string
): Promise<StoredUser | null> {
  const database = getDatabase();

  return database.collection<StoredUser>('users').findOne({ id });
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<StoredUser[]> {
  const database = getDatabase();

  return database.collection<StoredUser>('users')
    .find({})
    .toArray();
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  id: string,
  role: StoredUser['role']
): Promise<void> {
  const database = getDatabase();

  const result = await database.collection<StoredUser>('users').updateOne(
    { id },
    { $set: { role } }
  );

  if (result.matchedCount === 0) {
    throw new Error('User not found');
  }
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
  const database = getDatabase();

  const result = await database.collection<StoredUser>('users').deleteOne({
    id,
  });

  if (result.deletedCount === 0) {
    throw new Error('User not found');
  }
}
