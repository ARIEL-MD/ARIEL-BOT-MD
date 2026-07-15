// ============ LOGO (effets de texte 3D via textpro.me) ============
// Une commande par style : .deepsea, .horror, .pink, .candy, .christmas,
// .luxury, .sky, .steel, .glue, .fabric, .transformer, .toxic, .ancient,
// .thunder, .graphy, .neon, .frozen
//
// Bot ARIEL-MD
const mumaker = require("mumaker");

const LOGO_STYLES = {
  deepsea: "https://textpro.me/create-3d-deep-sea-metal-text-effect-online-1053.html",
  horror: "https://textpro.me/horror-blood-text-effect-online-883.html",
  pink: "https://textpro.me/create-blackpink-logo-style-online-1001.html",
  candy: "https://textpro.me/create-christmas-candy-cane-text-effect-1056.html",
  christmas: "https://textpro.me/christmas-tree-text-effect-online-free-1057.html",
  luxury: "https://textpro.me/3d-luxury-gold-text-effect-online-1003.html",
  sky: "https://textpro.me/create-a-cloud-text-effect-on-the-sky-online-1004.html",
  steel: "https://textpro.me/steel-text-effect-online-921.html",
  glue: "https://textpro.me/create-3d-glue-text-effect-with-realistic-style-986.html",
  fabric: "https://textpro.me/fabric-text-effect-online-964.html",
  transformer: "https://textpro.me/create-a-transformer-text-effect-online-1035.html",
  toxic: "https://textpro.me/toxic-text-effect-online-901.html",
  ancient: "https://textpro.me/3d-golden-ancient-text-effect-online-free-1060.html",
  thunder: "https://textpro.me/online-thunder-text-effect-generator-1031.html",
  graphy: "https://textpro.me/3d-rainbow-color-calligraphy-text-effect-1049.html",
  neon: "https://textpro.me/create-3d-neon-light-text-effect-online-1028.html",
  frozen: "https://textpro.me/create-realistic-3d-text-effect-frozen-winter-1099.html",
};

// Une commande générée par style, toutes basées sur la même logique.
const commands = Object.keys(LOGO_STYLES).map((style) => ({
  name: style,
  desc: `Génère un logo/texte stylisé "${style}" : .${style} <texte>`,
  category: "Images & Stickers",
  run: async (sock, msg, { from, args }) => {
    const text = args.join(" ").trim();

    if (!text) {
      return sock.sendMessage(from, {
        text: `Utilisation : .${style} <texte>\nEx : .${style} Ariel`,
      });
    }

    try {
      await sock.sendMessage(from, { text: `✨ Génération du logo "${style}" en cours...` });
      const result = await mumaker.textpro(LOGO_STYLES[style], text);
      if (!result || !result.image) throw new Error("Pas d'image reçue");
      await sock.sendMessage(from, { image: { url: result.image }, caption: `✨ ${text}` });
    } catch (err) {
      console.error(`Erreur .${style} :`, err.message);
      await sock.sendMessage(from, {
        text: "❌ Impossible de générer ce logo. Réessaie plus tard.",
      });
    }
  },
}));

module.exports = commands;

/**
 * ARIEL-MD
 */
