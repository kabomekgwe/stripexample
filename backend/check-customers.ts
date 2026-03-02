import { DatabaseService } from './src/infra/database/database.service';
import { billingCustomers } from './src/infra/database/schema';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dbService = app.get(DatabaseService);
    const customers = await dbService.db.select().from(billingCustomers);
    console.log('--- CUSTOMERS IN DB ---');
    console.log(JSON.stringify(customers, null, 2));
    console.log('--- TOTAL:', customers.length);
    await app.close();
}

run().catch(console.error);
