-- Création d'une table test
CREATE TABLE IF NOT EXISTS test_items (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion de données de test
INSERT INTO test_items (description) VALUES
    ('Élément de test 1'),
    ('Élément de test 2'),
    ('Élément de test 3');

-- Création d'une table pour les routes si nécessaire
CREATE TABLE IF NOT EXISTS routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    geom GEOMETRY(LINESTRING, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
