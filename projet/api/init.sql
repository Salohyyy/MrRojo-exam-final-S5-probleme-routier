-- Tables existantes (votre base)
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

-- Table employees MODIFIÉE pour Firebase
CREATE TABLE IF NOT EXISTS employees (
    id BIGSERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE,
    username VARCHAR(50),
    email VARCHAR(50) UNIQUE,
    birth_date DATE,
    role_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Table users MODIFIÉE pour Firebase
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE,
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

-- NOUVELLES TABLES pour la gestion de l'authentification

-- Paramètres globaux de sécurité
CREATE TABLE IF NOT EXISTS auth_settings (
    id SERIAL PRIMARY KEY,
    session_duration_minutes INTEGER NOT NULL DEFAULT 30, -- En minutes maintenant
    default_max_login_attempts INTEGER NOT NULL DEFAULT 3,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Paramètres personnalisés par utilisateur
CREATE TABLE IF NOT EXISTS user_auth_settings (
    id BIGSERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    max_login_attempts INTEGER, -- NULL = utiliser la valeur par défaut
    is_synced_to_local BOOLEAN DEFAULT FALSE, -- Si synchronisé dans la table users
    local_user_id BIGINT, -- ID dans la table users si synchronisé
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (local_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Suivi des tentatives de connexion
CREATE TABLE IF NOT EXISTS login_attempts (
    id BIGSERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_at TIMESTAMP,
    last_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions actives (pour le suivi uniquement, pas pour l'authentification)
CREATE TABLE IF NOT EXISTS active_sessions (
    id BIGSERIAL PRIMARY KEY,
    firebase_uid VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    session_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_auth_settings_uid ON user_auth_settings(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_user_auth_settings_synced ON user_auth_settings(is_synced_to_local);
CREATE INDEX IF NOT EXISTS idx_login_attempts_uid ON login_attempts(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_login_attempts_blocked ON login_attempts(is_blocked);
CREATE INDEX IF NOT EXISTS idx_active_sessions_uid ON active_sessions(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON active_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_firebase_uid ON employees(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_auth_settings_updated_at 
    BEFORE UPDATE ON auth_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_auth_settings_updated_at 
    BEFORE UPDATE ON user_auth_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_login_attempts_updated_at 
    BEFORE UPDATE ON login_attempts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données initiales
INSERT INTO auth_settings (session_duration_minutes, default_max_login_attempts) 
VALUES (30, 3) ON CONFLICT DO NOTHING;

-- Insérer les rôles par défaut
INSERT INTO roles (name) VALUES ('admin'), ('employee') ON CONFLICT DO NOTHING;

-- Insérer les statuts utilisateur par défaut
INSERT INTO user_statuses (name) VALUES ('active'), ('inactive'), ('blocked') ON CONFLICT DO NOTHING;