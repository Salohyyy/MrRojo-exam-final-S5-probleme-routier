require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration de la base de données
const pool = new Pool({
  host: 'postgres',
  port: 5432,
  database: 'routes_db',
  user: 'admin',
  password: 'admin',
});

// Route de test pour vérifier la connexion
app.get('/api/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time');
    res.json({ 
      message: 'Connexion à PostgreSQL réussie!',
      time: result.rows[0].time 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Récupérer tous les items de test
app.get('/api/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM test_items ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ajouter un nouvel item
app.post('/api/items', async (req, res) => {
  const { description } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO test_items (description) VALUES ($1) RETURNING *',
      [description]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour les données de carte (exemple)
app.get('/api/routes', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, ST_AsGeoJSON(geom) as geometry FROM routes'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`API server running on port ${port}`);
});
