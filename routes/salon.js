// routes/salon.js
// Rôle : routes liées aux salons de discussion

const express = require('express');
const router = express.Router();
const db = require('../db/connexion');
const estConnecte = require('./auth').estConnecte;

// GET /api/salons
// Retourne la liste de tous les salons disponibles
router.get('/', estConnecte, async (req, res) => {
    try {
        const salons = await db.getTousLesSalons();
        res.json(salons);
    } catch (err) {
        console.error('Erreur chargement salons :', err.message);
        res.status(500).json({ message: 'Erreur serveur.' });
    }
});

module.exports = router;