import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as fs from 'fs';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres connection with SSL
const client = postgres(process.env.DATABASE_URL, {
  ssl: {
    ca: fs.readFileSync('./ca-certificate.crt').toString(),
  },
});

// Create drizzle instance
export const db = drizzle(client, { schema });
