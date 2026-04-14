const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function buildToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
}

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const result = await db.query(
    `
      SELECT id, name, email, role, password_hash AS "passwordHash"
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);

  if (!matches) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = buildToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const result = await db.query(
    `
      SELECT id, name, email, role
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [req.user.id]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.json({ user });
});

module.exports = router;
