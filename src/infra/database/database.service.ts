import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { runInSpan } from '../../observability/tracing.util';
import { schema } from './schema';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly sqlite: Database.Database;
  readonly db: BetterSQLite3Database<typeof schema>;

  /** Creates and configures the shared Drizzle/SQLite client. */
  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    this.sqlite = new Database(databaseUrl);
    this.db = drizzle(this.sqlite, { schema });
  }

  /** Closes the SQLite connection during application shutdown. */
  async onModuleInit(): Promise<void> {
    await runInSpan(
      'infra.database.healthcheck',
      {
        'code.function': 'onModuleInit',
        'db.system': 'sqlite',
      },
      async () => {
        await this.db.run(sql`select 1`);
      },
    );
  }

  /** Closes the SQLite connection during application shutdown. */
  onModuleDestroy(): void {
    this.sqlite.close();
  }
}
