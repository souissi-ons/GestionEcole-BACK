# GestionEcole-BACK

GestionEcole-BACK est une API backend pour la gestion d'une école, développée avec Node.js et Express. Elle gère les utilisateurs, les classes, les cours, les examens, la présence, la messagerie, et bien plus.

## Fonctionnalités

- Authentification et gestion des utilisateurs (élèves, enseignants, administrateurs)
- Gestion des classes, cours, niveaux, matières et salles
- Feuilles de présence et sanctions
- Gestion des examens et des sessions
- Système de messagerie (groupes et chats privés)
- Upload et gestion d’images et fichiers
- Envoi d’emails et SMS
- Dashboard et statistiques

## Structure du projet

```
index.js
package.json
vercel.json
middlewares/
models/
routes/
startup/
tests/
utils/
views/
files/
images/
```

- **index.js** : Point d’entrée de l’application
- **middlewares/** : Middlewares Express (auth, vérifications, upload, etc.)
- **models/** : Modèles Mongoose pour MongoDB
- **routes/** : Définition des routes API
- **startup/** : Initialisation de la base de données et des routes
- **utils/** : Fonctions utilitaires (envoi d’email, SMS, etc.)
- **views/** : Templates d’emails 
- **tests/** : Tests unitaires
- **files/**, **images/** : Stockage des fichiers et images uploadés

## Installation

1. **Cloner le projet**
   ```powershell
   git clone https://github.com/souissi-ons/GestionEcole-BACK.git
   cd GestionEcole-BACK
   ```

2. **Installer les dépendances**
   ```powershell
   npm install
   ```

3. **Configurer les variables d’environnement**
   Crée un fichier `.env` à la racine avec les variables nécessaires (exemple : URI MongoDB, clés JWT, config email/SMS).

4. **Lancer le serveur**
   ```powershell
   npm start
   ```
   ou
   ```powershell
   node index.js
   ```

## Utilisation

L’API expose des routes pour gérer tous les aspects de l’école. Exemple d’utilisation avec [Postman](https://www.postman.com/) 

- Authentification : `POST /api/auth/login`
- Utilisateurs : `GET /api/users`, `POST /api/users`
- Classes : `GET /api/classes`, `POST /api/classes`
- Cours : `GET /api/courses`, `POST /api/courses`
- Examens : `GET /api/exams`, `POST /api/exams`
- Feuilles de présence : `GET /api/attendanceSheets`, `POST /api/attendanceSheets`
- Messagerie : `GET /api/chatGroups`, `POST /api/privateChats`
- Uploads : `POST /api/uploads`


