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

INSERT INTO roles (name) VALUES
('ADMIN'),
('SUPERVISOR'),
('AGENT');

INSERT INTO problem_types (name) VALUES
('Route dégradée'),
('Éclairage public'),
('Inondation'),
('Déchets'),
('Signalisation');

INSERT INTO companies (name, address) VALUES
('RoadFix SARL', 'Antananarivo'),
('LightPro', 'Toamasina'),
('CleanCity', 'Mahajanga');

INSERT INTO report_statuses (name, level) VALUES
('Signalé', 1),
('En cours', 2),
('En réparation', 3),
('Terminé', 4),
('Rejeté', 0);

INSERT INTO user_statuses (name) VALUES
('Actif'),
('Suspendu'),
('Banni');

INSERT INTO employees (username, email, password, birth_date, role_id) VALUES
('admin1', 'admin1@mail.com', 'pass123', '1985-03-12', 1),
('super1', 'super@mail.com', 'pass123', '1990-06-22', 2),
('agent1', 'agent@mail.com', 'pass123', '1995-09-10', 3);

INSERT INTO users (username, email, password, birth_date, user_status_id) VALUES
('user1', 'user1@mail.com', 'pass123', '2000-01-01', 1),
('user2', 'user2@mail.com', 'pass123', '1999-05-18', 1),
('user3', 'user3@mail.com', 'pass123', '1998-11-30', 2);

INSERT INTO reports (
    reported_at, longitude, latitude, city,
    is_synced, report_status_id, problem_type_id, user_id
) VALUES
('2026-01-10 08:30:00', 47.52, -18.91, 'Antananarivo', FALSE, 1, 1, 1),
('2026-01-11 09:45:00', 49.41, -18.15, 'Toamasina', TRUE, 2, 2, 2),
('2026-01-12 14:20:00', 46.99, -19.87, 'Fianarantsoa', TRUE, 3, 3, 1);

INSERT INTO report_syncs (
    surface, budget, progress,
    report_status_id, company_id, report_id
) VALUES
('200 m²', 1500000, 20, 2, 1, 2),
('50 lampadaires', 800000, 60, 3, 2, 3);

INSERT INTO user_status_histories (
    changed_at, employee_id, user_id, user_status_id
) VALUES
('2026-01-12 10:00:00', 1, 3, 2),
('2026-01-13 11:30:00', 2, 3, 1);

INSERT INTO report_sync_histories (
    changed_at, report_status_id, report_sync_id
) VALUES
('2026-01-13 15:00:00', 2, 1),
('2026-01-14 16:45:00', 3, 2);