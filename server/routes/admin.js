const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { COURSE_SELECT } = require("../utils/queries");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/dashboard", async (req, res) => {
  const [courseResult, employeesResult, completionsByDayResult] = await Promise.all([
    db.query(COURSE_SELECT),
    db.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        COALESCE(ca.is_active, FALSE) AS allocated,
        COALESCE(cp.progress_percent, 0) AS progress,
        COALESCE(cp.completed, FALSE) AS completed,
        TO_CHAR(cp.completed_at, 'DD Mon YYYY') AS "completedAt"
      FROM users u
      LEFT JOIN course_allocations ca ON ca.employee_id = u.id AND ca.is_active = TRUE
      LEFT JOIN course_progress cp ON cp.employee_id = u.id
      WHERE u.role = 'employee'
      ORDER BY u.name
    `),
    db.query(`
      SELECT
        TO_CHAR(date_trunc('day', completed_at), 'Dy') AS day,
        COUNT(*)::int AS total
      FROM course_progress
      WHERE completed = TRUE
        AND completed_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY date_trunc('day', completed_at)
      ORDER BY date_trunc('day', completed_at)
    `),
  ]);

  const course = courseResult.rows[0];
  const employees = employeesResult.rows;

  const allocatedCount = employees.filter((employee) => employee.allocated).length;
  const completedCount = employees.filter((employee) => employee.completed).length;
  const inProgressCount = employees.filter((employee) => employee.allocated && !employee.completed).length;
  const notStartedCount = employees.length - allocatedCount;

  const weeklyDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const completionsMap = Object.fromEntries(
    completionsByDayResult.rows.map((row) => [row.day.trim(), row.total])
  );
  const weeklyCompletions = weeklyDays.map((day) => ({
    day,
    total: completionsMap[day] || 0,
  }));

  return res.json({
    course,
    stats: {
      totalEmployees: employees.length,
      allocatedCount,
      completedCount,
      inProgressCount,
      notStartedCount,
    },
    weeklyCompletions,
    employees,
  });
});

router.get("/employees", async (req, res) => {
  const result = await db.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      COALESCE(ca.is_active, FALSE) AS allocated,
      COALESCE(cp.progress_percent, 0) AS progress,
      COALESCE(cp.completed, FALSE) AS completed,
      TO_CHAR(cp.started_at, 'DD Mon YYYY') AS "startedAt",
      TO_CHAR(cp.completed_at, 'DD Mon YYYY') AS "completedAt"
    FROM users u
    LEFT JOIN course_allocations ca ON ca.employee_id = u.id AND ca.is_active = TRUE
    LEFT JOIN course_progress cp ON cp.employee_id = u.id
    WHERE u.role = 'employee'
    ORDER BY u.name
  `);

  return res.json({ employees: result.rows });
});

router.post("/allocations", async (req, res) => {
  const { employeeIds } = req.body;

  if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
    return res.status(400).json({ message: "Select at least one employee." });
  }

  const courseResult = await db.query(COURSE_SELECT);
  const course = courseResult.rows[0];
  const remainingViews = course.totalViews - course.usedViews;

  if (employeeIds.length > remainingViews) {
    return res.status(400).json({ message: `Only ${remainingViews} course views are left.` });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    for (const employeeId of employeeIds) {
      await client.query(
        `
          INSERT INTO course_allocations (course_id, employee_id, is_active)
          VALUES ($1, $2, TRUE)
          ON CONFLICT (course_id, employee_id)
          DO UPDATE SET is_active = TRUE, updated_at = NOW()
        `,
        [course.id, employeeId]
      );

      await client.query(
        `
          INSERT INTO course_progress (course_id, employee_id, progress_percent, completed)
          VALUES ($1, $2, 0, FALSE)
          ON CONFLICT (course_id, employee_id)
          DO NOTHING
        `,
        [course.id, employeeId]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return res.json({ message: "Course allocated successfully." });
});

router.delete("/allocations/:employeeId", async (req, res) => {
  const employeeId = Number(req.params.employeeId);

  if (!employeeId) {
    return res.status(400).json({ message: "A valid employee id is required." });
  }

  await db.query(
    `
      UPDATE course_allocations
      SET is_active = FALSE, updated_at = NOW()
      WHERE employee_id = $1
    `,
    [employeeId]
  );

  await db.query(
    `
      UPDATE course_progress
      SET progress_percent = 0, completed = FALSE, started_at = NULL, completed_at = NULL, updated_at = NOW()
      WHERE employee_id = $1
    `,
    [employeeId]
  );

  return res.json({ message: "Employee access revoked." });
});

router.get("/course", async (req, res) => {
  const result = await db.query(COURSE_SELECT);
  return res.json({ course: result.rows[0] });
});

router.put("/course", async (req, res) => {
  const { title, description, durationMinutes, totalViews } = req.body;

  if (
    !title ||
    !description ||
    Number.isNaN(Number(durationMinutes)) ||
    Number.isNaN(Number(totalViews))
  ) {
    return res.status(400).json({ message: "All course fields are required." });
  }

  await db.query(
    `
      UPDATE courses
      SET
        title = $1,
        description = $2,
        duration_minutes = $3,
        total_views = $4,
        updated_at = NOW()
      WHERE id = 1
    `,
    [title.trim(), description.trim(), Number(durationMinutes), Number(totalViews)]
  );

  const result = await db.query(COURSE_SELECT);
  return res.json({ message: "Course updated successfully.", course: result.rows[0] });
});

module.exports = router;
