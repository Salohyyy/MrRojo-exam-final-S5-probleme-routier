const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { initDb, getTests, createTest } = require('../metiers/testService');

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

initDb(pool).catch(err => {
  console.error('Erreur d’initialisation de la base de données', err);
});

app.get('/test', async (req, res) => {
  try {
    const tests = await getTests(pool);
    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la récupération des tests' });
  }
});

app.post('/test', async (req, res) => {
  try {
    const { description } = req.body;
    const created = await createTest(pool, description);
    res.json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création du test' });
  }
});

app.listen(4000, () => {
  console.log('API running on port 4000');
});

