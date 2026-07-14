//════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════//
//                                                                                                                                                                                        //
//                                                                   𝐀𝐑𝐈𝐄𝐋-𝐁𝐎𝐓-𝐌𝐃                                                                                                          //
//                                                                                                                                                                                        //
//                                                                  𝐕 : 1.0.0                                                                                                             //
//                                                                                                                                                                                        //
//                                                                                                                                                                                        //
//                 █████╗ ██████╗ ██╗███████╗██╗      ██████╗  ██████╗ ████████╗   ███╗   ███╗██████╗                                                                       //
//                ██╔══██╗██╔══██╗██║██╔════╝██║      ██╔══██╗██╔═══██╗╚══██╔══╝   ████╗ ████║██╔══██╗                                                                      //
//                ███████║██████╔╝██║█████╗  ██║█████╗██████╔╝██║   ██║   ██║█████╗██╔████╔██║██║  ██║                                                                      //
//                ██╔══██║██╔══██╗██║██╔══╝  ██║╚════╝██╔══██╗██║   ██║   ██║╚════╝██║╚██╔╝██║██║  ██║                                                                      //
//                ██║  ██║██║  ██║██║███████╗███████╗ ██████╔╝╚██████╔╝   ██║      ██║ ╚═╝ ██║██████╔╝                                                                      //
//                ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝ ╚═════╝  ╚═════╝    ╚═╝      ╚═╝     ╚═╝╚═════╝                                                                       //
//                                                                                                                                                                                        //
//                                                                 𝐂𝐎𝐏𝐘𝐑𝐈𝐆𝐇𝐓 2025                                                                                                        //
//                                                                                                                                                                                        //
//                                                                                                                                                                                        //
//════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════//
//* 
//  * project_name : ARIEL-MD
//  * author : wallyjaytech
//  * youtube : https://www.youtube.com/wallyjaytechy
//  * description : WALLYJAYTECH-MD ,A Multi-Device whatsapp user bot.
//*
//*
//re-upload? recode? copy code? give credit to wallyjaytech 2025:)
//Instagram: wallyjaytech
//Telegram: t.me/wallyjaytech
//GitHub: wallyjaytechh
//WhatsApp: +2348144317152
//want more free bot scripts? subscribe to my youtube channel: https://youtube.com/@wallyjaytechy
//   * Created By Github: wallyjaytechh.
//   * Credit To ally jay tech
//   * © 2025 WALLYJAYTECH-MD.
// ⛥┌┤
// */
/**
 * WALLYJAYTECH-MD - A WhatsApp Bot
 * Auto Status Viewer with Likes (💚 Green Heart)
 * Professional Version with Include/Exclude & Self-View
 * FULLY FIXED: Self-View now works by comparing bot's own JID/LID
 */

const fs = require('fs');
const path = require('path');
const { OWNER_NUMBER } = require('./config');
const { START_TIME, getLastConnectionOpenAt } = require('./state');

const configPath = path.join(__dirname, 'data', 'autostatus.json');

const defaultConfig = {
    enabled: false,
    likeOn: false,
    selfOn: false,
    includeMode: false,
    numberList: []
};

// ═══════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════

function initConfig() {
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        
        const configHash = JSON.stringify(defaultConfig);
        
        if (!fs.existsSync(configPath)) {
            fs.writeFileSync(configPath, JSON.stringify({ ...defaultConfig, _hash: configHash }, null, 2));
        }
        
        const config = JSON.parse(fs.readFileSync(configPath));
        let needsUpdate = false;
        
        for (const [key, value] of Object.entries(defaultConfig)) {
            if (config[key] === undefined) { config[key] = value; needsUpdate = true; }
        }
        if (config._hash !== configHash) needsUpdate = true;
        
        if (needsUpdate) {
            config._hash = configHash;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log('📝 Autostatus config migrated');
        }
        
        return config;
    } catch (error) { 
        console.error('❌ Error reading config:', error);
        return { ...defaultConfig }; 
    }
}

function readConfig() {
    return initConfig();
}

function writeConfig(config) {
    try {
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (e) {
        console.error('❌ Failed to write config:', e.message);
        return false;
    }
}

// ═══════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════

function extractPhoneNumber(jid) {
    if (!jid) return null;
    if (jid.endsWith('@lid')) return null;
    let phone = jid.split('@')[0];
    if (phone.includes(':')) phone = phone.split(':')[0];
    phone = phone.replace(/[^0-9]/g, '');
    return phone.length > 0 ? phone : null;
}

function isNumberInList(message) {
    const config = readConfig();
    if (!config.numberList || config.numberList.length === 0) return null;

    const isStatus = message.key.remoteJid === 'status@broadcast';
    let phone = null;

    if (isStatus) {
        const participant = message.key.participant;
        if (!participant) return null;

        if (participant.endsWith('@lid')) {
            if (message.key.remoteJidAlt?.includes('@s.whatsapp.net')) {
                phone = extractPhoneNumber(message.key.remoteJidAlt);
            }
        } else {
            phone = extractPhoneNumber(participant);
        }
    } else {
        const chatId = message.key.remoteJid;
        const isGroup = chatId.endsWith('@g.us');
        let senderJid = isGroup ? (message.key.participant || message.participant) : chatId;
        if (!senderJid) return null;

        if (senderJid.endsWith('@lid')) {
            if (message.key.remoteJidAlt?.includes('@s.whatsapp.net')) {
                phone = extractPhoneNumber(message.key.remoteJidAlt);
            } else if (message.key.participantAlt?.includes('@s.whatsapp.net')) {
                phone = extractPhoneNumber(message.key.participantAlt);
            }
        } else {
            phone = extractPhoneNumber(senderJid);
        }
    }

    if (!phone || phone.length < 7) return null;

    const found = config.numberList.some(num => {
        const normalizedNum = num.replace(/[^0-9]/g, '');
        return phone === normalizedNum || phone.endsWith(normalizedNum) || normalizedNum.endsWith(phone);
    });

    return config.includeMode ? found : !found;
}

// Convertit messageTimestamp (nombre, chaîne, ou objet "Long" selon les
// versions de Baileys) en millisecondes, comme dans index.js.
function getMessageTimestampMs(message) {
    const raw = message?.messageTimestamp;
    if (!raw) return null;
    const seconds =
        typeof raw === 'object' && typeof raw.toNumber === 'function'
            ? raw.toNumber()
            : Number(raw);
    return seconds ? seconds * 1000 : null;
}

// Fenêtre de fraîcheur : un statut plus vieux que ça (déjà en attente avant
// que le bot ne le reçoive — après une reconnexion, un redémarrage, etc.)
// est ignoré. Le bot ne réagit qu'aux statuts qui arrivent "en direct",
// jamais à un ancien lot ("hier", "il y a une heure"...).
const STATUS_FRESHNESS_WINDOW_MS = 90 * 1000; // 90 secondes

// Garde stricte supplémentaire (identique à celle utilisée pour les messages
// classiques dans index.js) : un statut est de toute façon rejeté s'il est
// antérieur au démarrage du process OU à la dernière reconnexion WhatsApp
// effective — peu importe la fenêtre glissante ci-dessus. Ça couvre le cas
// d'une reconnexion où WhatsApp redélivre d'un coup un statut publié juste
// avant la coupure : même s'il "rentre" dans les 90 dernières secondes par
// hasard, il reste antérieur à la connexion en cours et doit être ignoré.
const CONNECTION_GRACE_MS = 10 * 1000; // petite marge pour les décalages d'horloge

function isStatusFresh(message) {
    const ts = getMessageTimestampMs(message);
    const connectionThreshold = Math.max(START_TIME, getLastConnectionOpenAt()) - CONNECTION_GRACE_MS;

    if (!ts) {
        // Avant : on considérait "pas d'horodatage exploitable" comme "frais"
        // par défaut (fail-open) — c'était risqué : un statut dont on ne peut
        // pas lire la date passait alors TOUJOURS le filtre, même s'il était
        // vieux. On inverse maintenant la logique (fail-closed) : sans date
        // fiable, on considère le statut comme PAS frais, donc jamais vu.
        console.log('⏭️ Horodatage illisible sur ce statut → rejeté par sécurité (fail-closed)');
        return false;
    }

    console.log(`🕐 Horodatage statut: ${new Date(ts).toISOString()} | seuil connexion: ${new Date(connectionThreshold).toISOString()} | maintenant: ${new Date().toISOString()}`);

    if (ts < connectionThreshold) return false; // publié avant la connexion en cours : jamais lu

    return Date.now() - ts <= STATUS_FRESHNESS_WINDOW_MS;
}

// ═══════════════════════════════════════
// ANTI-DOUBLON
// ═══════════════════════════════════════
// Baileys peut redélivrer le même événement de statut (reconnexion, retry
// réseau, event "notify" + resync qui se chevauchent...). On garde donc en
// mémoire les IDs de statuts déjà traités pour ne jamais les revoir/liker
// une deuxième fois. Bornée en taille pour ne pas grossir indéfiniment.
const processedStatusIds = new Set();
const MAX_PROCESSED_CACHE = 2000;

function isDuplicateStatus(id) {
    if (!id) return false;
    if (processedStatusIds.has(id)) return true;
    processedStatusIds.add(id);
    if (processedStatusIds.size > MAX_PROCESSED_CACHE) {
        // Retire l'entrée la plus ancienne (ordre d'insertion des Set JS)
        processedStatusIds.delete(processedStatusIds.values().next().value);
    }
    return false;
}

// Résout un participant potentiellement masqué en @lid vers son vrai numéro
// (@s.whatsapp.net), via les champs annexes exposés par Baileys sur la clé
// du message. Renvoie null si aucune résolution n'est possible : dans ce
// cas WhatsApp ne peut pas rattacher l'accusé de lecture à une session
// chiffrée valide, et le statut reste alors bloqué dans "Récentes" côté
// téléphone même si le bot logge "Viewed" (readMessages() a bien tourné
// localement, mais le "vu" ne remonte jamais réellement à WhatsApp).
function resolveRealParticipant(msgKey) {
    const participant = msgKey.participant || msgKey.remoteJid;
    if (!participant) return null;
    if (!participant.endsWith('@lid')) return participant;

    const realNumber =
        msgKey.participantPn ||
        msgKey.senderPn ||
        msgKey.participantAlt ||
        msgKey.remoteJidAlt;

    return realNumber?.includes('@s.whatsapp.net') ? realNumber : null;
}

// ✅ FIXED: Detects self-status by comparing participant LID to bot's own number
function shouldViewStatus(message, botJid) {
    try {
        const config = readConfig();
        if (!config.enabled) return false;
        if (!message.key || message.key.remoteJid !== 'status@broadcast') return false;

        // Ignore tout statut trop ancien (lot rattrapé après une coupure/
        // reconnexion) : on ne veut voir/liker que ce qui arrive à l'instant.
        if (!isStatusFresh(message)) return false;

        const participant = message.key.participant || '';
        const participantNumber = participant.split('@')[0];
        const botNumber = botJid ? botJid.split('@')[0] : null;

        // Detect self-status: fromMe OR participant number matches bot's own number
        const isSelf = message.key.fromMe === true || 
                       (botNumber && participantNumber === botNumber);

        // Self-view check
        if (isSelf && !config.selfOn) return false;

        // Skip number filter for own status (always view own)
        if (!isSelf) {
            const listResult = isNumberInList(message);
            if (listResult !== null && !listResult) return false;
        }

        return true;
    } catch (e) { return false; }
}

async function isAutoStatusEnabled() { 
    return readConfig().enabled; 
}

async function isStatusLikeEnabled() { 
    return readConfig().likeOn; 
}

// ═══════════════════════════════════════
// STATUS HANDLERS
// ═══════════════════════════════════════

async function likeStatus(sock, msgKey) {
    try {
        const config = readConfig();
        if (!config.enabled || !config.likeOn) return;

        // WhatsApp masque de plus en plus les contacts derrière un LID
        // (@lid) plutôt que leur vrai numéro (@s.whatsapp.net). Réagir à un
        // statut nécessite une session chiffrée vers l'identité exacte du
        // contact ; si seul le LID est connu et que Baileys n'a pas résolu
        // le vrai numéro, WhatsApp refuse la réaction (406 not-acceptable).
        const participant = resolveRealParticipant(msgKey);
        if (!participant) {
            console.log(`⏭️ Like sauté (contact en @lid, numéro non résolu) : ${msgKey.id}`);
            return;
        }

        const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // On utilise l'API officielle de Baileys pour réagir (sock.sendMessage
        // avec `react`) plutôt qu'un relayMessage construit à la main : c'est
        // cette dernière approche qui empêchait le 💚 de s'afficher (WhatsApp
        // acceptait la requête sans erreur mais ignorait la réaction, car le
        // message n'était pas généré/encodé comme Baileys l'attend).
        await sock.sendMessage('status@broadcast', {
            react: {
                text: '💚',
                key: msgKey
            }
        }, {
            statusJidList: [participant, myJid]
        });

        console.log(`💚 Liked: ${msgKey.id}`);
    } catch (error) {
        console.error('❌ Like error:', error.message);
    }
}

async function handleStatusUpdate(sock, status) {
    try {
        if (!status.messages || status.messages.length === 0) return;
        
        const msg = status.messages[0];
        const config = readConfig();
        const botJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;

        // Debug log
        console.log(`📱 Status received | from: ${msg.key.participant} | fromMe: ${msg.key.fromMe} | id: ${msg.key.id}`);
        if (msg.key.participant?.endsWith('@lid')) {
            console.log('🔍 Debug LID — champs bruts de la clé :', JSON.stringify(msg.key));
        }

        if (!shouldViewStatus(msg, botJid)) {
            console.log(isStatusFresh(msg) ? '⏭️ Status skipped (filtered)' : '⏭️ Status skipped (trop ancien, pas "à l\'instant")');
            return;
        }

        // Anti-doublon : ne jamais retraiter le même statut deux fois.
        if (isDuplicateStatus(msg.key.id)) {
            console.log(`⏭️ Status déjà vu, doublon ignoré : ${msg.key.id}`);
            return;
        }

        console.log(`👁️ Viewing status: ${msg.key.id} from ${msg.key.participant?.split('@')[0] || 'unknown'}`);

        // Marquer un statut comme "vu" = envoyer un accusé de lecture XML basé
        // uniquement sur la clé du message (remoteJid + id + participant).
        // Contrairement à un like (qui EST un vrai message chiffré et a donc
        // besoin d'une session/du vrai numéro derrière un @lid), readMessages()
        // et sendReceipt() n'ont besoin d'aucune session ni contenu déchiffré :
        // on peut donc utiliser le participant tel quel (LID ou numéro réel),
        // sans jamais bloquer/sauter la vue faute de résolution. C'est ce qui
        // empêchait les contacts jamais contactés d'être marqués comme vus.
        try {
            await sock.readMessages([msg.key]);
            console.log('✅ Viewed:', msg.key.id);

            // Send receipt for Android view count
            try {
                await sock.sendReceipt(
                    'status@broadcast',
                    msg.key.participant,
                    [msg.key.id],
                    'read'
                );
            } catch (receiptErr) {
                console.error('⚠️ Receipt error (statut non marqué comme vu dans l\'app) :', receiptErr.message);
            }

            // Like if enabled (le like garde sa propre logique de résolution
            // LID->numéro réel, car réagir nécessite une session chiffrée)
            if (config.likeOn) {
                await likeStatus(sock, msg.key);
            }
        } catch (err) {
            if (err.message?.includes('rate-overlimit')) {
                console.log('⚠️ Rate limit, waiting...');
                await new Promise(r => setTimeout(r, 2000));
                await sock.readMessages([msg.key]);
            } else {
                console.error('❌ View error:', err.message);
            }
        }
    } catch (e) {
        console.error('❌ Status error:', e.message);
    }
}

async function handleBulkStatusUpdate(sock, statusMessages) {
    try {
        const config = readConfig();
        if (!config.enabled) return;

        const botJid = sock.user?.id ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : null;

        console.log(`\n📦 Processing ${statusMessages.length} status updates...`);

        for (const msg of statusMessages) {
            if (!shouldViewStatus(msg, botJid)) continue;
            if (isDuplicateStatus(msg.key.id)) continue;

            try {
                await sock.readMessages([msg.key]);
                console.log('✅ Viewed:', msg.key.id);

                try {
                    await sock.sendReceipt(
                        'status@broadcast',
                        msg.key.participant,
                        [msg.key.id],
                        'read'
                    );
                } catch (e) {
                    console.error('⚠️ Receipt error (bulk) :', e.message);
                }

                if (config.likeOn) {
                    await likeStatus(sock, msg.key);
                }
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) { 
                    await new Promise(r => setTimeout(r, 2000)); 
                }
            }
        }
    } catch (e) {
        console.error('❌ Bulk status error:', e.message);
    }
}

// ═══════════════════════════════════════
// COMMAND HANDLER
// ═══════════════════════════════════════

async function autoStatusCommand(sock, chatId, message, args, senderNumber) {
    try {
        const isOwner = message.key.fromMe || senderNumber === OWNER_NUMBER;
        if (!isOwner) {
            await sock.sendMessage(chatId, { text: '❌ This command is only available for the owner!'});
            return;
        }

        const config = readConfig();

        if (!args || args.length === 0) {
            const status = config.enabled ? '✅ ON' : '❌ OFF';
            const statusIcon = config.enabled ? '🟢' : '🔴';
            const likeStatus = config.likeOn ? '✅ ON' : '❌ OFF';
            const selfStatus = config.selfOn ? '✅ ON' : '❌ OFF';
            const filterMode = config.numberList.length > 0 ? (config.includeMode ? '✅ Include Only' : '🚫 Exclude') : '🌍 All Numbers';

            await sock.sendMessage(chatId, {
                text: `👁️ *AUTO-STATUS VIEWER SETTINGS*\n\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `${statusIcon} *Status Viewing:* ${status}\n` +
                      `💚 *Likes:* ${likeStatus}\n` +
                      `👤 *Self-View:* ${selfStatus}\n` +
                      `🔢 *Filter:* ${filterMode} (${config.numberList.length} numbers)\n\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `📖 *Commands:*\n` +
                      `└ .autostatus on - voire les statuts a l'instant.\n` +
                      `└ .autostatus off - désactive tout.\n` +
                      `└ .autostatuslike on - active les likes (💚) sur les statuts.\n` +
                      `└ .autostatuslike off - désactive les likes.\n` +
                      `└ .autostatus self on - voir aussi tes propres statuts.\n` +
                      `└ .autostatus self off - ignorer tes propres statuts.\n` +
                      `└ .autostatus include add <numeros> - ne voir que ces numéros.\n` +
                      `└ .autostatus include remove <numeros> - retirer ces numéros de la liste incluse.\n` +
                      `└ .autostatus exclude add <numeros> - ignorer ces numéros.\n` +
                      `└ .autostatus exclude remove <numeros> - retirer ces numéros de la liste exclue.\n` +
                      `└ .autostatus includelist / excludelist - afficher la liste inclusion/exclusion.\n` +
                      `└ .autostatus includeclear / excludeclear - vider la liste inclusion/exclusion.\n\n` +
                      `━━━━━━━━━━━━━━━━━━━━\n` +
                      `💡 *Examples:*\n` +
                      `└ .autostatus on\n` +
                      `└ .autostatuslike on\n` +
                      `└ .autostatus self on\n` +
                      `└ .autostatus include add 2347012345678`
            }, { quoted: message });
            return;
        }

        const cmd = args[0].toLowerCase();
        
        if (cmd === 'on') {
            if (config.enabled) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ *ALREADY ENABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n👁️ Auto-Status Viewer is already *ON*.`
                }, { quoted: message });
                return;
            }
            config.enabled = true;
            if (writeConfig(config)) {
                await sock.sendMessage(chatId, { 
                    text: `✅ *AUTO-STATUS VIEWER ENABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n👁️ Bot will now automatically view all status updates.`
                }, { quoted: message });
            }
        } 
        else if (cmd === 'off') {
            if (!config.enabled) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ *ALREADY DISABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n👁️ Auto-Status Viewer is already *OFF*.`
                }, { quoted: message });
                return;
            }
            config.enabled = false;
            config.likeOn = false;
            if (writeConfig(config)) {
                await sock.sendMessage(chatId, { 
                    text: `❌ *AUTO-STATUS VIEWER DISABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n👁️ Bot will no longer view or like statuses.`
                }, { quoted: message });
            }
        } 
        else if (cmd === 'autostatuslike') {
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ *USAGE*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 .autostatuslike <on/off>\n\n💡 *Example:* .autostatuslike on`
                }, { quoted: message });
                return;
            }
            const likeState = args[1].toLowerCase();
            if (likeState === 'on') {
                if (config.likeOn) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ *ALREADY ENABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n💚 Likes are already *ON*.`
                    }, { quoted: message });
                    return;
                }
                config.likeOn = true;
                if (writeConfig(config)) {
                    await sock.sendMessage(chatId, { 
                        text: `💚 *LIKES ENABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n💚 Bot will like viewed statuses with 💚.`
                    }, { quoted: message });
                }
            } else if (likeState === 'off') {
                if (!config.likeOn) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ *ALREADY DISABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n💚 Likes are already *OFF*.`
                    }, { quoted: message });
                    return;
                }
                config.likeOn = false;
                if (writeConfig(config)) {
                    await sock.sendMessage(chatId, { 
                        text: `❌ *LIKES DISABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n💚 Bot will view but not like statuses.`
                    }, { quoted: message });
                }
            }
        }
        else if (cmd === 'self') {
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ *USAGE*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 .autostatus self <on/off>\n\n💡 *Example:* .autostatus self on`
                }, { quoted: message });
                return;
            }
            const selfState = args[1].toLowerCase();
            if (selfState === 'on') {
                if (config.selfOn) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ *ALREADY ENABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n👤 Self-View is already *ON*.`
                    }, { quoted: message });
                    return;
                }
                config.selfOn = true;
                if (writeConfig(config)) {
                    await sock.sendMessage(chatId, { 
                        text: `👤 *SELF-VIEW ENABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n👤 Bot will now view its own status updates.`
                    }, { quoted: message });
                }
            } else if (selfState === 'off') {
                if (!config.selfOn) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ *ALREADY DISABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n👤 Self-View is already *OFF*.`
                    }, { quoted: message });
                    return;
                }
                config.selfOn = false;
                if (writeConfig(config)) {
                    await sock.sendMessage(chatId, { 
                        text: `❌ *SELF-VIEW DISABLED*\n\n━━━━━━━━━━━━━━━━━━━━\n👤 Bot will skip its own status updates.`
                    }, { quoted: message });
                }
            }
        }
        else if (cmd === 'include') {
            const sub = args[1]?.toLowerCase();
            if (sub === 'add') {
                const numbers = args.slice(2).join(' ').split(/[, ]+/).map(n => n.replace(/[^0-9]/g, '')).filter(n => n.length >= 7);
                if (numbers.length === 0) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ *USAGE*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 .autostatus include add <numbers>`
                    }, { quoted: message });
                    return;
                }
                config.includeMode = true;
                for (const num of numbers) { if (!config.numberList.includes(num)) config.numberList.push(num); }
                if (writeConfig(config)) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ *INCLUDE ADDED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Mode: Include Only\n🔢 Added ${numbers.length} number(s)`
                    }, { quoted: message });
                }
            }
            else if (sub === 'remove') {
                const numbers = args.slice(2).join(' ').split(/[, ]+/).map(n => n.replace(/[^0-9]/g, '')).filter(n => n.length >= 7);
                if (numbers.length === 0) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ *USAGE*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 .autostatus include remove <numbers>`
                    }, { quoted: message });
                    return;
                }
                const before = config.numberList.length;
                config.numberList = config.numberList.filter(n => !numbers.includes(n));
                if (writeConfig(config)) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ *INCLUDE REMOVED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Removed ${before - config.numberList.length} number(s)`
                    }, { quoted: message });
                }
            }
            else {
                await sock.sendMessage(chatId, { 
                    text: `📋 *INCLUDE MODE*\n\n━━━━━━━━━━━━━━━━━━━━\n🔢 Numbers: ${config.numberList.length}`
                }, { quoted: message });
            }
        }
        else if (cmd === 'exclude') {
            const sub = args[1]?.toLowerCase();
            if (sub === 'add') {
                const numbers = args.slice(2).join(' ').split(/[, ]+/).map(n => n.replace(/[^0-9]/g, '')).filter(n => n.length >= 7);
                if (numbers.length === 0) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ *USAGE*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 .autostatus exclude add <numbers>`
                    }, { quoted: message });
                    return;
                }
                config.includeMode = false;
                for (const num of numbers) { if (!config.numberList.includes(num)) config.numberList.push(num); }
                if (writeConfig(config)) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ *EXCLUDE ADDED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Mode: Exclude\n🔢 Added ${numbers.length} number(s)`
                    }, { quoted: message });
                }
            }
            else if (sub === 'remove') {
                const numbers = args.slice(2).join(' ').split(/[, ]+/).map(n => n.replace(/[^0-9]/g, '')).filter(n => n.length >= 7);
                if (numbers.length === 0) {
                    await sock.sendMessage(chatId, { 
                        text: `⚠️ *USAGE*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 .autostatus exclude remove <numbers>`
                    }, { quoted: message });
                    return;
                }
                const before = config.numberList.length;
                config.numberList = config.numberList.filter(n => !numbers.includes(n));
                if (writeConfig(config)) {
                    await sock.sendMessage(chatId, { 
                        text: `✅ *EXCLUDE REMOVED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 Removed ${before - config.numberList.length} number(s)`
                    }, { quoted: message });
                }
            }
            else {
                await sock.sendMessage(chatId, { 
                    text: `📋 *EXCLUDE MODE*\n\n━━━━━━━━━━━━━━━━━━━━\n🔢 Numbers: ${config.numberList.length}`
                }, { quoted: message });
            }
        }
        else if (cmd === 'includelist') {
            const nums = config.numberList;
            await sock.sendMessage(chatId, { 
                text: `📋 *INCLUDE LIST*\n\n━━━━━━━━━━━━━━━━━━━━\n🔢 Mode: Include Only\n📊 Total: ${nums.length}\n\n${nums.length > 0 ? nums.map((n, i) => `${i + 1}. +${n}`).join('\n') : '└ No numbers'}`
            }, { quoted: message });
        }
        else if (cmd === 'excludelist') {
            const nums = config.numberList;
            await sock.sendMessage(chatId, { 
                text: `📋 *EXCLUDE LIST*\n\n━━━━━━━━━━━━━━━━━━━━\n🔢 Mode: Exclude\n📊 Total: ${nums.length}\n\n${nums.length > 0 ? nums.map((n, i) => `${i + 1}. +${n}`).join('\n') : '└ No numbers'}`
            }, { quoted: message });
        }
        else if (cmd === 'includeclear') {
            if (config.numberList.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ *ALREADY EMPTY*\n\n━━━━━━━━━━━━━━━━━━━━\n📋 Include list is already empty.`
                }, { quoted: message });
                return;
            }
            config.numberList = [];
            if (writeConfig(config)) {
                await sock.sendMessage(chatId, { 
                    text: `✅ *INCLUDE LIST CLEARED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 All numbers removed.\n🌍 Will view all statuses.`
                }, { quoted: message });
            }
        }
        else if (cmd === 'excludeclear') {
            if (config.numberList.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: `⚠️ *ALREADY EMPTY*\n\n━━━━━━━━━━━━━━━━━━━━\n📋 Exclude list is already empty.`
                }, { quoted: message });
                return;
            }
            config.numberList = [];
            if (writeConfig(config)) {
                await sock.sendMessage(chatId, { 
                    text: `✅ *EXCLUDE LIST CLEARED*\n\n━━━━━━━━━━━━━━━━━━━━\n📌 All numbers removed.\n🌍 Will view all statuses.`
                }, { quoted: message });
            }
        }
        else {
            await sock.sendMessage(chatId, { 
                text: `⚠️ *INVALID COMMAND*\n\n━━━━━━━━━━━━━━━━━━━━\n📖 Use .autostatus to see all options.`
            }, { quoted: message });
        }
    } catch (e) {
        console.error('❌ Command error:', e.message);
    }
}

module.exports = {
    handleStatusUpdate,
    handleBulkStatusUpdate,
    autoStatusCommand,
    isAutoStatusEnabled,
    isStatusLikeEnabled,
    readConfig,
    writeConfig
};
