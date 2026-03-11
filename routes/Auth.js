// routes/auth.js
// Rôle : gérer l'inscription, la connexion, la déconnexion
//        + protéger les pages réservées aux connectés

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db/connexion'); // nos fonctions SQL

// Nombre de tours pour le hachage bcrypt
const SALT_ROUNDS = 10;

// -------------------------------------------------------
// POST /auth/inscription
// Reçoit : { nom, email, motDePasse } depuis le formulaire
// Action : crée un nouvel utilisateur dans la BDD
// -------------------------------------------------------
router.post('/inscription', async (req, res) => {
    try {
        // 1. Récupérer les données du formulaire
        const { nom, email, motDePasse } = req.body;

        // 2. Vérifier que tous les champs sont remplis
        if (!nom || !email || !motDePasse) {
            return res.status(400).json({
                succes: false,
                message: 'Tous les champs sont obligatoires.'
            });
        }

        // 3. Vérifier que l'email n'est pas déjà utilisé
        const utilisateurExistant = await db.trouverUtilisateurParEmail(email);
        if (utilisateurExistant) {
            return res.status(409).json({
                succes: false,
                message: 'Cet email est déjà utilisé.'
            });
        }

        // 4. Hacher le mot de passe avant de le stocker
        // bcrypt transforme "monmdp123" en "$2b$10$xyz..." (irréversible)
        // Jamais stocker un mot de passe en clair !
        const motDePasseHache = await bcrypt.hash(motDePasse, SALT_ROUNDS);

        // 5. Créer l'utilisateur en BDD
        await db.creerUtilisateur(nom, email, motDePasseHache);

        // 6. Répondre avec succès
        res.status(201).json({
            succes: true,
            message: 'Compte créé avec succès ! Vous pouvez vous connecter.'
        });

    } catch (erreur) {
        console.error('Erreur inscription :', erreur);
        res.status(500).json({
            succes: false,
            message: 'Erreur serveur. Réessayez plus tard.'
        });
    }
});

// -------------------------------------------------------
// POST /auth/connexion
// Reçoit : { email, motDePasse } depuis le formulaire
// Action : vérifie les identifiants et crée une session
// -------------------------------------------------------
router.post('/connexion', async (req, res) => {
    try {
        const { email, motDePasse } = req.body;

        // 1. Vérifier que les champs sont remplis
        if (!email || !motDePasse) {
            return res.status(400).json({
                succes: false,
                message: 'Email et mot de passe requis.'
            });
        }

        // 2. Chercher l'utilisateur dans la BDD
        const utilisateur = await db.trouverUtilisateurParEmail(email);
        if (!utilisateur) {
            return res.status(401).json({
                succes: false,
                message: 'Email ou mot de passe incorrect.'
            });
        }

        // 3. Comparer le mot de passe saisi avec le hash stocké
        // bcrypt.compare() fait la comparaison sans jamais déchiffrer le hash
        const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.mot_de_passe);
        if (!motDePasseValide) {
            return res.status(401).json({
                succes: false,
                message: 'Email ou mot de passe incorrect.'
            });
        }

        // 4. Créer la session côté serveur
        // req.session est fourni par express-session (configuré dans server.js)
        // Ces données sont stockées sur le serveur, pas dans le navigateur
        req.session.utilisateur = {
            id: utilisateur.id,
            nom: utilisateur.nom,
            email: utilisateur.email
        };

        // 5. Répondre avec succès
        res.json({
            succes: true,
            message: 'Connexion réussie !',
            utilisateur: {
                id: utilisateur.id,
                nom: utilisateur.nom
            }
        });

    } catch (erreur) {
        console.error('Erreur connexion :', erreur);
        res.status(500).json({
            succes: false,
            message: 'Erreur serveur.'
        });
    }
});

// -------------------------------------------------------
// GET /auth/deconnexion
// Action : détruire la session et rediriger vers l'accueil
// -------------------------------------------------------
router.get('/deconnexion', (req, res) => {
    // destroy() supprime complètement la session du serveur
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors de la déconnexion.' });
        }
        res.redirect('/'); // retour à la page de login
    });
});

// -------------------------------------------------------
// GET /auth/session
// Action : permet au front-end de savoir si on est connecté
// Utilisé par chat.html et video.html au chargement de la page
// -------------------------------------------------------
router.get('/session', (req, res) => {
    if (req.session.utilisateur) {
        res.json({ connecte: true, utilisateur: req.session.utilisateur });
    } else {
        res.json({ connecte: false });
    }
});

// -------------------------------------------------------
// MIDDLEWARE — estConnecte
// Rôle : bloquer l'accès aux pages protégées si non connecté
// Un middleware = fonction exécutée AVANT d'afficher la page
// -------------------------------------------------------
const estConnecte = (req, res, next) => {
    if (req.session && req.session.utilisateur) {
        next(); // connecté → on continue vers la page
    } else {
        res.redirect('/'); //  non connecté → retour au login
    }
};

// On exporte le router ET le middleware
module.exports = router;
module.exports.estConnecte = estConnecte;