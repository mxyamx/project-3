# Configuration Firebase Admin (serveur)

Introduction

Dans notre projet, nous devons authentifier les utilisateurs côté serveur sans avoir à envoyer leur userId dans chaque requête.
Grâce à Firebase Auth, le client obtient un ID token sécurisé, qui est envoyé dans les en-têtes HTTP (Authorization: Bearer ...).

Le serveur peut alors :

vérifier ce token avec Firebase Admin,

en extraire l’uid de l’utilisateur,

l’associer automatiquement aux requêtes (req.user.uid).

Cela évite d’exposer ou de transmettre le userId manuellement dans chaque appel.

Pour que Firebase Admin puisse fonctionner, il a besoin d’une clé Service Account (fichier .json).
C’est pourquoi nous avons ajouté cette configuration :

chaque membre doit avoir ce fichier dans server/secrets/,

et définir une variable d’environnement pour que le serveur sache où le trouver.

**Ce fichier contient des informations sensibles → ne jamais le committer dans Git.**
**Pour les commits, vous pouvez travailler normalement : le dossier secrets/ est déjà ignoré dans .gitignore.**

# Déploiement en local

# 1. Télécharger le fichier .json

Récupérez le fichier log3900-85dd3-firebase-adminsdk-fbsvc-b46196399f.json dans le canal #secrets.

# 2. Placer le fichier

Copiez ce fichier dans le dossier :
`/LOG3900-206/server/secrets/`

Exemple d’arborescence :

LOG3900-206/
├── client-lourd/
├── common/
├── server/
│ ├── app/
│ ├── secrets/
│ │ └── log3900-85dd3-firebase-adminsdk-fbsvc-b46196399f.json

# 3. Configurer la variable d’environnement

Avant de lancer le serveur, pointez GOOGLE_APPLICATION_CREDENTIALS vers ce fichier.

Linux / macOS (bash/zsh) -> **Ouvrir terminal et se déplacer dans le dossier `server` comme lorsque vous démarrez le serveur normalement** :

`export GOOGLE_APPLICATION_CREDENTIALS="./secrets/log3900-85dd3-firebase-adminsdk-fbsvc-b46196399f.json"`

Windows PowerShell -> **Ouvrir terminal et se déplacer dans le dossier `server` comme lorsque vous démarrez le serveur normalement** :
`$env:GOOGLE_APPLICATION_CREDENTIALS=".\secrets\log3900-85dd3-firebase-adminsdk-fbsvc-b46196399f.json"`

# 4. Lancer le serveur

`npm start`

# 5. Exemple concret (Linux)

1. Ouvrir un terminal.

2. Se déplacer dans le dossier server.

3. Exécuter :

hugod@hugod-ASUS-TUF-Gaming-A15-FA506IV-TUF506IV:~/Desktop/Polytechnique/LOG3900/LOG3900-206/server$ `export GOOGLE_APPLICATION_CREDENTIALS="./secrets/log3900-85dd3-firebase-adminsdk-fbsvc-b46196399f.json"`

4. Puis lancer :
   hugod@hugod-ASUS-TUF-Gaming-A15-FA506IV-TUF506IV:~/Desktop/Polytechnique/LOG3900/LOG3900-206/server$ `npm start`

# 6 Exemple d’utilisation du middleware

Une fois la configuration faite, le middleware verifyFirebaseToken peut être utilisé pour protéger vos routes Express.
Il lit le token JWT envoyé par le client (Authorization: Bearer ...), le vérifie avec Firebase, et ajoute req.user contenant l’UID et l’email.
**\*Attention il faut changer le type du req à AuthedRequest**

```
import { Router } from 'express';
import { verifyFirebaseToken, AuthedRequest } from './middlewares/auth.middleware';

const router = Router();

// Exemple : route protégée
router.get('/whoami', verifyFirebaseToken, (req: AuthedRequest, res) => {
  res.json({
    message: "Utilisateur authentifié",
    uid: req.user?.uid,
    email: req.user?.email,
  });
});

export default router;


```

Côté client, si vous appelez /whoami avec un ID token valide, le serveur renverra vos infos Firebase (uid et email).

# Déploiement d'un serveur distant (EC2)

**A. Déploiement manuel**

1. Envoyer le fichier JSON sur ton EC2

Depuis ta machine locale :

scp -i ~/.ssh/ec2-key.pem ./secrets/log3900-85dd3-firebase-adminsdk-fbsvc-b46196399f.json ec2-user@<dns-public-ec2>:/home/ec2-user/server/secrets/

-i ~/.ssh/ec2-key.pem → ta clé privée EC2.

./secrets/...json → chemin local du fichier (sur ton PC).

ec2-user@<dns-public-ec2> → ton utilisateur + DNS public de l’instance.

/home/ec2-user/server/secrets/ → dossier cible sur ton serveur (assure-toi que server/secrets/ existe sur EC2).

2. Se connecter en SSH sur ton EC2

ssh -i ~/.ssh/ec2-key.pem ec2-user@<dns-public-ec2>

3. Aller dans ton projet serveur
   cd ~/server

4. Exporter la variable d’environnement

export GOOGLE_APPLICATION_CREDENTIALS="./secrets/log3900-85dd3-firebase-adminsdk-fbsvc-b46196399f.json"

5. Lancer ton serveur

Toujours depuis /server :

npm start

**B. Déploiement automatique**
Variables CI/CD à créer (GitLab → Settings > CI/CD > Variables)

Crée ces variables (toutes Protected, Masked quand possible) :

EC2_HOST → ec2-xxx.ca-central-1.compute.amazonaws.com

EC2_USER → ec2-user

SERVER_PORT → 3000 (ou ton port)

EC2_PEM_FILE_CONTENT → contenu PEM

GOOGLE_APPLICATION_CREDENTIALS (Type = File) → colle le contenu du JSON Firebase Admin Service Account

En Type File, GitLab crée un fichier temporaire pendant le job et la variable contiendra le chemin vers ce fichier (ex: /tmp/…/file)

On va ensuite copier ce fichier sur EC2 via scp et exporter l’ENV côté serveur.

Patch .gitlab-ci.yml (ajouts clés)

Intègre (ou adapte) ces lignes dans ta job deploy:server. L’idée :

on copie la clé (fichier GitLab “File variable”) vers EC2,

on exporte GOOGLE_APPLICATION_CREDENTIALS côté EC2,

on lance le serveur sous forever avec cette ENV.
