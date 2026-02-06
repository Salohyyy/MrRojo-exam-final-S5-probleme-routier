<<<<<<< HEAD

-- Création de la table pour les paramètres de session
CREATE TABLE IF NOT EXISTS session_settings (
    id SERIAL PRIMARY KEY,
    session_duration_hours INTEGER NOT NULL DEFAULT 24,
    max_login_attempts INTEGER NOT NULL DEFAULT 3,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
=======
-- Tables existantes (votre base - inchangées)
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50)
>>>>>>> origin/espace-employe-fonctionnel
);

CREATE TABLE IF NOT EXISTS problem_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50),
    address VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS report_statuses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50),
    level NUMERIC(15,2)
);

CREATE TABLE IF NOT EXISTS user_statuses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50)
);

-- Table employees pour authentification LOCALE (mot de passe en clair)
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Mot de passe en clair
    birth_date DATE,
    role_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Table users (vide ou pour données métier uniquement, PAS pour auth)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(50) UNIQUE,
    birth_date DATE,
    user_status_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_status_id) REFERENCES user_statuses(id)
);

CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    reported_at TIMESTAMP,
    longitude NUMERIC(17,2),
    latitude NUMERIC(15,2),
    city VARCHAR(50),
    is_synced BOOLEAN,
    report_status_id BIGINT NOT NULL,
    problem_type_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    FOREIGN KEY (report_status_id) REFERENCES report_statuses(id),
    FOREIGN KEY (problem_type_id) REFERENCES problem_types(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS report_syncs (
    id BIGSERIAL PRIMARY KEY,
    surface VARCHAR(50),
    budget NUMERIC(15,2),
    progress NUMERIC(15,2),
    report_status_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    report_id BIGINT NOT NULL,
    FOREIGN KEY (report_status_id) REFERENCES report_statuses(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE TABLE IF NOT EXISTS user_status_histories (
    id BIGSERIAL PRIMARY KEY,
    changed_at TIMESTAMP,
    employee_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_status_id BIGINT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (user_status_id) REFERENCES user_statuses(id)
);

CREATE TABLE IF NOT EXISTS report_sync_histories (
    id BIGSERIAL PRIMARY KEY,
    changed_at TIMESTAMP,
    report_status_id BIGINT NOT NULL,
    report_sync_id BIGINT NOT NULL,
    FOREIGN KEY (report_status_id) REFERENCES report_statuses(id),
    FOREIGN KEY (report_sync_id) REFERENCES report_syncs(id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour employees
CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

<<<<<<< HEAD
-- Trigger pour user_auth_tracking
CREATE TRIGGER update_user_auth_tracking_updated_at 
    BEFORE UPDATE ON user_auth_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- BUSINESS LOGIC TABLES (From Project Restored)

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE problem_types (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE companies (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50),
    address VARCHAR(50)
);

CREATE TABLE report_statuses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50),
    level NUMERIC(15,2)
);

CREATE TABLE user_statuses (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50)
);

CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(50),
    password VARCHAR(50),
    birth_date DATE,
    role_id BIGINT NOT NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(50),
    password VARCHAR(50),
    birth_date DATE,
    user_status_id BIGINT NOT NULL,
    FOREIGN KEY (user_status_id) REFERENCES user_statuses(id)
);

CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    reported_at TIMESTAMP,
    longitude NUMERIC(17,2),
    latitude NUMERIC(15,2),
    city VARCHAR(50),
    is_synced BOOLEAN,
    firebase_id VARCHAR(255),
    report_status_id BIGINT NOT NULL,
    problem_type_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    FOREIGN KEY (report_status_id) REFERENCES report_statuses(id),
    FOREIGN KEY (problem_type_id) REFERENCES problem_types(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE report_syncs (
    id BIGSERIAL PRIMARY KEY,
    surface VARCHAR(50),
    budget NUMERIC(15,2),
    progress NUMERIC(15,2),
    sent_to_firebase BOOLEAN DEFAULT FALSE,
    report_status_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    report_id BIGINT NOT NULL,
    FOREIGN KEY (report_status_id) REFERENCES report_statuses(id),
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (report_id) REFERENCES reports(id)
);

CREATE TABLE user_status_histories (
    id BIGSERIAL PRIMARY KEY,
    changed_at TIMESTAMP,
    employee_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    user_status_id BIGINT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (user_status_id) REFERENCES user_statuses(id)
);

CREATE TABLE report_sync_histories (
    id BIGSERIAL PRIMARY KEY,
    changed_at TIMESTAMP,
    report_status_id BIGINT NOT NULL,
    report_sync_id BIGINT NOT NULL,
    FOREIGN KEY (report_status_id) REFERENCES report_statuses(id),
    FOREIGN KEY (report_sync_id) REFERENCES report_syncs(id)
);

-- SEED DATA

INSERT INTO roles (name) VALUES ('Admin'), ('Manager');
INSERT INTO problem_types (name) VALUES ('Nid de poule'), ('Fissure'), ('Glissement'), ('Inondation');
INSERT INTO report_statuses (name, level) VALUES ('Nouveau', 1), ('En cours', 2), ('Terminé', 3), ('Rejeté', 0);
INSERT INTO user_statuses (name) VALUES ('Actif'), ('Banni');
INSERT INTO companies (name, address) VALUES ('Colas', 'Antananarivo'), ('Sogea', 'Antananarivo');

INSERT INTO users (username, email, password, birth_date, user_status_id) VALUES 
('johndoe', 'john@example.com', 'password', '1990-01-01', 1),
('janedoe', 'jane@example.com', 'password', '1992-02-02', 1);

-- Reports (Antananarivo coordinates approx: -18.8792, 47.5079)
INSERT INTO reports (reported_at, longitude, latitude, city, is_synced, report_status_id, problem_type_id, user_id) VALUES
(NOW(), 47.5079, -18.8792, 'Anala', false, 1, 1, 1),
(NOW(), 47.5100, -18.8800, 'Arivo', false, 2, 2, 2),
(NOW(), 47.5200, -18.8700, 'Antavo', false, 1, 1, 1);

-- Report Syncs (Work in progress)
INSERT INTO report_syncs (surface, budget, progress, report_status_id, company_id, report_id) VALUES
('50m2', 1500000.00, 0, 1, 1, 1),
('100m2', 5000000.00, 50, 2, 2, 2);
=======
-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Insérer les rôles
INSERT INTO roles (name) VALUES 
    ('admin'), 
    ('employee') 
ON CONFLICT DO NOTHING;

-- Insérer les statuts utilisateur
INSERT INTO user_statuses (name) VALUES 
    ('active'), 
    ('inactive'), 
    ('blocked') 
ON CONFLICT DO NOTHING;

-- ============================================
-- CRÉER L'EMPLOYÉ ADMIN PAR DÉFAUT
-- ============================================
-- Username: admin
-- Email: admin@example.com
-- Password: admin123
-- ============================================

DO $$
DECLARE
    admin_role_id BIGINT;
BEGIN
    -- Récupérer l'ID du rôle admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'admin';
    
    -- Créer l'employé admin s'il n'existe pas
    INSERT INTO employees (username, email, password, role_id)
    VALUES ('admin', 'admin@example.com', 'admin123', admin_role_id)
    ON CONFLICT (username) DO NOTHING;
    
    -- Afficher un message (visible dans les logs Docker)
    RAISE NOTICE '✅ Employé admin créé : username=admin, password=admin123';
END $$;

-- ============================================
-- EXEMPLES : Ajouter d'autres employés
-- ============================================
-- Décommentez et modifiez selon vos besoins

/*
DO $$
DECLARE
    employee_role_id BIGINT;
BEGIN
    SELECT id INTO employee_role_id FROM roles WHERE name = 'employee';
    
    -- Employé simple
    INSERT INTO employees (username, email, password, role_id)
    VALUES ('employe1', 'employe1@example.com', 'password123', employee_role_id)
    ON CONFLICT (username) DO NOTHING;
    
    -- Admin supplémentaire
    INSERT INTO employees (username, email, password, role_id)
    VALUES ('superadmin', 'super@example.com', 'super123', (SELECT id FROM roles WHERE name = 'admin'))
    ON CONFLICT (username) DO NOTHING;
END $$;
*/
>>>>>>> origin/espace-employe-fonctionnel
