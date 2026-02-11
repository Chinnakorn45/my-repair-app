const pool = require('./database');

async function migrate() {
    try {
        console.log('🔄 Starting migration for repair table...');

        await pool.query(`
      CREATE TABLE IF NOT EXISTS repair (
        repair_id SERIAL PRIMARY KEY,
        request_id INT NOT NULL,
        user_id INT NOT NULL,
        repair_detail TEXT,
        repair_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        repair_status VARCHAR(50),
        image_after TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES repair_request(request_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES "USER"(user_id) ON DELETE SET NULL
      );
    `);

        console.log('✅ Migration completed: repair table verified/created.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
