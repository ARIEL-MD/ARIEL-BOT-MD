// ============ TEXTE VERS AUDIO (.tovoice) ============
// .tovoice <texte>              -> note vocale en français
// .tovoice <code langue> <texte> -> ex : .tovoice en Hello everyone
//
// Utilise le même service que .translate (translate.google.com) : pas de
// clé API à configurer. Le texte est découpé en morceaux de ~200
// caractères (limite de l'endpoint TTS non-officiel), chaque morceau est
// synthétisé séparément puis les MP3 obtenus sont simplement concaténés.

const axios = require("axios");

const TTS_ENDPOINT = "https://translate.google.com/translate_tts";
const MAX_CHUNK = 200;
const MAX_TEXT_LENGTH = 2000;

// Découpe le texte en morceaux de taille max sans couper un mot en deux.
function splitText(text, maxLen = MAX_CHUNK) {
  const words = text.split(/\s+/);
  const chunks = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLen) {
      if (current) chunks.push(current);
      // Mot lui-même plus long que la limite (rare) : on le coupe brut
      // plutôt que de boucler indéfiniment.
      current = word.length > maxLen ? word.slice(0, maxLen) : word;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function fetchTtsChunk(text, lang) {
  const { data } = await axios.get(TTS_ENDPOINT, {
    params: { ie: "UTF-8", client: "tw-ob", q: text, tl: lang },
    responseType: "arraybuffer",
    timeout: 15000,
    headers: { "user-agent": "Mozilla/5.0" },
  });
  return Buffer.from(data);
}

async function textToSpeech(text, lang) {
  const chunks = splitText(text);
  const buffers = [];
  for (const chunk of chunks) {
    buffers.push(await fetchTtsChunk(chunk, lang));
  }
  return Buffer.concat(buffers);
}

const commands = [
  {
    name: "tovoice",
    desc: "Convertit un texte en note vocale : .tovoice [code langue] <texte>\nEx : .tovoice Bonjour tout le monde\nEx : .tovoice en Hello everyone",
    category: "Utilitaires",
    run: async (sock, msg, { from, args }) => {
      if (!args.length) {
        return sock.sendMessage(from, {
          text:
            "Utilisation : .tovoice [code langue] <texte>\n" +
            "Ex : .tovoice Bonjour tout le monde\n" +
            "Ex : .tovoice en Hello everyone",
        });
      }

      // Si le premier mot ressemble à un code langue court (fr, en, es...)
      // ET qu'il reste du texte après, on l'utilise comme langue cible.
      // Sinon, tout le message est le texte, en français par défaut.
      let lang = "fr";
      let words = args;
      if (/^[a-z]{2,3}(-[a-z]{2})?$/i.test(args[0]) && args.length > 1) {
        lang = args[0].toLowerCase();
        words = args.slice(1);
      }

      const text = words.join(" ").trim();
      if (!text) {
        return sock.sendMessage(from, { text: "❌ Merci de préciser un texte à convertir." });
      }
      if (text.length > MAX_TEXT_LENGTH) {
        return sock.sendMessage(from, {
          text: `❌ Texte trop long (max ${MAX_TEXT_LENGTH} caractères).`,
        });
      }

      try {
        const audio = await textToSpeech(text, lang);
        await sock.sendMessage(from, { audio, mimetype: "audio/mpeg", ptt: true });
      } catch (err) {
        console.error("Erreur .tovoice :", err.message);
        await sock.sendMessage(from, {
          text: "❌ Impossible de générer l'audio. Vérifie le code langue (ex : fr, en, es) et réessaie.",
        });
      }
    },
  },
];

module.exports = commands;
