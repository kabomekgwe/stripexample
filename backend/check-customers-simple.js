const Database = require('better-sqlite3');
const db = new Database('/app/data/sqlite.db');
const rows = db.prepare('SELECT * FROM billing_customers').all();
console.log('--- CUSTOMERS IN DB ---');
console.log(JSON.stringify(rows, null, 2));
console.log('--- TOTAL:', rows.length);
db.close();
