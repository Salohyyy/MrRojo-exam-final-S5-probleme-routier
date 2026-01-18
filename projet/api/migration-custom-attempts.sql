-- Migration pour ajouter la colonne custom_max_attempts
-- Exécuter si la base de données existe déjà

ALTER TABLE user_auth_tracking 
ADD COLUMN IF NOT EXISTS custom_max_attempts INTEGER;

COMMENT ON COLUMN user_auth_tracking.custom_max_attempts IS 
'Nombre maximum de tentatives personnalisé pour cet utilisateur. NULL = utilise le paramètre global';