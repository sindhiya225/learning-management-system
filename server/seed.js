const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const db = require("./db");

dotenv.config();

async function seed() {
  const adminPassword = await bcrypt.hash("admin123", 10);
  const employeePassword = await bcrypt.hash("emp123", 10);

  await db.query(
    `
      INSERT INTO users (name, email, role, password_hash)
      VALUES
        ('Alex Admin', 'admin@org.com', 'admin', $1),
        ('Sarah Chen', 'sarah@org.com', 'employee', $2),
        ('Marcus Webb', 'marcus@org.com', 'employee', $2),
        ('Priya Nair', 'priya@org.com', 'employee', $2),
        ('James Obi', 'james@org.com', 'employee', $2),
        ('Aiko Tanaka', 'aiko@org.com', 'employee', $2),
        ('Carlos Ruiz', 'carlos@org.com', 'employee', $2)
      ON CONFLICT (email) DO NOTHING
    `,
    [adminPassword, employeePassword]
  );

  await db.query(
    `
      INSERT INTO courses (id, title, description, duration_minutes, total_views)
      VALUES (
        1,
        'Foundations of Customer Success',
        'Learn the core principles of customer success, churn reduction, and account growth strategies used by top SaaS companies.',
        45,
        100
      )
      ON CONFLICT (id) DO UPDATE
      SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        duration_minutes = EXCLUDED.duration_minutes,
        total_views = EXCLUDED.total_views,
        updated_at = NOW()
    `
  );

  console.log("Seed completed successfully.");
  await db.pool.end();
}

seed().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await db.pool.end();
  process.exit(1);
});
