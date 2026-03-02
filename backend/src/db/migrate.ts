import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import * as path from 'path';

async function runMigrations() {
    const dbPath = process.env.DATABASE_URL ?? './sqlite.db';
    console.log(`Running migrations on ${dbPath}...`);

    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite);

    // Path to migrations folder relative to the compiled JS file
    // In production, it will be in /app/backend/drizzle or similar
    const migrationsFolder = path.join(__dirname, '../../../drizzle');

    try {
        await migrate(db, { migrationsFolder });
        console.log('Migrations completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        sqlite.close();
    }
}

runMigrations();
