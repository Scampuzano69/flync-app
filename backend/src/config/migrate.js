const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const run = async (file) => {
    const sql = fs.readFileSync(path.join(__dirname, "../../migrations/" + file), "utf8");
    const stmts = sql.split(";").map(s => s.trim()).filter(s => s.length > 5);
    let ok=0, skip=0;
    for (const s of stmts) {
      try { await pool.query(s); ok++; }
      catch(e) { if(["42P07","42710","23505"].includes(e.code)||e.message.includes("already exists")) skip++; else console.warn("skip:",e.message.substring(0,60)); }
    }
    console.log(file + ": " + ok + " OK, " + skip + " skip");
  };
  try { await run("001_schema.sql"); await run("002_seed.sql"); console.log("Migraciones OK"); }
  catch(e) { console.error("Error migracion:", e.message); }
  finally { await pool.end(); }
}

module.exports = migrate;