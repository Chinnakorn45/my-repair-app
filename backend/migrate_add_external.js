const pool = require('./database');

async function migrate() {
    try {
        console.log('🔄 Starting migration...');

        // Add is_external and external_agency columns if they don't exist
        await pool.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repair_request' AND column_name='is_external') THEN
              ALTER TABLE REPAIR_REQUEST ADD COLUMN is_external BOOLEAN DEFAULT FALSE;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='repair_request' AND column_name='external_agency') THEN
              ALTER TABLE REPAIR_REQUEST ADD COLUMN external_agency VARCHAR(255);
          END IF;
      END
      $$;
    `);

        console.log('✅ Migration completed: Added is_external and external_agency columns.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
