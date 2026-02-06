const pool = require('../config/database');

// ========================
// COMPANIES
// ========================
async function getCompanies(req, res) {
    try {
        const result = await pool.query(
            'SELECT id, name, address FROM companies ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur getCompanies:', error);
        res.status(500).json({ error: error.message });
    }
}

async function createCompany(req, res) {
    try {
        const { name, address } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Le nom est requis' });
        }

        const result = await pool.query(
            'INSERT INTO companies (name, address) VALUES ($1, $2) RETURNING *',
            [name, address || '']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur createCompany:', error);
        res.status(500).json({ error: error.message });
    }
}

async function updateCompany(req, res) {
    try {
        const { id } = req.params;
        const { name, address } = req.body;

        const result = await pool.query(
            'UPDATE companies SET name = $1, address = $2 WHERE id = $3 RETURNING *',
            [name, address, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entreprise non trouvée' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur updateCompany:', error);
        res.status(500).json({ error: error.message });
    }
}

async function deleteCompany(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM companies WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Entreprise non trouvée' });
        }

        res.json({ message: 'Entreprise supprimée avec succès' });
    } catch (error) {
        console.error('Erreur deleteCompany:', error);
        res.status(500).json({ error: error.message });
    }
}

// ========================
// REPORT STATUSES
// ========================
async function getReportStatuses(req, res) {
    try {
        const result = await pool.query(
            'SELECT id, name, level FROM report_statuses ORDER BY level'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur getReportStatuses:', error);
        res.status(500).json({ error: error.message });
    }
}

async function createReportStatus(req, res) {
    try {
        const { name, level } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Le nom est requis' });
        }

        const result = await pool.query(
            'INSERT INTO report_statuses (name, level) VALUES ($1, $2) RETURNING *',
            [name, level || 0]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erreur createReportStatus:', error);
        res.status(500).json({ error: error.message });
    }
}

async function updateReportStatus(req, res) {
    try {
        const { id } = req.params;
        const { name, level } = req.body;

        const result = await pool.query(
            'UPDATE report_statuses SET name = $1, level = $2 WHERE id = $3 RETURNING *',
            [name, level, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Statut non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erreur updateReportStatus:', error);
        res.status(500).json({ error: error.message });
    }
}

async function deleteReportStatus(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM report_statuses WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Statut non trouvé' });
        }

        res.json({ message: 'Statut supprimé avec succès' });
    } catch (error) {
        console.error('Erreur deleteReportStatus:', error);
        res.status(500).json({ error: error.message });
    }
}

// ========================
// PROBLEM TYPES
// ========================
async function getProblemTypes(req, res) {
    try {
        const result = await pool.query(
            'SELECT id, name FROM problem_types ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erreur getProblemTypes:', error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    // Companies
    getCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    // Report Statuses
    getReportStatuses,
    createReportStatus,
    updateReportStatus,
    deleteReportStatus,
    // Problem Types
    getProblemTypes
};