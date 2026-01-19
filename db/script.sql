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