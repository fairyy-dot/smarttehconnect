// db/connexion.js
// Rôle : établir la connexion entre Node.js et MySQL
// Utilisé par : tous les fichiers qui ont besoin d'accéder à la BDD

const mysql = require('mysql2');

// Création du pool de connexions
// Un "pool" permet de réutiliser plusieurs connexions sans en créer une nouvelle à chaque requête
const pool = mysql.createPool({
    host: 'localhost',      // adresse du serveur MySQL (en local)
    user: 'root',           // ton utilisateur MySQL
    password: 'Mrsskyy1',           // ton mot de passe MySQL (modifier si nécessaire)
    database: 'smarttechconnect',
    waitForConnections: true,
    connectionLimit: 10,    // maximum 10 connexions simultanées
    queueLimit: 0
});

// On convertit le pool en version "promise" pour utiliser async/await
const db = pool.promise();

// Test de connexion au démarrage
pool.getConnection((err, connexion) => {
    if (err) {
        console.error('❌ Erreur de connexion à MySQL :', err.message);
        return;
    }
    console.log('✅ Connexion à la base de données MySQL réussie !');
    connexion.release(); // libérer la connexion après le test
});

// ================================================================
// REQUÊTES — UTILISATEURS
// ================================================================

// Créer un nouvel utilisateur (appelée lors de l'inscription)
const creerUtilisateur = async (nom, email, motDePasse) => {
    const sql = 'INSERT INTO utilisateurs (nom, email, mot_de_passe) VALUES (?, ?, ?)';
    // Les "?" protègent contre les injections SQL (paramètres préparés)
    const [resultat] = await db.execute(sql, [nom, email, motDePasse]);
    return resultat;
};

// Trouver un utilisateur par email (appelée lors de la connexion)
const trouverUtilisateurParEmail = async (email) => {
    const sql = 'SELECT * FROM utilisateurs WHERE email = ?';
    const [lignes] = await db.execute(sql, [email]);
    return lignes[0]; // retourne undefined si pas trouvé
};

// ================================================================
// REQUÊTES — SALONS
// ================================================================

// Récupérer tous les salons (pour les afficher dans le chat)
const getTousLesSalons = async () => {
    const sql = 'SELECT * FROM salons ORDER BY date_creation ASC';
    const [lignes] = await db.execute(sql);
    return lignes;
};

// ================================================================
// REQUÊTES — MESSAGES
// ================================================================

// Récupérer les 50 derniers messages d'un salon (historique)
// Récupérer les 50 derniers messages d'un salon (historique)
const getMessagesDuSalon = async (salonId) => {
    const sql = `
        SELECT m.id, m.contenu, m.date_envoi,
               u.nom AS auteur
        FROM messages m
        JOIN utilisateurs u ON m.auteur_id = u.id
        WHERE m.salon_id = ?
        ORDER BY m.date_envoi ASC
        LIMIT 50
    `;
    // auteur_id correspond au vrai nom de la colonne dans ta table
    const [lignes] = await db.execute(sql, [salonId]);
    return lignes;
};

// Sauvegarder un nouveau message dans la BDD
// Sauvegarder un nouveau message dans la BDD
const sauvegarderMessage = async (contenu, utilisateurId, salonId) => {
    const sql = 'INSERT INTO messages (contenu, auteur_id, salon_id) VALUES (?, ?, ?)';
    // auteur_id correspond au vrai nom de la colonne dans ta table
    const [resultat] = await db.execute(sql, [contenu, utilisateurId, salonId]);
    return resultat;
};

// ================================================================
// EXPORTS — rendre toutes les fonctions disponibles dans les autres fichiers
// ================================================================
module.exports = {
    creerUtilisateur,
    trouverUtilisateurParEmail,
    getTousLesSalons,
    getMessagesDuSalon,
    sauvegarderMessage
};