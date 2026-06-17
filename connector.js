require('dotenv').config()

const mysql = require('mysql2/promise')
const config = require('./config/database')

const CONCURRENCY = parseInt(process.env.CONCURRENCY ?? '5', 10)

const pool = mysql.createPool({
  ...config,
  multipleStatements: true,
  connectionLimit: CONCURRENCY,
  waitForConnections: true,
  queueLimit: 0,
})

// Run the statement against a single database in one round trip (`USE db; SQL`).
// Returns the rows of the last statement (the SQL_STATEMENT result set).
async function queryDatabase (database, statement) {
  const conn = await pool.getConnection()
  try {
    const [results] = await conn.query(`USE \`${database}\`; ${statement}`)
    return Array.isArray(results) ? results[results.length - 1] : results
  } finally {
    conn.release()
  }
}

module.exports = {
  pool,
  queryDatabase,
}
