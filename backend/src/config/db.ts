import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

dotenv.config();

// SQLite Database connection
const DB_PATH = path.join(process.cwd(), 'autoshorts.db');
let db: Database.Database;

// Initialize database
export const initializeDatabase = (): Database.Database => {
  if (db) return db;
  
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  console.log(`✓ SQLite database initialized at ${DB_PATH}`);
  return db;
};

// Get database instance
export const getDb = (): Database.Database => {
  if (!db) {
    initializeDatabase();
  }
  return db;
};

// Query function that mimics pg QueryResult interface
export interface QueryResult {
  rows: any[];
  rowCount: number;
}

export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  try {
    const database = getDb();
    
    // Check if this is an INSERT with RETURNING clause
    const returningMatch = text.match(/RETURNING\s+(.+)$/i);
    const hasReturning = !!returningMatch;
    
    // Convert PostgreSQL syntax to SQLite
    let sqliteText = text
      .replace(/\$(\d+)/g, () => '?')
      .replace(/NOW\(\)/gi, "datetime('now')")
      .replace(/datetime\("now"\)/gi, "datetime('now')");
    
    // Handle different query types
    if (sqliteText.trim().toUpperCase().startsWith('INSERT')) {
      // Extract table name from INSERT statement
      const tableMatch = sqliteText.match(/INSERT\s+INTO\s+(\w+)/i);
      if (!tableMatch) {
        throw new Error('Could not extract table name from INSERT statement');
      }
      const tableName = tableMatch[1];
      
      // Remove RETURNING clause for execution
      const insertText = sqliteText.replace(/RETURNING\s+.+$/i, '');
      const insertStmt = database.prepare(insertText);
      const result = insertStmt.run(...(params || []));
      
      // If RETURNING was specified, fetch the inserted row
      if (hasReturning && returningMatch) {
        const rowId = result.lastInsertRowid;
        // Fetch all columns from the inserted row
        const selectStmt = database.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`);
        const row: any = selectStmt.get(rowId);
        // Ensure id is set from rowid if not present
        if (row && !row.id) {
          row.id = rowId.toString();
        }
        return {
          rows: row ? [row] : [],
          rowCount: result.changes
        };
      }
      
      return {
        rows: [{ id: result.lastInsertRowid }],
        rowCount: result.changes
      };
    } else if (sqliteText.trim().toUpperCase().startsWith('UPDATE')) {
      const stmt = database.prepare(sqliteText);
      const result = stmt.run(...(params || []));
      return {
        rows: [],
        rowCount: result.changes
      };
    } else if (sqliteText.trim().toUpperCase().startsWith('DELETE')) {
      const stmt = database.prepare(sqliteText);
      const result = stmt.run(...(params || []));
      return {
        rows: [],
        rowCount: result.changes
      };
    } else {
      // SELECT query
      const stmt = database.prepare(sqliteText);
      const rows = stmt.all(...(params || []));
      return {
        rows,
        rowCount: rows.length
      };
    }
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
};

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    const database = getDb();
    const result = database.prepare("SELECT datetime('now') as now").get();
    console.log('✓ Database connection successful. Current time:', (result as any).now);
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    throw error;
  }
};

// Initialize database with schema
export const initDB = async (): Promise<void> => {
  try {
    const database = getDb();
    
    // Read and execute schema file
    const schemaPath = path.join(process.cwd(), 'migrations', '001_initial_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(s => s.trim());
      console.log(`Loading schema from: ${schemaPath}`);
      console.log(`Found ${statements.length} statements to execute`);
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i].trim();
        if (stmt) {
          try {
            database.exec(stmt);
            console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
          } catch (err) {
            console.warn(`⚠ Statement ${i + 1} failed (may already exist):`, err);
          }
        }
      }
      console.log('✓ Database schema initialized');
    } else {
      console.warn('⚠ Schema file not found, skipping initialization');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};
