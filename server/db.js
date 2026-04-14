const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing. Add it to your .env file.");
}

const pool = new Pool({
  connectionString,
});

module.exports = {
  pool,
  query(text, params) {
    return pool.query(text, params);
  },
};
