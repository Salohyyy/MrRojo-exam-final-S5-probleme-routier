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