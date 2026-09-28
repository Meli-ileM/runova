<div align="center">

# 🔒 RUNOVA

**A secure, end-to-end encrypted messaging platform with built-in video calls**
*Une plateforme de messagerie sécurisée et chiffrée, avec appels vidéo intégrés*

![React](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=flat&logo=webrtc&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=flat&logo=socketdotio&logoColor=white)

🇬🇧 [English](#-english) · 🇫🇷 [Français](#-français)

</div>

---

## 🇬🇧 English

🗓️ *Developed Feb – Jun 2025 · published on GitHub in 2026*

### 💡 About
RUNOVA is a 100% Algerian secure messaging platform, independent from foreign servers, with encrypted emails and built-in video calls.
🎓 Master's final-year project (PFE), Mouloud Mammeri University of Tizi Ouzou (Feb – Jun 2025). I built both the backend and the frontend.

### ✨ Features
- 🔐 Sign-up, login, secure sessions and two-factor authentication (SMS 2FA)
- 📧 Send and receive emails, threads, drafts and attachments
- 🗝️ Email encryption: key-pair generation & management, client-side and server-side encryption
- 🏷️ Labels, contacts and notifications
- 🎥 Video meetings and calls (WebRTC with a Socket.IO signaling server)
- 👤 Profile management

### 🛠️ Tech stack
| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, MUI |
| Backend | Node.js, Express, express-session |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.IO, WebRTC (simple-peer) |
| Security | JWT, bcrypt, OpenPGP, Web Crypto API, 2FA |

### 📂 Structure
```
Front/    React app (Vite)
server/   Express API: controllers, models, routes, middleware, services
          signaling-server.js: signaling server for video calls
```

### 🚀 Getting started
```bash
cp server/.env.example server/.env

cd server && npm install && npm start          # API (port 5000)
node signaling-server.js                       # signaling (port 5001)
cd ../Front && npm install && npm run dev      # frontend
```

---

## 🇫🇷 Français

🗓️ *Développé de févr. à juin 2025 · publié sur GitHub en 2026*

### 💡 À propos
RUNOVA est une plateforme de messagerie sécurisée 100 % algérienne, indépendante des serveurs étrangers, avec chiffrement des emails et appels vidéo intégrés.
🎓 Projet de Fin d'Études, Université Mouloud Mammeri de Tizi Ouzou (févr. – juin 2025). J'ai réalisé le backend et le frontend.

### ✨ Fonctionnalités
- 🔐 Inscription, connexion, sessions sécurisées et double authentification (2FA par SMS)
- 📧 Envoi et réception d'emails, conversations, brouillons et pièces jointes
- 🗝️ Chiffrement des emails : génération et gestion des clés, chiffrement côté client et côté serveur
- 🏷️ Libellés, contacts et notifications
- 🎥 Visioconférence et appels vidéo (WebRTC, serveur de signalisation Socket.IO)
- 👤 Gestion du profil

### 🚀 Lancer le projet
Voir les commandes de la section anglaise ci-dessus 👆.

---

<div align="center">

Made with 💜 by **Meli** and **Sadi**

</div>
