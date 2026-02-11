const pool = require('./database');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function initializeDatabase() {
  try {
    console.log('🔧 Starting database initialization...');

    // Create tables
    console.log('📋 Creating tables...');

    await pool.query(`
      DROP TABLE IF EXISTS REPAIR_REQUEST CASCADE;
      DROP TABLE IF EXISTS "USER" CASCADE;
      DROP TABLE IF EXISTS buildings CASCADE;
    `);

    // Create USER table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "USER" (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100) UNIQUE,
        first_name VARCHAR(100),
        student_id_staff_id VARCHAR(20),
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'technician', 'supervisor', 'admin')),
        department VARCHAR(100),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create REPAIR_REQUEST table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS REPAIR_REQUEST (
        request_id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        building_id INT,
        description TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'pending_approval', 'waiting_parts')),
        image_before_path VARCHAR(255),
        image_after_path VARCHAR(255),
        assigned_to INT,
        lat DECIMAL(10, 8),
        lng DECIMAL(11, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES "USER"(user_id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_to) REFERENCES "USER"(user_id) ON DELETE SET NULL,
        FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL
      );
    `);

    // Create BUILDINGS table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        faculty VARCHAR(255),
        lat DECIMAL(10, 8) NOT NULL,
        lng DECIMAL(11, 8) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables created successfully!');

    // Insert test data
    console.log('👥 Inserting test users...');

    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('password123', 10);
    const hashedPassword3 = await bcrypt.hash('password123', 10);
    const hashedPassword4 = await bcrypt.hash('password123', 10);

    await pool.query(`
      INSERT INTO "USER" (username, password, email, first_name, student_id_staff_id, role, department, phone)
      VALUES 
        ('user1', $1, 'user1@sru.ac.th', 'สมชาย ใจดี', '6301234567', 'user', 'คณะครุศาสตร์', '0812345678'),
        ('tech1', $2, 'tech1@sru.ac.th', 'เสรี ประณีต', '6400001111', 'technician', 'สำนักงานอธิการบดี', '0898765432'),
        ('supervisor1', $3, 'super1@sru.ac.th', 'อรุณ สุขศรัทธา', '6500002222', 'supervisor', 'สำนักงานอธิการบดี', '0892223333'),
        ('admin1', $4, 'admin1@sru.ac.th', 'วิษณุ สมบูรณ์', '6600003333', 'admin', 'สำนักงานอธิการบดี', '0884445555');
    `, [hashedPassword1, hashedPassword2, hashedPassword3, hashedPassword4]);

    console.log('✅ Test users inserted!');

    // Insert test repair requests
    console.log('🔧 Inserting test repair requests...');

    await pool.query(`
      INSERT INTO REPAIR_REQUEST (user_id, description, status, assigned_to, lat, lng)
      VALUES 
        (1, 'แอร์ห้องเรียน 101 เสียบ', 'pending', 2, 13.7563, 100.5018),
        (1, 'ประตูห้องสมุดติด', 'in_progress', 2, 13.7550, 100.5030),
        (1, 'ไฟห้องน้ำชั้น 2 ไม่สว่าง', 'completed', 2, 13.7570, 100.5000);
    `);

    console.log('✅ Test repair requests inserted!');

    console.log('\n✨ Database initialization completed successfully!');
    console.log('\n📝 Test Users:');
    console.log('  Regular User:   user1 / password123 (user)');
    console.log('  Technician:     tech1 / password123 (technician)');
    console.log('  Supervisor:     supervisor1 / password123 (supervisor)');
    console.log('  Admin:          admin1 / password123 (admin)');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    process.exit(1);
  }
}

initializeDatabase();
