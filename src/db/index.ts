import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection with SSL certificate from env
// Configured for serverless with minimal connections
const client = postgres(process.env.DATABASE_URL, {
  max: 1, // Only 1 connection per serverless instance
  idle_timeout: 20, // Close idle connections after 20 seconds
  max_lifetime: 60 * 30, // Close connections after 30 minutes
  ssl: process.env.DATABASE_CA_CERT
    ? { ca: process.env.DATABASE_CA_CERT }
    : undefined,
});

// Create drizzle instance
export const db = drizzle(client, { schema });
