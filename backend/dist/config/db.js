"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = exports.testConnection = exports.query = exports.getDb = exports.initializeDatabase = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// SQLite Database connection
const DB_PATH = path_1.default.join(process.cwd(), 'autoshorts.db');
let db;
// Initialize database
const initializeDatabase = () => {
    if (db)
        return db;
    db = new better_sqlite3_1.default(DB_PATH);
    db.pragma('journal_mode = WAL');
    console.log(`✓ SQLite database initialized at ${DB_PATH}`);
    return db;
};
exports.initializeDatabase = initializeDatabase;
// Get database instance
const getDb = () => {
    if (!db) {
        (0, exports.initializeDatabase)();
    }
    return db;
};
exports.getDb = getDb;
const query = async (text, params) => {
    try {
        const database = (0, exports.getDb)();
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
                const row = selectStmt.get(rowId);
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
        }
        else if (sqliteText.trim().toUpperCase().startsWith('UPDATE')) {
            const stmt = database.prepare(sqliteText);
            const result = stmt.run(...(params || []));
            return {
                rows: [],
                rowCount: result.changes
            };
        }
        else if (sqliteText.trim().toUpperCase().startsWith('DELETE')) {
            const stmt = database.prepare(sqliteText);
            const result = stmt.run(...(params || []));
            return {
                rows: [],
                rowCount: result.changes
            };
        }
        else {
            // SELECT query
            const stmt = database.prepare(sqliteText);
            const rows = stmt.all(...(params || []));
            return {
                rows,
                rowCount: rows.length
            };
        }
    }
    catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};
exports.query = query;
// Test database connection
const testConnection = async () => {
    try {
        const database = (0, exports.getDb)();
        const result = database.prepare("SELECT datetime('now') as now").get();
        console.log('✓ Database connection successful. Current time:', result.now);
    }
    catch (error) {
        console.error('✗ Database connection failed:', error);
        throw error;
    }
};
exports.testConnection = testConnection;
// Initialize database with schema
const initDB = async () => {
    try {
        const database = (0, exports.getDb)();
        // Read and execute schema file
        const schemaPath = path_1.default.join(process.cwd(), 'migrations', '001_initial_schema.sql');
        if (fs_1.default.existsSync(schemaPath)) {
            const schema = fs_1.default.readFileSync(schemaPath, 'utf8');
            const statements = schema.split(';').filter(s => s.trim());
            console.log(`Loading schema from: ${schemaPath}`);
            console.log(`Found ${statements.length} statements to execute`);
            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i].trim();
                if (stmt) {
                    try {
                        database.exec(stmt);
                        console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
                    }
                    catch (err) {
                        console.warn(`⚠ Statement ${i + 1} failed (may already exist):`, err);
                    }
                }
            }
            console.log('✓ Database schema initialized');
        }
        else {
            console.warn('⚠ Schema file not found, skipping initialization');
        }
    }
    catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};
exports.initDB = initDB;
//# sourceMappingURL=db.js.map