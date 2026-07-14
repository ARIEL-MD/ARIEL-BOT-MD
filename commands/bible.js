// ============ BIBLE (verset par référence, Louis Segond 1910) ============
// .bible <référence>  (alias : .verset, .lsg)
// Exemples :
//   .bible Jean 3:16
//   .bible Genèse 1:1-3
//   .bible 1 Corinthiens 13:4-7
const axios = require("axios");

const API_BASE = "https://query.getbible.net/v2/ls1910/";

const commands = [
  {
    name: "bible",
    desc: "Affiche un verset (Louis Segond) : .bible <référence>\nEx : .bible Jean 3:16",
    category: "Autre",
    run: async (sock, msg, { from, args }) => {
      const reference = args.join(" ").trim();

      if (!reference) {
        return sock.sendMessage(from, {
          text:
            "Utilisation : .bible <référence>\n" +
            "Exemples :\n" +
            "• .bible Jean 3:16\n" +
            "• .bible Genèse 1:1-3\n" +
            "• .bible 1 Corinthiens 13:4-7",
        });
      }

      try {
        const url = `${API_BASE}${encodeURIComponent(reference)}`;
        const { data } = await axios.get(url, { timeout: 15000 });

        const groups = data && data.result ? Object.values(data.result) : [];

        if (!groups.length) {
          return sock.sendMessage(from, {
            text: `❌ Aucun verset trouvé pour : ${reference}`,
          });
        }

        let message = "";

        for (const group of groups) {
          const verses = group.verses || [];
          if (!verses.length) continue;

          message += `📖 *${group.book_name} ${group.chapter}* (Louis Segond)\n\n`;
          for (const v of verses) {
            message += `*${v.verse}.* ${v.text.trim()}\n`;
          }
          message += "\n";
        }

        if (!message.trim()) {
          return sock.sendMessage(from, {
            text: `❌ Aucun verset trouvé pour : ${reference}`,
          });
        }

        await sock.sendMessage(from, { text: message.trim() });
      } catch (err) {
        console.error("Erreur .bible :", err.message);
        await sock.sendMessage(from, {
          text: "❌ Impossible de récupérer ce verset. Vérifie la référence (ex : Jean 3:16).",
        });
      }
    },
  },
];

// Alias .verset et .lsg -> même commande que .bible
commands.push({ ...commands[0], name: "verset" });
commands.push({ ...commands[0], name: "lsg" });

module.exports = commands;
