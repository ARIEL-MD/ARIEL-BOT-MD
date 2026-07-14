// ===================== BOT WHATSAPP - FICHIER PRINCIPAL =====================
// Basé sur Baileys (librairie open-source officielle pour WhatsApp Web).
// Aucune connexion à un serveur tiers, aucun téléchargement de code externe,
// aucun SESSION_ID à récupérer ailleurs.
//
// Flux de connexion :
//   1. Au premier démarrage, le bot te demande ton numéro WhatsApp
//      directement dans la console (ou le lit dans config.js si tu l'as
//      déjà renseigné dans PHONE_NUMBER).
//   2. Il affiche un code d'appairage à 8 caractères.
//   3. Tu entres ce code dans WhatsApp > Appareils liés > Lier avec un
//      numéro de téléphone.
//   4. Une fois connecté, la session est sauvegardée dans le dossier
//      "session/" : les prochains démarrages n'auront plus besoin du code.
// ==============================================================================

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");
const readline = require("readline");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

const config = require("./config");
const commands = require("./commands");
const contactsStore = require("./contacts-store");
const { setupFeatures, getViewOnce, extractViewOnce } = require("./features");
const { getSetting, START_TIME, isAfkActive, setAfk, getAfkMessage, isAutoReplyActive, setAutoReply, getAutoReplyMessage, setLastConnectionOpenAt, isMessageProcessed, markMessageProcessed } = require("./state");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// --- Filet de sécurité global ---
// Sans ça, la moindre erreur non interceptée QUELQUE PART dans le code (un
// timeout réseau, un message WhatsApp mal formé, un bug dans une commande...)
// fait planter TOUT le process Node — et l'hébergeur le relance alors
// automatiquement. Vu de l'extérieur, ça ressemble à "le bot redémarre tout
// seul" et renvoie le message de connexion sans qu'on ait rien demandé.
// On intercepte donc ces erreurs ici pour les logger sans jamais couper le
// bot. Le process ne s'arrête plus que pour de vraies raisons volontaires
// (.restart, erreur fatale au tout premier démarrage avant connexion).
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Promesse rejetée non gérée (bot maintenu en ligne) :", reason);
});
process.on("uncaughtException", (err) => {
  console.error("⚠️ Erreur non interceptée (bot maintenu en ligne) :", err);
});
const question = (text) => new Promise((resolve) => rl.question(text, resolve));
// Sur les panels où la console n'est pas interactive, rl peut déjà être dans
// un état fermé/instable : on protège chaque appel à close() pour que ça ne
// fasse jamais planter le bot, quel que soit l'hébergeur.
const safeCloseReadline = () => {
  try {
    rl.close();
  } catch (e) {
    // Rien à faire : déjà fermé, ou pas de console interactive ici.
  }
};

// Empêche que plusieurs reconnexions se déclenchent en même temps (ex: si
// l'événement "close" arrive plusieurs fois d'affilée à cause d'un réseau
// instable). Sans ce verrou, startBot() pouvait être rappelée plusieurs fois
// et ouvrir 2+ connexions WhatsApp actives simultanément avec la même
// session, ce qui désynchronise le chiffrement (Bad MAC, "No sessions").
let isReconnecting = false;

// N'envoie le message "✅ connecté" qu'UNE SEULE FOIS par démarrage du
// process (au tout premier "open"), pas à chaque reconnexion automatique
// suivante. WhatsApp coupe périodiquement les sessions liées (normal, pas
// un bug), et le bot les rétablit tout seul en arrière-plan grâce à la
// session sauvegardée : ces reconnexions n'ont pas besoin d'être notifiées
// à chaque fois, seul le tout premier démarrage réel est utile à signaler.
let hasSentConnectMessage = false;

// ===================== PROTECTION DU CRÉDIT CRÉATEUR =====================
// N'importe qui peut déployer ce bot avec son propre numéro (OWNER_NUMBER).
// Par contre, le crédit du créateur original doit rester quelque part dans
// OWNER_NAME (dans config.js). Si ce nom est retiré ou modifié, le bot
// refuse de démarrer. On peut ajouter son propre nom À CÔTÉ, par exemple :
//   OWNER_NAME: "ARIEL MD 🤖 | TonNom"
// mais "ARIEL MD" doit toujours apparaître dedans.
const PROTECTED_CREDIT = "ARIEL MD";

function checkCredit() {
  const ownerName = String(config.OWNER_NAME || "").toUpperCase();
  if (!ownerName.includes(PROTECTED_CREDIT)) {
    console.error(
      "\n❌ Démarrage impossible : le nom du créateur a été retiré de OWNER_NAME (config.js).\n" +
        `   Garde "${PROTECTED_CREDIT}" dans OWNER_NAME (tu peux ajouter ton propre nom à côté).\n` +
        `   Exemple : OWNER_NAME: "${PROTECTED_CREDIT} 🤖 | TonNom"\n`
    );
    process.exit(1);
  }
}

// Revérifie régulièrement en relisant config.js directement (et pas via
// require, qui est mis en cache). Utile sur les hébergements qui ne
// redémarrent pas le process après une modification de fichier.
function watchCredit() {
  setInterval(() => {
    try {
      delete require.cache[require.resolve("./config")];
      const freshConfig = require("./config");
      const ownerName = String(freshConfig.OWNER_NAME || "").toUpperCase();
      if (!ownerName.includes(PROTECTED_CREDIT)) {
        console.error(
          `\n❌ OWNER_NAME a été modifié pendant l'exécution : "${PROTECTED_CREDIT}" a disparu. Arrêt du bot.\n`
        );
        process.exit(1);
      }
    } catch (e) {
      console.warn("Avertissement : relecture de config.js impossible :", e.message);
    }
  }, 5 * 60 * 1000); // toutes les 5 minutes
}

// Vérifie que le binaire yt-dlp (téléchargé automatiquement dans bin/ par
// scripts/download-ytdlp.js lors du npm install) est bien présent. Requis
// par .yt, .tiktok, .fb et .play.
function checkYtDlp() {
  const fs = require("fs");
  const path = require("path");
  const ytdlpPath = path.join(__dirname, "bin", "yt-dlp");
  if (!fs.existsSync(ytdlpPath)) {
    console.warn(
      "⚠️  Le binaire yt-dlp (bin/yt-dlp) est introuvable : téléchargement automatique en cours...\n" +
        "   (.yt, .tiktok, .fb et .play seront indisponibles tant que ce n'est pas terminé)"
    );
    // Beaucoup de panels d'hébergement bloquent les scripts "postinstall" de
    // npm par sécurité, donc le téléchargement fait pendant "npm install"
    // peut ne jamais avoir lieu. On retente ici, directement au démarrage du
    // bot, pour ne plus dépendre de ce postinstall.
    try {
      const { ensureYtDlp } = require("./scripts/download-ytdlp");
      ensureYtDlp().then((ok) => {
        if (ok) console.log("✅ yt-dlp est maintenant prêt : .yt/.tiktok/.fb/.play fonctionnent.");
      });
    } catch (e) {
      console.warn("Impossible de lancer le téléchargement automatique de yt-dlp :", e.message);
    }
  }
}

// Vérifie que le binaire ffmpeg portable (fourni par le paquet ffmpeg-static,
// aucun accès root/apt nécessaire) est bien présent. Requis par .play, .yt,
// .tiktok, .fb et .sticker. N'empêche pas le bot de démarrer : affiche juste
// un avertissement clair en console si le binaire est introuvable.
function checkFfmpeg() {
  try {
    const ffmpegPath = require("ffmpeg-static");
    const fs = require("fs");
    if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
      throw new Error("binaire introuvable");
    }
  } catch {
    console.warn(
      "⚠️  Le binaire ffmpeg (paquet ffmpeg-static) est introuvable.\n" +
        "   Les commandes .play, .yt, .tiktok, .fb et .sticker ne fonctionneront pas.\n" +
        "   Relance : npm install ffmpeg-static"
    );
  }
}

// ===================== NUMÉRO DE TÉLÉPHONE (MULTI-PANEL) =====================
// But : marcher pareil sur OptikLink, Katabump, un autre panel Pterodactyl,
// un VPS, ou en local — sans jamais planter, quel que soit l'environnement,
// ET sans obliger à éditer config.js à la main.
//
// Ordre de priorité :
//   1. Argument passé dans la commande de démarrage du panel, ex :
//        node index.js 2250788523990
//      C'est LE moyen qui marche sur tous les panels, même ceux (comme
//      Katabump) qui n'ont pas de champ "variables" personnalisées : le
//      champ "Startup Command" est toujours modifiable, lui.
//   2. Variable d'environnement PHONE_NUMBER (si le panel en propose)
//   3. config.js -> PHONE_NUMBER (utile en dernier recours / en local)
//   4. Saisie en console, UNIQUEMENT si stdin est un vrai terminal interactif
//      (utile en local ou sur les panels qui transmettent bien le clavier,
//      comme OptikLink). Sur les panels où la console n'est pas interactive,
//      cette étape est sautée pour éviter le crash "ERR_USE_AFTER_CLOSE".
function getConfiguredPhoneNumber() {
  const fromArgs = process.argv[2];
  const raw = fromArgs || process.env.PHONE_NUMBER || config.PHONE_NUMBER || "";
  return String(raw).replace(/[^0-9]/g, "");
}

async function resolvePhoneNumber() {
  let phoneNumber = getConfiguredPhoneNumber();
  if (phoneNumber) return phoneNumber;

  if (process.stdin.isTTY) {
    try {
      const answer = await question(
        "📱 Entre ton numéro WhatsApp avec l'indicatif pays (ex: 2250788523990) : "
      );
      phoneNumber = String(answer || "").replace(/[^0-9]/g, "");
    } catch (e) {
      // La console s'est fermée pendant qu'on attendait une réponse
      // (arrive sur certains panels malgré isTTY=true) : on retombe sur
      // le message d'erreur ci-dessous plutôt que de crasher.
      phoneNumber = "";
    }
  }

  if (!phoneNumber || phoneNumber.length < 8) {
    console.error(
      "\n❌ Aucun numéro WhatsApp valide n'a été trouvé.\n" +
        "   Le plus simple : modifie la commande de démarrage dans ton panel pour\n" +
        "   'node index.js TONNUMERO' (ex: node index.js 2250788523990), puis redémarre.\n" +
        "   Tu peux aussi le mettre dans config.js -> PHONE_NUMBER, ou dans une\n" +
        "   variable d'environnement PHONE_NUMBER si ton panel le permet.\n"
    );
    process.exit(1);
  }

  return phoneNumber;
}

// Demande un code d'appairage à WhatsApp, avec quelques tentatives en cas
// d'échec temporaire (utile juste après l'ouverture du socket, où WhatsApp
// peut refuser une première demande trop rapprochée selon les hébergeurs).
async function requestPairingCodeWithRetry(sock, phoneNumber, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      return await sock.requestPairingCode(phoneNumber);
    } catch (err) {
      console.warn(`⚠️  Échec de la demande de code (tentative ${i}/${attempts}) :`, err.message);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function startBot() {
  console.log("⏳ Chargement de la session (dossier session/)...");
  const { state, saveCreds } = await useMultiFileAuthState("session");

  console.log("⏳ Vérification de la version Baileys la plus récente...");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // on utilise le code d'appairage, pas le QR
    logger: pino({ level: "silent" }),
    browser: ["Ubuntu", "Chrome", "20.0.04"],
  });

  contactsStore.init(sock);

  // --- Si pas encore connecté : demander le numéro et générer le code ---
  if (!sock.authState.creds.registered) {
    console.log("ℹ️  Aucune session enregistrée : demande du numéro de téléphone.");

    const phoneNumber = await resolvePhoneNumber();

    // Petit délai avant de demander le code : sur certains hébergeurs, le
    // socket WhatsApp n'est pas encore totalement prêt juste après sa
    // création, et une demande immédiate peut échouer ou fermer la
    // connexion aussitôt. Ce délai évite ce cas de figure sans rien changer
    // pour les hébergeurs où ce n'est pas nécessaire.
    await new Promise((r) => setTimeout(r, 3000));

    try {
      const code = await requestPairingCodeWithRetry(sock, phoneNumber);
      console.log(
        `\n🔑 Ton code d'appairage : ${code}\n` +
        `\nSur ton téléphone : WhatsApp > Paramètres > Appareils liés > ` +
        `Lier un appareil > "Lier avec un numéro de téléphone", puis entre ce code ` +
        `RAPIDEMENT (il expire après environ 60 secondes).\n`
      );
    } catch (err) {
      console.error(
        "\n❌ Impossible d'obtenir un code d'appairage après plusieurs tentatives :",
        err.message,
        "\n   Vérifie que PHONE_NUMBER est correct et que ce numéro n'a pas déjà" +
        "\n   atteint la limite de 4 appareils liés sur WhatsApp.\n"
      );
      process.exit(1);
    }
  } else {
    console.log("✅ Session déjà enregistrée trouvée : tentative de reconnexion (pas besoin de re-pairer)...");
  }

  // Fenêtre de grâce juste après une (re)connexion : WhatsApp/Baileys peut
  // livrer d'un coup un paquet de messages en attente (envoyés bien avant,
  // pendant que le bot était hors ligne) avec un horodatage qui ne reflète
  // pas toujours fidèlement leur heure d'envoi d'origine — le seul filtre
  // par horodatage (plus bas) ne suffit donc pas toujours à lui seul. On
  // ignore ici TOUT message reçu dans les premières secondes suivant chaque
  // connexion/reconnexion, peu importe son horodatage annoncé : c'est cette
  // fenêtre qui empêche de répondre à une commande tapée bien avant que le
  // bot ne redémarre.
  let readyAt = 0;
  // Heure de la dernière (re)connexion effective ("open"). Contrairement à
  // START_TIME (fixé une seule fois au tout premier démarrage du process),
  // celle-ci se met à jour à CHAQUE reconnexion — y compris quand le process
  // Node ne redémarre pas vraiment mais que seule la connexion WhatsApp se
  // coupe puis se rétablit (ce qui arrive souvent sur les hébergeurs qui
  // "redémarrent" le bot toutes les heures). Sans ça, un message tapé
  // pendant une coupure de quelques minutes, en plein milieu d'une longue
  // session du bot, passait le filtre par horodatage (car bien plus récent
  // que START_TIME) et n'était retenu que par la fenêtre de grâce de 6s
  // ci-dessous — trop courte si WhatsApp délivre la file d'attente en
  // plusieurs paquets étalés dans le temps.
  let lastConnectionOpenAt = Date.now();

  // --- Gestion de la connexion ---
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connexion fermée. Reconnexion :", shouldReconnect);

      if (shouldReconnect) {
        // Si une reconnexion est déjà programmée, on ignore ce deuxième
        // événement "close" au lieu d'ouvrir une connexion en plus.
        if (isReconnecting) {
          console.log("Reconnexion déjà en cours, on ignore ce doublon.");
          return;
        }
        isReconnecting = true;
        // Petit délai pour laisser le temps à l'ancienne connexion de bien
        // se fermer côté serveur WhatsApp avant d'en ouvrir une nouvelle.
        setTimeout(() => {
          isReconnecting = false;
          startBot();
        }, 3000);
      } else {
        safeCloseReadline();
      }
    } else if (connection === "open") {
      isReconnecting = false;
      lastConnectionOpenAt = Date.now();
      setLastConnectionOpenAt(lastConnectionOpenAt);
      // On ignore tout message arrivant dans les 15 prochaines secondes (voir
      // commentaire sur `readyAt` plus haut). Allongé de 6s à 15s : WhatsApp
      // peut délivrer la file d'attente accumulée pendant une coupure en
      // plusieurs paquets étalés dans le temps, pas toujours d'un seul coup.
      readyAt = Date.now() + 15000;
      console.log(`✅ ${config.BOT_NAME} est connecté à WhatsApp !`);
      safeCloseReadline();

      // Envoie un message en DM au propriétaire pour confirmer que le bot
      // est bien connecté (utile pour le savoir tout de suite sans avoir à
      // rouvrir la console de l'hébergeur, notamment après un vrai
      // redémarrage du process). On ne le fait qu'une fois par démarrage :
      // les reconnexions automatiques suivantes (coupures WhatsApp
      // normales, souvent après quelques heures) restent silencieuses.
      if (!hasSentConnectMessage) {
        hasSentConnectMessage = true;
        try {
          // On envoie au JID du compte connecté lui-même (self-chat / "from me"),
          // et non plus à config.OWNER_NUMBER : ainsi le message apparaît toujours
          // dans la conversation "Vous" du numéro qui héberge le bot, même si
          // OWNER_NUMBER pointe vers un autre numéro (propriétaire différent).
          const selfJid = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
          const now = new Intl.DateTimeFormat("fr-FR", {
            timeZone: "Africa/Abidjan",
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date());
          await sock.sendMessage(selfJid, {
            text: `✅ *${config.BOT_NAME}* est connecté et opérationnel.\n🕐 ${now}`,
          });
        } catch (e) {
          console.log("Impossible d'envoyer le message de connexion :", e.message);
        }
      }

      // Recharge les statuts (.scstatus) programmés avant un éventuel
      // redémarrage, pour qu'ils partent bien à l'heure prévue.
      if (typeof commands.initScheduledStatuses === "function") {
        try {
          commands.initScheduledStatuses(sock);
        } catch (e) {
          console.log("Erreur rechargement statuts programmés :", e.message);
        }
      }

      // Précharge l'image du menu en mémoire dès la connexion, pour que le
      // tout premier .menu soit déjà rapide (pas seulement les suivants).
      commands.getMenuImageBuffer?.().catch(() => {});
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // --- Fonctionnalités automatiques (anti-delete, welcome, etc.) ---
  setupFeatures(sock);

  // --- Gestion des commandes ---
  // Anti-doublon PERSISTANT : Baileys peut parfois redélivrer le même
  // message (notamment pour tes propres messages, fromMe, ou après un
  // redémarrage du process côté hébergeur), ce qui exécutait la commande une
  // deuxième fois. La liste des IDs déjà traités est maintenant sauvegardée
  // sur le disque (state.js -> processed-ids.json) : une commande une fois
  // exécutée ne sera JAMAIS rejouée, même après un vrai redémarrage complet
  // du bot. Seul un nouveau message (nouvel ID, donc une commande retapée)
  // sera traité.
  // Anti-spam pour le mode absent (.afk) : évite de renvoyer le message
  // d'absence à chaque message reçu du même contact (une fois toutes les
  // 5 minutes par contact suffit largement).
  const afkRepliedRecently = new Map(); // jid -> timestamp du dernier envoi

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const msg = messages[0];
    if (!msg.message) return;

    // Fenêtre de grâce après une (re)connexion : voir commentaire sur
    // `readyAt` plus haut. On ignore tout, peu importe l'horodatage annoncé
    // par le message, pendant ces quelques secondes.
    if (Date.now() < readyAt) {
      return;
    }

    // Anti-vieilles-commandes : après un .restart (ou tout redémarrage), le
    // téléphone/serveur WhatsApp peut redélivrer des messages envoyés AVANT
    // que le bot ne soit revenu en ligne (ex: une commande tapée pendant les
    // quelques secondes de redémarrage), et Baileys les fait parfois arriver
    // avec type="notify" comme s'il s'agissait de nouveaux messages. On
    // ignore donc tout message dont l'horodatage est antérieur au démarrage
    // du process (avec 10s de marge pour les petits décalages d'horloge).
    // NB: messageTimestamp peut arriver comme nombre, chaîne, ou objet
    // "Long" selon les versions de Baileys — .toNumber() gère ce dernier cas.
    const rawTimestamp = msg.messageTimestamp;
    const msgTimestamp =
      rawTimestamp && typeof rawTimestamp === "object" && typeof rawTimestamp.toNumber === "function"
        ? rawTimestamp.toNumber() * 1000
        : Number(rawTimestamp) * 1000; // secondes -> ms
    // On compare à la PLUS RÉCENTE des deux références (démarrage du
    // process, ou dernière reconnexion WhatsApp) : couvre à la fois un vrai
    // redémarrage du process ET une simple coupure/reprise de connexion en
    // cours de route (voir commentaire sur `lastConnectionOpenAt` plus haut).
    const freshnessThreshold = Math.max(START_TIME, lastConnectionOpenAt) - 10_000;
    if (msgTimestamp && msgTimestamp < freshnessThreshold) {
      return;
    }

    // Anti-vieux-message ABSOLU : peu importe le démarrage ou la dernière
    // reconnexion, un message tapé "maintenant" a toujours un horodatage à
    // quelques secondes de l'heure réelle actuelle. Si WhatsApp redélivre un
    // vieux message (mis en file d'attente pendant une coupure, un
    // redémarrage, ou même sans coupure visible) avec un horodatage plus
    // ancien que ça, on le rejette — MÊME si ce timestamp est plus récent que
    // START_TIME/lastConnectionOpenAt (donc même si le filtre au-dessus ne
    // l'a pas déjà arrêté). C'est la vraie garantie qu'AUCUNE commande tapée
    // il y a plus d'une minute ne peut être exécutée, peu importe la raison
    // de la redélivrance.
    const MAX_MESSAGE_AGE_MS = 60_000; // 60s de marge (réseau lent, horloge tel/serveur)
    if (msgTimestamp && Date.now() - msgTimestamp > MAX_MESSAGE_AGE_MS) {
      return;
    }

    // Anti-réexécution DÉFINITIF : si ce message (même ID) a déjà été traité
    // un jour — y compris avant un redémarrage complet du process — on
    // l'ignore. C'est la garantie ultime : une commande déjà exécutée n'est
    // JAMAIS rejouée, quoi qu'il arrive au bot entre-temps.
    const msgId = msg.key.id;
    if (isMessageProcessed(msgId)) {
      return;
    }
    markMessageProcessed(msgId);

    const from = msg.key.remoteJid;

    // Apprend ce contact "en passant" (voir contacts-store.js), pour que
    // .setstatus / .scstatus sans numéro puisse toucher les gens avec qui tu
    // discutes réellement, même si l'historique complet n'est pas synchronisé.
    contactsStore.addJids([from, msg.key.participant].filter(Boolean));

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      msg.message.imageMessage?.caption ||
      "";

    // Le bot tourne sur ton propre numéro : tes propres messages arrivent
    // avec fromMe=true. On les traite quand même s'ils commencent par un
    // préfixe (une vraie commande), mais on ignore tout le reste de ce
    // que TU envoies pour éviter que le bot ne réagisse à chaque message
    // que tu écris normalement à tes contacts.
    const prefixes = config.PREFIXES || [config.PREFIX];
    const usedPrefix = prefixes.find((p) => body.startsWith(p));

    // --- Mode absent (.afk) ---
    // Désactivation automatique dès que TU écris un message normal (pas une
    // commande) : signe que tu es de retour. On ne désactive pas si c'est
    // une commande (ex: .afk lui-même) pour ne pas se marcher dessus.
    if (msg.key.fromMe && !usedPrefix && isAfkActive()) {
      setAfk(false, "");
    }
    // Réponse automatique à qui t'écrit en DM (pas en groupe) pendant que
    // le mode absent est actif — avec un cooldown de 5 min par contact
    // pour ne pas spammer la même personne à chaque message.
    if (!msg.key.fromMe && !from.endsWith("@g.us") && isAfkActive()) {
      const lastReply = afkRepliedRecently.get(from) || 0;
      if (Date.now() - lastReply > 5 * 60 * 1000) {
        afkRepliedRecently.set(from, Date.now());
        if (afkRepliedRecently.size > 500) {
          afkRepliedRecently.delete(afkRepliedRecently.keys().next().value);
        }
        sock
          .sendMessage(from, { text: `🌙 *Mode absent*\n${getAfkMessage()}` })
          .catch((e) => console.log("Erreur réponse .afk:", e.message));
      }
    }

    // --- Réponse automatique persistante (.autoreply) ---
    // Contrairement à .afk : ne se désactive jamais toute seule (ni quand tu
    // écris, ni au redémarrage du bot) — seul .autoreply off l'arrête.
    // Même cooldown de 5 min par contact, DM uniquement.
    if (!msg.key.fromMe && !from.endsWith("@g.us") && isAutoReplyActive()) {
      const lastReply = afkRepliedRecently.get(`autoreply:${from}`) || 0;
      if (Date.now() - lastReply > 5 * 60 * 1000) {
        afkRepliedRecently.set(`autoreply:${from}`, Date.now());
        if (afkRepliedRecently.size > 500) {
          afkRepliedRecently.delete(afkRepliedRecently.keys().next().value);
        }
        sock
          .sendMessage(from, { text: `🤖 *Réponse automatique*\n${getAutoReplyMessage()}` })
          .catch((e) => console.log("Erreur réponse .autoreply:", e.message));
      }
    }

    if (msg.key.fromMe && !usedPrefix) return;
    if (!usedPrefix) return;

    const bodyAfterPrefix = body.slice(usedPrefix.length).trim();

    // --- Commande spéciale : .grok_clé_api=gsk_xxx pour enregistrer la clé
    // Groq directement depuis WhatsApp, sans toucher au fichier config.js
    // à la main. Réservé au propriétaire du bot.
    const keySetMatch = bodyAfterPrefix.match(/^grok[_ ]?cl[ée]?_?api\s*=\s*(\S+)$/i);
    if (keySetMatch) {
      const senderNumber = msg.key.fromMe
        ? config.OWNER_NUMBER
        : (msg.key.participant || from).split("@")[0];
      if (senderNumber !== config.OWNER_NUMBER) return;

      const newKey = keySetMatch[1];
      try {
        const configPath = path.join(__dirname, "config.js");
        let content = fs.readFileSync(configPath, "utf8");
        if (!/GROQ_API_KEY\s*:/.test(content)) {
          throw new Error("Ligne GROQ_API_KEY introuvable dans config.js");
        }
        content = content.replace(
          /GROQ_API_KEY\s*:\s*"[^"]*"/,
          `GROQ_API_KEY: "${newKey}"`
        );
        fs.writeFileSync(configPath, content, "utf8");
        await sock.sendMessage(from, {
          text:
            "✅ Clé Groq enregistrée dans config.js !\n" +
            "⚠️ Redémarre le bot pour qu'elle soit prise en compte, puis retape .gpt.",
        });
      } catch (err) {
        console.error("Erreur enregistrement clé Groq :", err);
        await sock.sendMessage(from, {
          text: "❌ Impossible d'enregistrer la clé automatiquement. Colle-la à la main dans config.js (GROQ_API_KEY).",
        });
      }
      return;
    }

    // Mode privé : seul le propriétaire peut utiliser le bot.
    // Si c'est toi qui envoies la commande (fromMe), on sait déjà que
    // c'est toi, le propriétaire.
    const senderNumber = msg.key.fromMe
      ? config.OWNER_NUMBER
      : (msg.key.participant || from).split("@")[0];
    if (config.MODE === "private" && senderNumber !== config.OWNER_NUMBER) return;

    const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedId = msg.message.extendedTextMessage?.contextInfo?.stanzaId;

    let [cmdName, ...args] = bodyAfterPrefix.split(/\s+/);

    // Réponse (avec un préfixe, peu importe le mot utilisé) à un média vue
    // unique déjà en cache ou encore récupérable : on traite ça comme .ok,
    // pour révéler le média sans devoir taper exactement ".ok". Réservé au
    // propriétaire, comme .ok lui-même.
    if (quoted && senderNumber === config.OWNER_NUMBER) {
      const alreadyCached = getViewOnce(quotedId);
      const isViewOnce = alreadyCached || extractViewOnce(quoted);
      if (isViewOnce) {
        cmdName = "ok";
        args = [];
      }
    }

    const command = commands.find((c) => c.name === cmdName.toLowerCase());
    if (!command) return;

    // Petite réaction (ex: ⏳) sur le message pour montrer que la commande a
    // bien été reçue, AVANT qu'elle ne s'exécute. On n'attend pas le
    // résultat (pas de "await") pour ne pas retarder la commande elle-même,
    // et une erreur ici (ex: réaction refusée) ne doit jamais bloquer
    // l'exécution de la commande.
    // Capturé une seule fois : si ce réglage change en cours de route (cas
    // très rare), on garde quand même la même valeur pour poser ET retirer
    // la réaction, plutôt que de risquer de la poser sans jamais la retirer.
    const reactEmoji = getSetting("COMMAND_REACT_EMOJI");

    if (reactEmoji) {
      sock
        .sendMessage(from, { react: { text: reactEmoji, key: msg.key } })
        .catch((e) => console.log("Erreur réaction commande:", e.message));
    }

    // --- Simulation de frappe (.autotyping) : montre "...est en train
    // d'écrire" pendant un court instant avant que la commande ne réponde,
    // pour un rendu plus naturel. On attend réellement le délai ici (donc
    // avant l'exécution de la commande) plutôt qu'en arrière-plan, sinon la
    // réponse partirait avant que l'indicateur ait eu le temps de s'afficher.
    if (getSetting("AUTO_TYPING")) {
      try {
        const typingDelay = Math.max(1200, Math.min(4000, bodyAfterPrefix.length * 100));
        // NB: pas de presenceSubscribe ici — cet appel sert à s'abonner à la
        // présence d'un contact individuel, pas à envoyer la sienne. Sur un
        // groupe ou un contact jamais "ouvert", il peut rester bloqué sans
        // jamais répondre et geler tout le traitement du message. On protège
        // aussi l'ensemble avec un timeout de sécurité : si WhatsApp met du
        // temps à confirmer la présence, on n'attend jamais plus de 5s.
        await Promise.race([
          (async () => {
            await sock.sendPresenceUpdate("composing", from);
            await new Promise((r) => setTimeout(r, typingDelay));
            await sock.sendPresenceUpdate("paused", from);
          })(),
          new Promise((r) => setTimeout(r, 5000)),
        ]);
      } catch (e) {
        console.log("Erreur simulation de frappe:", e.message);
      }
    }


    // On enveloppe "sock" pour que TOUTE réponse envoyée par une commande
    // cite automatiquement le message qui l'a déclenchée (comme quand on
    // tire un message vers la gauche sur WhatsApp pour y répondre). Comme
    // ça, aucune commande n'a besoin d'être modifiée une par une : il suffit
    // que command.run() reçoive ce "sock" enveloppé au lieu du sock brut.
    const sockReply = new Proxy(sock, {
      get(target, prop, receiver) {
        if (prop === "sendMessage") {
          return (jid, content, options = {}) =>
            target.sendMessage(jid, content, { quoted: msg, ...options });
        }
        const value = Reflect.get(target, prop, receiver);
        // Les autres méthodes du sock (groupMetadata, downloadMediaMessage,
        // etc.) doivent rester liées à l'objet d'origine, sinon un "this"
        // interne pointerait vers ce Proxy au lieu du vrai socket.
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    try {
      await command.run(sockReply, msg, { from, args, quoted, quotedId, senderNumber });
    } catch (err) {
      console.error(`Erreur dans la commande ${cmdName}:`, err);
      await sock.sendMessage(from, { text: "❌ Une erreur est survenue." }, { quoted: msg });
    } finally {
      // Retire la réaction posée avant l'exécution (ex: ⏳), maintenant que
      // la commande a fini de s'exécuter (avec ou sans erreur) : sur
      // WhatsApp, on "enlève" une réaction en en renvoyant une avec un texte
      // vide sur la même clé de message.
      if (reactEmoji) {
        sock
          .sendMessage(from, { react: { text: "", key: msg.key } })
          .catch((e) => console.log("Erreur suppression réaction commande:", e.message));
      }
    }
  });
}

// ===================== SERVEUR HTTP DE COMPATIBILITÉ (MULTI-PANEL) =====================
// Ce bot n'a besoin d'aucun serveur web pour fonctionner : il ne parle qu'à
// WhatsApp. Mais certains panels/hébergeurs (Render, Railway, Replit, ou des
// panels Pterodactyl configurés en mode "web service") surveillent un port
// HTTP pour savoir si l'app est "vivante", et redémarrent le process s'ils
// ne reçoivent jamais de réponse dessus — ce qui peut ressembler exactement
// à "le bot redémarre tout seul régulièrement", même quand WhatsApp reste
// bien connecté de son côté.
//
// On ouvre donc un petit serveur qui répond juste "OK" sur le port fourni
// par le panel (variable d'environnement PORT), ou 3000 par défaut. Sur les
// panels qui n'en ont pas besoin, ce serveur ne gêne strictement rien : il
// tourne juste en silence à côté. S'il ne peut pas démarrer pour une raison
// quelconque (port déjà utilisé, environnement qui bloque l'écoute réseau...),
// on l'ignore sans jamais faire planter le bot pour autant.
function startHealthCheckServer() {
  try {
    const http = require("http");
    const port = Number(process.env.PORT) || 3000;
    const server = http.createServer((req, res) => {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`${config.BOT_NAME} est en ligne.`);
    });
    server.on("error", (e) => {
      console.warn("⚠️  Serveur HTTP de compatibilité indisponible (ignoré) :", e.message);
    });
    server.listen(port, () => {
      console.log(`🌐 Serveur HTTP de compatibilité à l'écoute sur le port ${port}.`);
    });
  } catch (e) {
    console.warn("⚠️  Impossible de démarrer le serveur HTTP de compatibilité (ignoré) :", e.message);
  }
}

checkCredit();
checkFfmpeg();
checkYtDlp();
watchCredit();
startHealthCheckServer();
startBot();
