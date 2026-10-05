import { defineConfig } from 'drizzle-kit';

// Generates SQLite migrations for expo-sqlite. `driver: 'expo'` also emits
// `drizzle/migrations.js`, which bundles the .sql files (inlined by
// babel-plugin-inline-import) for `migrate()` at app start.
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/data/schema.ts',
  out: './drizzle',
});
