const pool = require('./database');
require('dotenv').config();

async function migrate() {
    try {
        console.log('🔧 Adding specialty column to USER table...');

        await pool.query(`
      ALTER TABLE "USER"
      ADD COLUMN IF NOT EXISTS specialty VARCHAR(100) DEFAULT NULL;
    `);

        console.log('✅ Migration completed: specialty column added.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration error:', err);
        process.exit(1);
    }
}

migrate();
