import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { nextCookies } from 'better-auth/next-js';
import { jwt } from 'better-auth/plugins';
import { verifyPassword as verifyScrypt } from 'better-auth/crypto';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const mongoUri = (process.env.MONGODB_URI || '').trim();
if (!mongoUri) {
  throw new Error('MONGODB_URI environment variable is required.');
}

const globalForMongo = globalThis as unknown as {
  _salonbookMongoClient?: MongoClient;
};

const client =
  globalForMongo._salonbookMongoClient ??
  new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
  });

globalForMongo._salonbookMongoClient = client;

const dbName = (
  process.env.MONGODB_DB_NAME ||
  process.env.BETTER_AUTH_DB_NAME ||
  'SalonBookDB'
).trim();

const db = client.db(dbName);

const appUrl = (
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://salonbook-frontend-opal.vercel.app'
)
  .trim()
  .replace(/\/$/, '');

export const auth = betterAuth({
  baseURL: appUrl,
  secret: (process.env.BETTER_AUTH_SECRET || '').trim(),
  trustedOrigins: Array.from(
    new Set(
      [
        'http://localhost:3000',
        appUrl,
        (process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, ''),
        (process.env.BETTER_AUTH_URL || '').trim().replace(/\/$/, ''),
      ].filter(Boolean)
    )
  ),
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    password: {
      // salonbook-server stores bcrypt hashes ($2b$…) in account.password,
      // while Better Auth defaults to scrypt and throws on bcrypt input.
      // New hashes are bcrypt to match the API; verify accepts both formats
      // so legacy scrypt accounts keep working.
      hash: (password) => bcrypt.hash(password, 12),
      verify: async ({ hash, password }) => {
        try {
          if (hash.startsWith('$2')) {
            return await bcrypt.compare(password, hash);
          }
          return await verifyScrypt({ hash, password });
        } catch {
          return false;
        }
      },
    },
  },
  socialProviders: {
    google: {
      clientId: (process.env.GOOGLE_CLIENT_ID || '').trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || '').trim(),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'client',
        input: false,
      },
      isBlocked: {
        type: 'boolean',
        defaultValue: false,
        input: false,
      },
    },
  },
  plugins: [
    jwt(),
    nextCookies(),
  ],
});

export { db as authDb };