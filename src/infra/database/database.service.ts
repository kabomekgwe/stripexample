import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { schema } from './schema';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly sqlite: Database.Database;
  readonly db: BetterSQLite3Database<typeof schema>;

  /** Creates and configures the shared Drizzle/SQLite client. */
  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    this.sqlite = new Database(databaseUrl);
    this.db = drizzle(this.sqlite, { schema });
  }

  /** Closes the SQLite connection during application shutdown. */
  async onModuleDestroy(): Promise<void> {
    this.sqlite.close();
  }
}
