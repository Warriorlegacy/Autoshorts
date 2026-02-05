const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(process.cwd(), 'autoshorts.db');

console.log('Initializing database at:', DB_PATH);

// Remove existing database if corrupted
if (fs.existsSync(DB_PATH)) {
  console.log('Removing existing database...');
  fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const schemaPath = path.join(process.cwd(), 'migrations', '001_initial_schema.sql');

if (!fs.existsSync(schemaPath)) {
  console.error('Schema file not found:', schemaPath);
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf-8');

console.log('Executing schema...');

// Execute entire schema at once
try {
  db.exec(schema);
  console.log('✓ Schema executed successfully');
} catch (err) {
  console.error('Error executing schema:', err);
  process.exit(1);
}

// Verify tables were created
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\nCreated tables:');
tables.forEach(t => console.log('  -', t.name));

const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
console.log('\nCreated indexes:');
indexes.forEach(i => console.log('  -', i.name));

console.log('\n✓ Database initialization complete');
db.close();
