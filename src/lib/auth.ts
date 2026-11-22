import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { nextCookies } from 'better-auth/next-js';
import { jwt } from 'better-auth/plugins';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI environment variable is required.');
}

// Reuse MongoClient across Next.js dev hot-reloads so OAuth verification state is never lost
const globalForMongo = globalThis as unknown as {
  _salonbookMongoClient?: MongoClient;
};

const client =
  globalForMongo._salonbookMongoClient ?? new MongoClient(mongoUri);

if (process.env.NODE_ENV !== 'production') {
  globalForMongo._salonbookMongoClient = client;
}

const db = client.db((process.env.MONGODB_DB_NAME || 'SalonBookDB').trim());

export const auth = betterAuth({
  baseURL: (process.env.BETTER_AUTH_URL || 'http://localhost:3000').trim(),
  secret: process.env.BETTER_AUTH_SECRET!.trim(),
  trustedOrigins: [
    'http://localhost:3000',
    (process.env.NEXT_PUBLIC_APP_URL || '').trim(),
    (process.env.BETTER_AUTH_URL || '').trim(),
  ].filter(Boolean),
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!.trim(),
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'client',
        input: false, // Prevents public sign-up from creating 'admin' accounts
      },
      isBlocked: {
        type: 'boolean',
        defaultValue: false,
        input: false, // Prevents public sign-up from altering block status
      },
    },
  },
  plugins: [
    jwt(),
    nextCookies(), // Must be last in the plugins array for Next.js App Router
  ],
});

export { db as authDb };