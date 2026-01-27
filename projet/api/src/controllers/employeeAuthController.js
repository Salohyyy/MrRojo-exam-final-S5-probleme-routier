const pool = require('../config/database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

async function loginEmployee(req, res) {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT e.id, e.username, e.email, e.password, r.name as role_name
       FROM employees e
       JOIN roles r ON e.role_id = r.id
       WHERE e.username = $1 OR e.email = $1`,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const employee = result.rows[0];

    if (password !== employee.password) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      {
        id: employee.id,
        username: employee.username,
        email: employee.email,
        role: employee.role_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      employee: {
        id: employee.id,
        username: employee.username,
        email: employee.email,
        role: employee.role_name
      }
    });

  } catch (error) {
    console.error('Erreur login employee:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function verifyEmployeeToken(req, res) {
  try {
    res.json({
      valid: true,
      employee: req.employee
    });
  } catch (error) {
    console.error('Erreur verify token:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  loginEmployee,
  verifyEmployeeToken
};