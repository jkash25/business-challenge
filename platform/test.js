const oracledb = require('oracledb');
require('dotenv').config();

async function testOracleConnection() {
  try {
    const connection = await oracledb.getConnection({
      user: process.env.ORACLE_USER,
      password: process.env.ORACLE_PASSWORD,
      connectString: process.env.ORACLE_CONNECT_STRING
    });

    const result = await connection.execute('SELECT name, marshacode FROM hotel fetch first 5 rows only');
    console.log(result.rows);

    await connection.close();
  } catch (err) {
    console.error('Oracle query failed:', err);
  }
}

testOracleConnection();
