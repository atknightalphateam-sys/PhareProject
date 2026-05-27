const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
     executablePath: '/root/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome',
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

const attente = {};

client.on("qr", (qr) => {
  console.log("\n📱 Scanne ce QR code avec WhatsApp :\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("\n✅ Phare est connecté à WhatsApp !");
});

client.on("message", async (msg) => {
  const from = msg.from;
  const estGroupe = from.endsWith("@g.us");
  let texte = msg.body.trim();

  if (!texte) return;

  // Dans un groupe, répondre seulement si le message contient @Phare ou mentionne le bot
  if (estGroupe) {
    const botNumber = client.info.wid.user;
    const mentionne =
      msg.mentionedIds?.some((id) => id.user === botNumber) ||
      texte.toLowerCase().includes("@phare") ||
      texte.includes(`@${botNumber}`);

    if (!mentionne) return;

    // Nettoyer la mention du texte
    texte = texte.replace(/@\S+/g, "").trim();
    if (!texte) {
      await msg.reply("👋 Bonjour ! Dis-moi quel document tu cherches.");
      return;
    }
  }

  console.log(`Message reçu de ${from}: ${texte}`);

  // Si l'utilisateur attend et tape un numéro
  if (attente[from]) {
    const docs = attente[from];
    const choix = parseInt(texte);

    if (!isNaN(choix) && choix >= 1 && choix <= docs.length) {
      const doc = docs[choix - 1];
      delete attente[from];

      await msg.reply(`📄 Envoi de *${doc.nom}* en cours...`);

      try {
        const media = await MessageMedia.fromUrl(doc.url, { unsafeMime: true });
        await client.sendMessage(from, media, {
          sendMediaAsDocument: true,
          caption: `📄 ${doc.nom}`,
        });
      } catch (e) {
        console.log("Erreur envoi fichier:", e.message);
        await msg.reply("Désolé, je n'ai pas pu envoyer le fichier. Réessaie.");
      }
      return;
    }
  }

  // Faire une recherche
  const resultat = await demanderAPhare(texte);

  if (resultat.docs && resultat.docs.length > 0) {
    const docs = resultat.docs;
    attente[from] = docs;

    // Si un seul document trouvé, l'envoyer directement
    if (docs.length === 1) {
      await msg.reply(
        `📄 J'ai trouvé : *${docs[0].nom}*\n_${docs[0].description}_\n\nEnvoi en cours...`,
      );
      try {
        const media = await MessageMedia.fromUrl(docs[0].url, {
          unsafeMime: true,
        });
        await client.sendMessage(from, media, {
          sendMediaAsDocument: true,
          caption: `📄 ${docs[0].nom}`,
        });
        delete attente[from];
      } catch (e) {
        console.log("Erreur:", e.message);
        await msg.reply("Désolé, je n'ai pas pu envoyer le fichier.");
      }
      return;
    }

    // Plusieurs documents trouvés
    let reponse = `📚 J'ai trouvé *${docs.length} documents* :\n\n`;
    docs.forEach((doc, i) => {
      reponse += `*${i + 1}.* ${doc.nom}\n_${doc.description}_\n\n`;
    });
    reponse += `Tape le numéro du document que tu veux (1 à ${docs.length}).`;

    await msg.reply(reponse);
  } else {
    await msg.reply(
      resultat.message ||
        "Je n'ai rien trouvé. Essaie avec d'autres mots-clés.",
    );
  }
});

async function demanderAPhare(demande) {
  try {
    const res = await fetch("https://phareproject.onrender.com/chercher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demande }),
    });
    return await res.json();
  } catch (e) {
    return { message: "Désolé, problème technique. Réessaie." };
  }
}
process.on('unhandledRejection', (err) => {
  console.error('Erreur non gérée:', err.message);
});

client.initialize();
