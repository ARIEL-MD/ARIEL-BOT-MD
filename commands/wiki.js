// ============ RÉSUMÉ WIKIPÉDIA (.wiki) ============
// .wiki <sujet>  -> résumé de l'article Wikipédia (français) correspondant
// Ex : .wiki Côte d'Ivoire
//      .wiki Albert Einstein

const axios = require("axios");

const WIKI_LANG = "fr";
const REQUEST_HEADERS = { "user-agent": "Mozilla/5.0" };

async function fetchSummary(title, lang) {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const { data } = await axios.get(url, { timeout: 15000, headers: REQUEST_HEADERS });
  return data;
}

// Utilise la recherche Wikipédia (opensearch) pour retrouver le titre exact
// de l'article quand la requête ne correspond pas telle quelle (fautes de
// frappe, formulation différente, etc.).
async function searchTitle(query, lang) {
  const url = `https://${lang}.wikipedia.org/w/api.php`;
  const { data } = await axios.get(url, {
    params: { action: "opensearch", search: query, limit: 1, namespace: 0, format: "json" },
    timeout: 15000,
    headers: REQUEST_HEADERS,
  });
  return data?.[1]?.[0] || null;
}

const commands = [
  {
    name: "wiki",
    desc: "Résumé Wikipédia d'un sujet : .wiki <sujet>\nEx : .wiki Côte d'Ivoire",
    category: "Infos & Recherche",
    run: async (sock, msg, { from, args }) => {
      const query = args.join(" ").trim();
      if (!query) {
        return sock.sendMessage(from, {
          text: "Utilisation : .wiki <sujet>\nEx : .wiki Côte d'Ivoire",
        });
      }

      try {
        let data = await fetchSummary(query, WIKI_LANG).catch(() => null);

        // Page introuvable telle quelle, ou page de désambiguïsation sans
        // résumé exploitable : on retente avec le titre suggéré par la
        // recherche Wikipédia elle-même.
        if (!data || data.type === "disambiguation" || !data.extract) {
          const suggested = await searchTitle(query, WIKI_LANG).catch(() => null);
          if (suggested && suggested.toLowerCase() !== query.toLowerCase()) {
            data = await fetchSummary(suggested, WIKI_LANG).catch(() => null);
          }
        }

        if (!data || !data.extract) {
          return sock.sendMessage(from, {
            text: `❌ Aucun article Wikipédia trouvé pour : ${query}`,
          });
        }

        const title = data.title || query;
        const extract = data.extract.trim();
        const pageUrl =
          data.content_urls?.desktop?.page ||
          `https://${WIKI_LANG}.wikipedia.org/wiki/${encodeURIComponent(title)}`;
        const thumbnail = data.thumbnail?.source;

        const caption = `📚 *${title}*\n\n${extract}\n\n🔗 ${pageUrl}`;

        if (thumbnail) {
          await sock.sendMessage(from, { image: { url: thumbnail }, caption });
        } else {
          await sock.sendMessage(from, { text: caption });
        }
      } catch (err) {
        console.error("Erreur .wiki :", err.message);
        await sock.sendMessage(from, {
          text: "❌ Impossible de récupérer cet article Wikipédia. Réessaie plus tard.",
        });
      }
    },
  },
];

module.exports = commands;
