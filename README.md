# ARIEL-MD

Bot WhatsApp basé sur [Baileys](https://github.com/WhiskeySockets/Baileys), 100% lisible,
sans téléchargement ni exécution de code externe, sans SESSION_ID à récupérer ailleurs.

## Installation

```bash
npm install
```

Les commandes `.play`, `.yt`, `.tiktok` et `.fb` utilisent :
- un binaire **ffmpeg** portable (paquet `ffmpeg-static`)
- un binaire **yt-dlp** autonome, téléchargé automatiquement depuis GitHub
  après `npm install` (voir `scripts/download-ytdlp.js`)

Aucun des deux ne nécessite Python ni un accès root/sudo : ça fonctionne tel
quel sur les panels d'hébergement type Pterodactyl (Optilink, bot-hosting.net,
etc.) où tu n'as pas de droits administrateur. Seul un accès internet sortant
est nécessaire au moment du `npm install`.

## Configuration

Copie `config.example.js` en `config.js` (`cp config.example.js config.js`), puis
ouvre `config.js` pour renseigner tes vraies valeurs (numéro du propriétaire, clé
API OpenAI pour `.gpt`, etc.). `config.js` contient des données sensibles et est
donc listé dans `.gitignore` : il ne sera jamais publié si tu utilises Git.

## Démarrage

```bash
npm start
```

Au premier lancement (ou si la session est perdue) :
1. Le bot te demande ton numéro WhatsApp directement dans la console.
2. Il affiche un **code d'appairage**.
3. Sur ton téléphone : WhatsApp > Paramètres > Appareils liés > Lier un appareil >
   "Lier avec un numéro de téléphone" > entre le code affiché.
4. Une fois connecté, un dossier `session/` est créé : NE LE PARTAGE JAMAIS,
   il contient les clés de connexion à ton compte WhatsApp. Les prochains
   démarrages n'auront plus besoin du code.

## Commandes disponibles

### Général
| Commande    | Description                                  |
|-------------|-----------------------------------------------|
| `.menu`     | Affiche la liste des commandes (par catégorie) |
| `.ping`     | Teste si le bot répond                        |
| `.alive`    | Vérifie que le bot est en ligne               |
| `.runtime`  | Depuis combien de temps le bot tourne         |
| `.owner`    | Affiche le contact du propriétaire            |
| `.jid`      | Affiche le JID du chat et le tien             |
| `.afk [message]` | Active le mode absent (réponse auto en DM, se désactive tout seul dès que tu écris) - propriétaire |
| `.unafk`    | Désactive le mode absent - propriétaire       |
| `.autoreply on <message>` / `.autoreply off` | Réponse automatique en DM, persistante (survit aux redémarrages, ne se coupe pas toute seule) - propriétaire |

### Paramètres (propriétaire uniquement)
| Commande                    | Description                                       |
|------------------------------|---------------------------------------------------|
| `.settings`                 | Affiche l'état actuel des réglages activables      |
| `.online on|off`            | Toujours en ligne                                  |
| `.autostatus`                | Affiche le menu complet du visionneur de statuts (voir ci-dessous) |
| `.anti_delete on|off`       | Renvoyer les messages supprimés au propriétaire    |
| `.ok on|off`                | Anti-vue-unique (récupère les photos/vidéos "vue unique") |
| `.toggle <nom> on|off`      | Réglage générique (couvre aussi `anti_call`, `welcome`) |

Ces changements sont en mémoire : ils reviennent à la valeur de `config.js`
si le bot redémarre. Pour un changement permanent, modifie directement
`config.js`.

### Visionneur de statuts auto (`.autostatus`)

Contrairement aux autres réglages ci-dessus, `.autostatus` a sa propre
persistance (fichier `data/autostatus.json`, créé automatiquement) : il
survit donc à un redémarrage du bot sans rien à changer dans `config.js`.

| Commande                              | Description                                  |
|-----------------------------------------|-----------------------------------------------|
| `.autostatus`                           | Affiche l'état actuel et le menu d'aide       |
| `.autostatus on` / `off`                | Active / désactive le visionnage auto des statuts |
| `.autostatuslike on` / `off`            | Active / désactive le like 💚 des statuts vus |
| `.autostatus self on` / `off`           | Voir (ou ignorer) ses propres statuts          |
| `.autostatus include add <numéros>`     | Ne voir QUE ces numéros                        |
| `.autostatus include remove <numéros>`  | Retire des numéros de la liste d'inclusion     |
| `.autostatus exclude add <numéros>`     | Voir tous les statuts SAUF ces numéros         |
| `.autostatus exclude remove <numéros>`  | Retire des numéros de la liste d'exclusion     |
| `.autostatus includelist` / `excludelist` | Affiche la liste active                      |
| `.autostatus includeclear` / `excludeclear` | Vide la liste                              |

### 🤖 IA
| Commande    | Description                                  |
|-------------|-----------------------------------------------|
| `.gpt <question>` | Pose une question à l'IA (Llama 3.3 70B via Groq, clé API gratuite requise dans `config.js`) |

### Utilitaires
| Commande    | Description                                  |
|-------------|-----------------------------------------------|
| `.sticker`  | Transforme une image/vidéo en sticker (répondre à un média) |
| `.toimg`    | Reconvertit un sticker en image (répondre à un sticker) |
| `.remini`   | Améliore la netteté/qualité d'une image, zoom x2 (répondre à une image) |
| `.calc`     | Calculatrice : `.calc 12*(3+4)`               |
| `.clear`    | Efface tous les messages connus de la discussion, pour tout le monde quand c'est possible (propriétaire uniquement) |
| `.clearforme` | Efface toute la discussion connue, UNIQUEMENT de ton côté — l'autre garde tout et ne voit rien, aucune notification (propriétaire uniquement) |
| `.spotify <titre/artiste>` | Recherche et télécharge une musique depuis Spotify |
| `.tg <lien du pack>` | Télécharge et envoie **tout** un pack de stickers Telegram (ex: `.tg https://t.me/addstickers/NomDuPack`) |
| `.lyrics <artiste> - <titre>` | Affiche les paroles d'une chanson (artiste optionnel, deviné via YouTube sinon) |
| `.qrcode <texte/lien>` | Génère un QR code à partir d'un texte ou d'un lien |
| `.shorturl <lien>` | Raccourcit un lien long |
| `.currency <montant> <de> <vers>` | Convertit un montant entre deux devises (ex: `.currency 100 USD EUR`) |
| `.base64 encode\|decode <texte>` | Encode ou décode du texte en base64 |
| `.quote` | Envoie une citation inspirante aléatoire |
| `.8ball <question>` | Boule magique : répond oui/non/incertain à une question |
| `.meme` | Envoie un meme aléatoire |

### Groupe & Modération (réservées aux admins du groupe)
| Commande        | Description                                          |
|------------------|-------------------------------------------------------|
| `.tagall [texte]`| Mentionne tout le monde avec un message               |
| `.hidetag [texte]`| Notifie tout le monde sans afficher la liste          |
| `.kick`          | Exclut un membre (mention, réponse ou numéro)          |
| `.add <numéro>`  | Ajoute un numéro au groupe                             |
| `.promote`       | Promeut un membre admin (mention ou réponse)           |
| `.demote`        | Rétrograde un admin (mention ou réponse)               |
| `.group open/close` | Ouvre ou ferme le groupe (écriture réservée aux admins) |
| `.antilink on/off`  | Supprime automatiquement les liens envoyés par les non-admins |
| `.listadmins`    | Liste tous les admins du groupe                        |

`.kick`, `.promote` et `.demote` acceptent soit une mention (`@membre`), soit
une réponse au message de la personne, soit son numéro en argument. Pour ces
commandes, le bot doit lui-même être admin du groupe.

## Ajouter une image au menu (`.menu` / `.alive`)

Ouvre `config.js` et renseigne `MENU_IMAGE_URL` avec un lien direct vers une
image (se termine par `.jpg`, `.png`...) :

```js
MENU_IMAGE_URL: "https://files.catbox.moe/exemple.jpg",
```

Comment obtenir un lien direct :
1. Héberge ton image sur un site gratuit comme https://catbox.moe (upload
   simple, pas de compte requis) ou https://imgbb.com.
2. Copie le **lien direct** vers le fichier (pas la page de partage).
3. Colle-le dans `MENU_IMAGE_URL`.

Une fois configuré, `.menu` envoie automatiquement l'image avec toutes les
infos et la liste des commandes en légende. Si tu laisses `MENU_IMAGE_URL`
vide (`""`), le menu reste en texte seul.

## Ajouter une commande

Ouvre `commands/index.js` et ajoute un objet dans le tableau `commands` :

```js
{
  name: "salut",
  desc: "Dit bonjour",
  category: "Général",
  run: async (sock, msg, { from }) => {
    await sock.sendMessage(from, { text: "Salut !" });
  },
},
```

## Déploiement sur OptikLink

1. Crée un serveur type "Bot Hosting" / egg Node.js sur https://optiklink.net
2. Upload ce dossier (via le ZIP ou Git)
3. Fichier de démarrage : `index.js`
4. Démarre le serveur, puis suis les instructions affichées dans la console
   pour entrer ton numéro et récupérer ton code d'appairage.

## Déployer sur n'importe quel panel / serveur

Le bot est conçu pour marcher pareil sur OptikLink, Katabump, un panel
Pterodactyl générique, un VPS ou en local, sans rien changer dans le code :

- **Numéro de téléphone** : passe-le directement dans la commande de
  démarrage du panel, ex. `node index.js 2250788523990` (marche même sur les
  panels sans champ "variables" personnalisées). Sinon, une variable
  d'environnement `PHONE_NUMBER`, ou `PHONE_NUMBER` dans `config.js`.
- **Port HTTP** : certains panels (Render, Railway, Replit, panels
  Pterodactyl en mode "web service"...) surveillent un port HTTP pour savoir
  si l'app tourne, et la redémarrent sinon. Le bot ouvre automatiquement un
  petit serveur qui répond "OK" sur le port fourni par la variable
  d'environnement `PORT` (ou 3000 par défaut) — rien à configurer, et ça ne
  gêne en rien les panels qui n'en ont pas besoin.
- **Console non interactive** : sur les panels où la console ne permet pas de
  taper au clavier, le bot saute simplement l'étape de saisie manuelle du
  numéro (voir point ci-dessus) au lieu de planter.
- **yt-dlp / ffmpeg** : téléchargés/vérifiés automatiquement au démarrage
  même si le panel bloque le script `postinstall` de npm.

### "Le bot redémarre tout seul très souvent"

Si ça arrive régulièrement (ex: environ toutes les heures) alors que WhatsApp
reste bien connecté de son côté, c'est presque toujours un problème de
consommation mémoire/CPU qui grimpe avec le temps, jusqu'à ce que le panel
tue le process et le relance de force. Deux fuites connues ont été corrigées :
un minuteur "toujours en ligne" et un minuteur de statut programmé qui se
dupliquaient à chaque reconnexion WhatsApp au lieu d'être remplacés. Si le
souci persiste malgré tout après cette version, vérifie en priorité le quota
de RAM alloué par ton panel (beaucoup de plans gratuits sont très limités,
autour de 256-512 Mo, ce qui peut suffire à provoquer des redémarrages sur un
bot avec beaucoup de fonctionnalités actives).

### "Après un redémarrage, le bot répond à une vieille commande"

WhatsApp peut livrer d'un coup, juste après une reconnexion, un paquet de
messages restés en attente pendant que le bot était hors ligne — parfois
avec un horodatage qui ne reflète pas fidèlement leur heure d'envoi
d'origine. Le bot ignore désormais systématiquement tout message reçu dans
les toutes premières secondes suivant chaque connexion/reconnexion, en plus
du filtre par horodatage déjà existant, pour ne plus jamais rejouer une
commande tapée avant le redémarrage.
