const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: 5432
});

// Création table test si pas existante
pool.query(`
  CREATE TABLE IF NOT EXISTS test(
    id SERIAL PRIMARY KEY,
    description VARCHAR(255)
  )
`);

app.get('/test', async (req, res) => {
  const result = await pool.query('SELECT * FROM test');
  res.json(result.rows);
});

app.post('/test', async (req, res) => {
  const { description } = req.body;
  const result = await pool.query('INSERT INTO test(description) VALUES($1) RETURNING *', [description]);
  res.json(result.rows[0]);
});

app.listen(4000, () => {
  console.log('API running on port 4000');
});
