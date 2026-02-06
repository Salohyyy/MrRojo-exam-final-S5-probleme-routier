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

-- Ajout d'une colonne firebase_id dans reports pour tracer l'origine
ALTER TABLE reports ADD COLUMN firebase_id VARCHAR(100);

-- Ajout d'une colonne sent_to_firebase dans report_syncs
ALTER TABLE report_syncs ADD COLUMN sent_to_firebase BOOLEAN DEFAULT false;

-- Index pour améliorer les performances
CREATE INDEX idx_reports_firebase_id ON reports(firebase_id);
CREATE INDEX idx_report_syncs_sent ON report_syncs(sent_to_firebase);
CREATE INDEX idx_reports_synced ON reports(is_synced);

-- Vue pour faciliter les requêtes
CREATE OR REPLACE VIEW v_reports_complete AS
SELECT 
  r.id,
  r.reported_at,
  r.longitude,
  r.latitude,
  r.city,
  r.is_synced,
  r.firebase_id,
  r.report_status_id,
  r.problem_type_id,
  r.user_id,
  rs.id as sync_id,
  rs.surface,
  rs.budget,
  rs.progress,
  rs.sent_to_firebase,
  rs.company_id,
  c.name as company_name,
  c.address as company_address,
  rstat.name as status_name,
  rstat.level as status_level,
  pt.name as problem_type_name,
  u.username,
  u.email as user_email
FROM reports r
LEFT JOIN report_syncs rs ON r.id = rs.report_id
LEFT JOIN companies c ON rs.company_id = c.id
LEFT JOIN report_statuses rstat ON r.report_status_id = rstat.id
LEFT JOIN problem_types pt ON r.problem_type_id = pt.id
LEFT JOIN users u ON r.user_id = u.id;

-- Création de la table pour les paramètres de session
CREATE TABLE IF NOT EXISTS session_settings (
    id SERIAL PRIMARY KEY,
    session_duration_hours INTEGER NOT NULL DEFAULT 24,
    max_login_attempts INTEGER NOT NULL DEFAULT 3,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des paramètres par défaut
INSERT INTO session_settings (session_duration_hours, max_login_attempts) 
VALUES (24, 3);

-- Table pour suivre les utilisateurs et leurs tentatives de connexion
CREATE TABLE IF NOT EXISTS user_auth_tracking (
    uid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    failed_attempts INTEGER DEFAULT 0,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_at TIMESTAMP,
    last_attempt_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table pour l'historique des sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    uid VARCHAR(255) NOT NULL,
    session_token VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (uid) REFERENCES user_auth_tracking(uid) ON DELETE CASCADE
);

-- Index pour améliorer les performances
CREATE INDEX idx_user_sessions_uid ON user_sessions(uid);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX idx_user_auth_blocked ON user_auth_tracking(is_blocked);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour session_settings
CREATE TRIGGER update_session_settings_updated_at 
    BEFORE UPDATE ON session_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour user_auth_tracking
CREATE TRIGGER update_user_auth_tracking_updated_at 
    BEFORE UPDATE ON user_auth_tracking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
