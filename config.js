// ===================== CONFIGURATION DU BOT =====================
// Toutes les options sont modifiables ici. Rien n'est téléchargé
// depuis Internet : tout le code du bot est dans ce dossier.
// ==================================================================

module.exports = {
  // Préfixe principal affiché dans le menu (ex: .menu)
  PREFIX: ".",

  // Tous les préfixes acceptés pour déclencher une commande.
  // Avec ça, .menu ET !menu fonctionnent tous les deux.
  PREFIXES: [".", "!"],

  // Nom affiché du bot.
  BOT_NAME: "ARIEL-BOT 🤖",
  BOT_VERSION: "1.0",

  // Image affichée avec .menu et .alive. Mets un lien direct vers une image
  // (ex: héberge-la sur https://catbox.moe ou https://imgbb.com et colle le
  // lien direct "https://...jpg" ici). Laisse "" pour un menu texte seul.
  MENU_IMAGE_URL: "https://i.ibb.co/vvTf52cf/ARIEL-MD.jpg",

  // Numéro et nom du propriétaire.
  OWNER_NUMBER: "2250788523990",
  OWNER_NAME: "ARIEL ",

  // Numéro WhatsApp qui va héberger le bot (pour le code d'appairage).
  // LIBRE — c'est le seul numéro que chaque personne qui déploie le bot doit
  // changer : elle met SON numéro ici, obtient son code d'appairage, et a
  // ensuite accès à TOUTES les commandes (y compris propriétaire), car le
  // bot reconnaît automatiquement le compte réellement connecté.
  // Laisse vide ("") pour qu'il soit demandé dans la console/le panneau
  // à chaque démarrage tant qu'aucune session n'existe.
  PHONE_NUMBER: "",

  // Clé API Groq (gratuite), nécessaire pour la commande .gpt
  // Récupère-la sur https://console.groq.com/keys
  GROQ_API_KEY: "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",

  // Token de bot Telegram, utilisé par .tg (téléchargement de packs de
  // stickers Telegram). Change-le dans BotFather si tu veux le régénérer.
  TELEGRAM_BOT_TOKEN: "8029372890:AAHMvBULlSmmn2Ou8CDvbfQmmnvw4lshLgY",

  // Lien "Download ZIP" du dépôt (ex: https://github.com/toi/ton-repo/archive/refs/heads/main.zip)
  // Utilisé par .update UNIQUEMENT si le bot n'a pas été installé via Git.
  UPDATE_ZIP_URL: "",

  // Mode : "public" (tout le monde peut utiliser le bot)
  //        "private" (seul le propriétaire peut l'utiliser)
  MODE: "private",

  // Fonctionnalités automatiques
  // (Voir/liker les statuts auto se règle maintenant avec la commande
  // .autostatus (et .autostatuslike) directement depuis WhatsApp — plus
  // besoin de toucher à ce fichier ni de redémarrer le bot.)

  ANTI_DELETE: false,
  ANTI_LINK: false,
  ANTI_CALL: false,

  // Marque automatiquement les messages reçus comme "lus" (coche bleue)
  AUTO_READ: false,

  // Simule une frappe ("...est en train d'écrire") juste avant que le bot
  // réponde à une commande. Réglable en direct avec .autotyping on|off
  AUTO_TYPING: false,

  // Fait apparaître le bot comme "en ligne" en permanence
  ALWAYS_ONLINE: false,

  // Anti view-once : renvoie automatiquement au propriétaire les photos/vidéos
  // "vue unique" reçues (avant qu'elles ne disparaissent après lecture)
  ANTI_VV: false,

  // Message de bienvenue/au revoir automatique dans les groupes (réglable
  // par groupe avec .welcome on|off). Personnalise le texte avec
  // .setwelcome <message> / .setbye <message> — {user} et {group} sont
  // remplacés automatiquement par le nom du membre et celui du groupe.
  WELCOME: false,

  // Anti-fake : exclut automatiquement les nouveaux membres dont le numéro
  // ne commence pas par un des indicatifs autorisés ci-dessous. Utile pour
  // filtrer les faux comptes/spam utilisant des indicatifs étrangers.
  // Réglable par groupe avec .antifake on|off. Le bot doit être admin.
  ANTIFAKE: false,
  ANTIFAKE_ALLOWED_CODES: ["225"], // Côte d'Ivoire par défaut : ajoute d'autres indicatifs si besoin (ex: ["225", "33"])

  // Emoji envoyé en réaction sur ton message DÈS qu'une commande valide est
  // reconnue, avant même qu'elle ne s'exécute (petit accusé "j'ai bien reçu
  // ta commande"). Mets "" pour désactiver cette réaction.
  COMMAND_REACT_EMOJI: "",

  DESCRIPTION: "*©ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴀʀɪᴇʟ*",
};
