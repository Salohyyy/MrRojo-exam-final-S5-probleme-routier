-- ============================================
-- MIGRATION : Ajout du support des notifications push
-- À exécuter sur une base existante qui n'a pas encore ces tables/colonnes
-- ============================================

-- 1. Ajouter la colonne firebase_uid à la table users (si elle n'existe pas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'firebase_uid'
    ) THEN
        ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255) UNIQUE;
        RAISE NOTICE '✅ Colonne firebase_uid ajoutée à la table users';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne firebase_uid déjà présente dans la table users';
    END IF;
END $$;

-- 2. Créer la table user_devices pour stocker les tokens FCM
CREATE TABLE IF NOT EXISTS user_devices (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,        -- Firebase UID de l'utilisateur
    fcm_token TEXT NOT NULL UNIQUE,        -- Token FCM unique par appareil
    device_info VARCHAR(255),              -- Info optionnelle sur l'appareil
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fcm_token ON user_devices(fcm_token);

-- 4. Trigger pour updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_devices_updated_at'
    ) THEN
        CREATE TRIGGER update_user_devices_updated_at
            BEFORE UPDATE ON user_devices
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE '✅ Trigger update_user_devices_updated_at créé';
    ELSE
        RAISE NOTICE 'ℹ️ Trigger update_user_devices_updated_at déjà présent';
    END IF;
END $$;

-- ============================================
-- VÉRIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration notifications push terminée avec succès';
END $$;
