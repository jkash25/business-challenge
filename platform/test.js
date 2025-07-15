const { Pool } = require("pg");
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const { v4: uuidv4 } = require("uuid"); 

async function testQuery() {
  try {
    const id = uuidv4();
    const res = await pool.query("INSERT INTO users (id, name, email) VALUES ($1, $2, $3) RETURNING *", [id, 'bobby', 'test@testing.com']);
    console.log(" Query successful. Sample rows:");
    console.table(res.rows);
  } catch (err) {
    console.error(" Query failed:", err);
  } finally {
    await pool.end();
  }
}

testQuery();
