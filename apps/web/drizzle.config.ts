import {config} from 'dotenv';
import {defineConfig} from 'drizzle-kit';

config({path: '.env'});

export default defineConfig({
  schema: './lib/db/drizzle-schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DRIZZLE_DATABASE_URL!,
  },
});
