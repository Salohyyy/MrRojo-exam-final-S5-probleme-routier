-- Tables existantes (votre base - inchangées)
CREATE TABLE IF NOT EXISTS roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50)
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
    firebase_uid VARCHAR(255) UNIQUE,    -- Firebase UID pour les notifications push
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

-- ============================================
-- TABLE POUR LES TOKENS FCM (NOTIFICATIONS PUSH)
-- ============================================
CREATE TABLE IF NOT EXISTS user_devices (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,        -- Firebase UID de l'utilisateur
    fcm_token TEXT NOT NULL UNIQUE,        -- Token FCM unique par appareil
    device_info VARCHAR(255),              -- Info optionnelle sur l'appareil
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour rechercher rapidement les tokens par utilisateur
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fcm_token ON user_devices(fcm_token);

-- Trigger pour mettre à jour updated_at sur user_devices
-- (sera créé après la définition de la fonction update_updated_at_column)

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

-- Trigger pour user_devices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_devices_updated_at'
    ) THEN
        CREATE TRIGGER update_user_devices_updated_at
            BEFORE UPDATE ON user_devices
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

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
