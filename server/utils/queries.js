const COURSE_SELECT = `
  SELECT
    c.id,
    c.title,
    c.description,
    c.duration_minutes AS "durationMinutes",
    c.total_views AS "totalViews",
    (
      SELECT COUNT(*)
      FROM course_allocations ca
      WHERE ca.course_id = c.id AND ca.is_active = TRUE
    )::int AS "usedViews"
  FROM courses c
  ORDER BY c.id
  LIMIT 1
`;

module.exports = {
  COURSE_SELECT,
};
