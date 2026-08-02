const { createClient } = require('@libsql/client');

const tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://edgartech-db-edgarizkys.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN || ''
});

async function initializeDatabase() {
    try {
        await tursoClient.execute(`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, tenant_id TEXT DEFAULT 'default', name TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
        console.log('[DB] Table items (Multi-Tenant) ready');
    } catch(e) { console.log('DB Notice:', e.message); }
}

module.exports = { tursoClient, initializeDatabase };