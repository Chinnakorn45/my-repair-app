const pool = require('./database');

const createTable = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES "USER"(user_id)
      );
    `);
        console.log("✅ Table 'announcements' created successfully!");
    } catch (err) {
        console.error("❌ Error creating table:", err);
    } finally {
        pool.end();
    }
};

createTable();
