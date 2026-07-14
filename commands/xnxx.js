// ============ TÉLÉCHARGEMENT VIDÉO VIA API EXTERNE ============
// .xnxx <lien>   (change le nom ci-dessous si tu veux un autre alias)
//
// ⚠️ À PERSONNALISER : cherche les commentaires "TODO" ci-dessous et
// remplace par les infos de TON API (URL, clé, nom des champs JSON).
// ================================================================
const axios = require("axios");

// TODO 1 : mets ici l'URL de base de ton API.
// Exemple : "https://mon-api.com/download?url="
const API_BASE = "http://api-sky.ultraplus.click/xnxx";

// TODO 2 (optionnel) : si ton API demande une clé, mets-la ici,
// sinon laisse vide "" et supprime son usage plus bas.
const API_KEY = "sk_c801a619-7d24-4abc-9876-39b58436d88d"; // ex: "sk_xxx..."

const commands = [
  {
    name: "xnxx", // TODO 3 : change le nom de la commande si tu veux (.dl, .save, etc.)
    desc: "Télécharge une vidéo depuis un lien : .xnxx <lien>",
    category: "Téléchargements",
    run: async (sock, msg, { from, args }) => {
      const link = args.join(" ").trim();

      if (!link) {
        return sock.sendMessage(from, {
          text: "Utilisation : .xnxx <lien>\nExemple : .xnxx https://exemple.com/post/123",
        });
      }

      // Petite vérification que c'est bien un lien
      if (!/^https?:\/\//i.test(link)) {
        return sock.sendMessage(from, {
          text: "❌ Merci d'envoyer un lien valide (commençant par http:// ou https://).",
        });
      }

      try {
        await sock.sendMessage(from, { text: "⏳ Téléchargement en cours..." });

        // ----- Étape 1 : appel à l'API -----
        // TODO 4 : adapte l'URL complète selon la doc de ton API.
        // Certaines API veulent le lien encodé, d'autres en paramètre POST, etc.
        const apiUrl = `${API_BASE}${encodeURIComponent(link)}`;

        const { data } = await axios.get(apiUrl, {
          timeout: 20000,
          // Décommente si ton API demande une clé dans les headers :
          // headers: { Authorization: `Bearer ${API_KEY}` },
          // Ou si elle veut la clé en paramètre :
          // params: { apikey: API_KEY },
        });

        // ----- Étape 2 : extraire l'URL de la vidéo dans le JSON -----
        // TODO 5 : IMPORTANT — adapte ce chemin selon la vraie structure
        // du JSON renvoyé par ton API. Regarde la réponse réelle (fais un
        // test avec curl ou Postman) et ajuste la ligne ci-dessous.
        //
        // Exemples selon le format de réponse :
        //   { "url": "https://..." }              -> data.url
        //   { "result": { "video": "https://..." } } -> data.result.video
        //   { "data": [{ "url": "https://..." }] }   -> data.data[0].url
        const videoUrl = data.result.media.video; // <-- CHANGE CETTE LIGNE selon ton JSON

        if (!videoUrl) {
          console.error("Réponse API inattendue :", JSON.stringify(data).slice(0, 500));
          return sock.sendMessage(from, {
            text: "❌ L'API n'a pas renvoyé de lien vidéo (vérifie le format du JSON dans le code).",
          });
        }

        // ----- Étape 3 : télécharger le fichier vidéo lui-même -----
        const { data: videoBuffer } = await axios.get(videoUrl, {
          responseType: "arraybuffer",
          timeout: 60000, // les vidéos peuvent être lourdes, on laisse plus de temps
        });

        // ----- Étape 4 : envoyer la vidéo sur WhatsApp -----
        await sock.sendMessage(from, {
          video: Buffer.from(videoBuffer),
          caption: "✅ Voici ta vidéo !",
        });
      } catch (err) {
        console.error("Erreur .video :", err.message);
        await sock.sendMessage(from, {
          text: "❌ Impossible de télécharger cette vidéo (lien invalide, API indisponible, ou fichier trop lourd).",
        });
      }
    },
  },
];

module.exports = commands;
