// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const session = require('express-session');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer');

const db = require('./db/connexion');
const authRoutes = require('./routes/auth');
const salonRoutes = require('./routes/salon');
const estConnecte = require('./routes/auth').estConnecte;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'smarttech_secret_2025',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// --- Serveur PeerJS ---
const peerServer = ExpressPeerServer(server, { debug: true });
app.use('/peerjs', peerServer);
peerServer.on('connection', (client) => {
    console.log(`📡 PeerJS connecté : ${client.getId()}`);
});
peerServer.on('disconnect', (client) => {
    console.log(`📡 PeerJS déconnecté : ${client.getId()}`);
});

// --- Routes HTTP ---
app.use('/auth', authRoutes);
app.use('/api/salons', salonRoutes);

app.get('/chat', estConnecte, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'chat.html'));
});
app.get('/video', estConnecte, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'video.html'));
});

// ================================================================
// SOCKET.IO
// ================================================================
io.on('connection', (socket) => {
    console.log(`✅ Connecté : ${socket.id}`);

    // --- CHAT : rejoindre-salon ---
    socket.on('rejoindre-salon', async ({ salonId, salonNom, utilisateurNom }) => {
        if (socket.salonActuel) {
            socket.leave(String(socket.salonActuel));
            socket.to(String(socket.salonActuel)).emit('utilisateur-quitte', { nom: utilisateurNom });
        }
        socket.join(String(salonId));
        socket.salonActuel = salonId;
        socket.utilisateurNom = utilisateurNom;
        socket.to(String(salonId)).emit('utilisateur-connecte', { nom: utilisateurNom });
        try {
            const messages = await db.getMessagesDuSalon(salonId);
            socket.emit('historique-messages', messages);
        } catch (err) {
            console.error('Erreur historique :', err);
        }
        console.log(`👤 ${utilisateurNom} a rejoint ${salonNom}`);
    });

    // --- CHAT : nouveau-message ---
    socket.on('nouveau-message', async ({ contenu, utilisateurId, utilisateurNom, salonId }) => {
        try {
            await db.sauvegarderMessage(contenu, utilisateurId, salonId);
            io.to(String(salonId)).emit('message-recu', {
                contenu,
                auteur: utilisateurNom,
                date_envoi: new Date().toISOString()
            });
        } catch (err) {
            console.error('Erreur message :', err.message);
        }
    });

    // --- TABLEAU BLANC : dessin ---
    socket.on('dessin', ({ x0, y0, x1, y1, couleur, taille, salonId }) => {
        socket.to(String(salonId)).emit('dessin', { x0, y0, x1, y1, couleur, taille });
    });

    // --- TABLEAU BLANC : effacer ---
    socket.on('effacer-tableau', (salonId) => {
        socket.to(String(salonId)).emit('effacer-tableau');
    });

    // --- VIDEO : enregistrer-peer ---
    socket.on('enregistrer-peer', ({ peerId, utilisateurNom }) => {
        socket.peerId = peerId;
        socket.nomUtilisateur = utilisateurNom;
        console.log(`📹 ${utilisateurNom} enregistré (peer: ${peerId}, socket: ${socket.id})`);

        // Envoyer la liste des utilisateurs déjà connectés au nouvel arrivant
        const autresUtilisateurs = [];
        io.sockets.sockets.forEach((autreSocket) => {
            if (autreSocket.id !== socket.id && autreSocket.peerId) {
                autresUtilisateurs.push({
                    peerId: autreSocket.peerId,
                    utilisateurNom: autreSocket.nomUtilisateur,
                    socketId: autreSocket.id
                });
            }
        });
        socket.emit('liste-utilisateurs', autresUtilisateurs);
        console.log(`📋 Liste envoyée à ${utilisateurNom} : ${autresUtilisateurs.length} utilisateur(s)`);

        // Prévenir les autres de l'arrivée de ce nouvel utilisateur
        socket.broadcast.emit('utilisateur-disponible', {
            peerId,
            utilisateurNom,
            socketId: socket.id
        });
    });

    // --- VIDEO : signaler-appel ---
    socket.on('signaler-appel', ({ peerIdAppelant, nomAppelant, socketIdDestinataire }) => {
        console.log(`📞 Appel de ${nomAppelant} vers socket ${socketIdDestinataire}`);
        io.to(socketIdDestinataire).emit('appel-entrant', {
            peerIdAppelant,
            nomAppelant
        });
    });

    // --- DECONNEXION ---
    socket.on('disconnect', () => {
        if (socket.salonActuel && socket.utilisateurNom) {
            socket.to(String(socket.salonActuel)).emit('utilisateur-quitte', {
                nom: socket.utilisateurNom
            });
        }
        if (socket.peerId) {
            socket.broadcast.emit('utilisateur-indisponible', {
                peerId: socket.peerId
            });
            console.log(`📹 ${socket.nomUtilisateur} déconnecté de la vidéo`);
        }
        console.log(`❌ Déconnecté : ${socket.id}`);
    });

}); // ← fermeture de io.on('connection')

// --- Lancement ---
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
});
