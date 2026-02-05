// migrate.js
require('dotenv').config({ path: './.env' });

module.exports = {
  default: {
    databaseUrl: `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT}/${process.env.PGDATABASE}`,
    dir: 'migrations',
    direction: 'up',
    count: Infinity,
    migrationsTable: 'pgmigrations',
    verbose: true,
    sql: true
  }
};