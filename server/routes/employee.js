const express = require("express");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { COURSE_SELECT } = require("../utils/queries");

const router = express.Router();

router.use(requireAuth, requireRole("employee"));

router.get("/course", async (req, res) => {
  const [courseResult, progressResult] = await Promise.all([
    db.query(COURSE_SELECT),
    db.query(
      `
        SELECT
          COALESCE(ca.is_active, FALSE) AS allocated,
          COALESCE(cp.progress_percent, 0) AS progress,
          COALESCE(cp.completed, FALSE) AS completed,
          TO_CHAR(cp.started_at, 'DD Mon YYYY') AS "startedAt",
          TO_CHAR(cp.completed_at, 'DD Mon YYYY') AS "completedAt"
        FROM users u
        LEFT JOIN course_allocations ca ON ca.employee_id = u.id AND ca.is_active = TRUE
        LEFT JOIN course_progress cp ON cp.employee_id = u.id
        WHERE u.id = $1
        LIMIT 1
      `,
      [req.user.id]
    ),
  ]);

  return res.json({
    course: courseResult.rows[0],
    progress: progressResult.rows[0],
  });
});

router.post("/progress", async (req, res) => {
  const nextProgress = Number(req.body.progress);

  if (Number.isNaN(nextProgress) || nextProgress < 0 || nextProgress > 100) {
    return res.status(400).json({ message: "Progress must be between 0 and 100." });
  }

  const allocationResult = await db.query(
    `
      SELECT is_active
      FROM course_allocations
      WHERE employee_id = $1 AND course_id = 1
      LIMIT 1
    `,
    [req.user.id]
  );

  if (!allocationResult.rows[0]?.is_active) {
    return res.status(403).json({ message: "You do not currently have access to this course." });
  }

  await db.query(
    `
      UPDATE course_progress
      SET
        progress_percent = $1,
        started_at = COALESCE(started_at, NOW()),
        updated_at = NOW()
      WHERE course_id = 1 AND employee_id = $2
    `,
    [nextProgress, req.user.id]
  );

  return res.json({ message: "Progress saved." });
});

router.post("/complete", async (req, res) => {
  const allocationResult = await db.query(
    `
      SELECT is_active
      FROM course_allocations
      WHERE employee_id = $1 AND course_id = 1
      LIMIT 1
    `,
    [req.user.id]
  );

  if (!allocationResult.rows[0]?.is_active) {
    return res.status(403).json({ message: "You do not currently have access to this course." });
  }

  const result = await db.query(
    `
      UPDATE course_progress
      SET
        progress_percent = 100,
        completed = TRUE,
        started_at = COALESCE(started_at, NOW()),
        completed_at = NOW(),
        updated_at = NOW()
      WHERE course_id = 1 AND employee_id = $1
      RETURNING progress_percent AS progress, completed, TO_CHAR(completed_at, 'DD Mon YYYY') AS "completedAt"
    `,
    [req.user.id]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ message: "Course progress record was not found." });
  }

  return res.json({
    message: "Course marked as completed.",
    progress: result.rows[0],
  });
});

module.exports = router;
