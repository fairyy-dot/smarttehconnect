-- Création de la base
CREATE DATABASE IF NOT EXISTS smarttechconnect;
USE smarttechconnect;

-- Suppression des tables si elles existent (évite les erreurs)
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS salons;
DROP TABLE IF EXISTS utilisateurs;

-- Table utilisateurs
CREATE TABLE utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    date_inscription DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table salons
CREATE TABLE salons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- Table messages
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contenu TEXT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    auteur_id INT NOT NULL,
    salon_id INT NOT NULL,
    FOREIGN KEY (auteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);

-- Données de test
INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES
('Khady Sow', 'khady@esp.sn', 'passer123'),
('Rama Diop', 'ramad@esp.sn', 'passer123');

INSERT INTO salons (nom, description, cree_par) VALUES
('general', 'Salon ouvert a tous', 1),
('informatique', 'Discussions info', 1);

INSERT INTO messages (contenu, salon_id, auteur_id) VALUES
('Bienvenue sur SmarttechConnect !', 1, 1);
