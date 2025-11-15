import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection with SSL certificate from env
// Using DigitalOcean connection pooler for optimal connection management
const client = postgres(process.env.DATABASE_URL, {
  ssl: process.env.DATABASE_CA_CERT
    ? { ca: process.env.DATABASE_CA_CERT }
    : undefined,
});

// Create drizzle instance
export const db = drizzle(client, { schema });
