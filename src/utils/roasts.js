const roasts = [
  "🛑 **Stop!** Wash rak diri hna? Had l'commande kbira 3lik ya l'3awd. Lazemlek **Niveau 5** bach tsta3melha. Roh tl3ab b3id! 😂",
  "🐸 **Rak tiri bark!** Wesh hsabtek Admin? Riyeh larde khoya, hadchi machi lik.",
  "⛔ **Access Denied!** Rak jayez bla visa? Hada territoire ta3 les Masters bark.",
  "🚧 **Ahbsss!** Win 3labalik rayeh? Hada niveau 5, wnta rak tbanli niveau sous-sol.",
  "🍼 **Mazalek sghir** 3la had l'commande. Kber chwya w rwa7, hada chghol kbar.",
  "🔒 **Makach Dakhla!** Ya kho, mata forcech. Ma 3andekch les clés ta3 dar.",
  "🤡 **Rak tmencher?** Hada command ta3 rjal, riyeh 3aghel khir lek.",
  "🕵️ **Security Alert!** Chkoun ntaya? Ma3refnekch. Ma3andekch droit d'accès hna.",
  "📉 **Error 403:** Permission introuvable... kima niveau dialek fl bot.",
  "💨 **Ouste!** Roh chouf kach haja wahdokhra dirha, hadchi wa3er 3lik bezaf.",
  "🤐 **S-s-s-stop!** Yadek rahi taklek? Hada bouton nucleaire, machi jouet.",
  "🧠 **System Overload:** Le cerveau ta3ek sghir machi capable ycomprendi had l'commande.",
  "🚫 **Machi lik!** Had l'korsi ta3 moulah, w nta machi moulah. Nodh tga3ad.",
  "🔨 **Banhammer Loading...** Ghir nel3ab, mais serio ma tzidch t3awadha la nfachlouk.",
  "👀 **Rak tban lost.** Wash jabek l hna? Hada coin ta3 les VIP, machi ta3 touriste.",
  "🔥 **Skhoun 3lik!** Ya weldi hada nar, w nta rak chema3. Ahreb!",
  "🐢 **Rak tharrech.** Rak b3id bezaf 3la niveau li nhebbuh. Zid 3oum.",
  "🛑 **Stopina!** Salou 3la nbi, had l'commande makach menha lik. Roh taqra.",
  "🤏 **Rak hna...** w niveau 5 rah lhih. Ma yetlakawkch ga3.",
  "🤖 **Beep Boop.** Permission not found. Roh tebki 3and Admin y3tik grade."
];

const compliments = [
  "👑 **Sidna!** Samhili ya Sultan, had l'commande rahi fatat niveau ta3ek. Nta foug ga3 hadchi.",
  "🦁 **Ya L'Lion!** Ma 3andekch l'permission, mais 3andek qalbna. Nta moul dar.",
  "✨ **Your Majesty!** Technicality sghira baratlek triq, mais nta dima King.",
  "💎 **Diamant Pure!** L'code bghra yhabsek, mais l'hiba ta3ek tpassi partout.",
  "⚔️ **General!** Had l'outils machi digne lik. Nta commandi w hna nnafdou.",
  "🎩 **Monsieur le Président!** L'system rah dayer erreur, nta normaal tnod tdir wach t'hab.",
  "🚀 **Nadi!** Nta niveau ta3ek harreb bezaf, had l'commande sghira 3lik.",
  "🌟 **Shining Star!** Sorry Boss, l'bot rah ykhallat. Nta tstahal koulch.",
  "🌹 **Ya Zine!** Ma tqaLaqch rouhek, hadchi ghir code. Nta l'asl.",
  "🙇 **We are not worthy!** Semhili ya sid rjal, ma qditch nexecuti l'ordre."
];

const vipIds = ['696331073562607676', '541763571357319168', '1082257882935984128'];

function getDenialMessage(userId) {
  if (vipIds.includes(userId)) {
    const randomIndex = Math.floor(Math.random() * compliments.length);
    return compliments[randomIndex];
  }
  const randomIndex = Math.floor(Math.random() * roasts.length);
  return roasts[randomIndex];
}

module.exports = {
  getDenialMessage,
  roasts,
  compliments
};
