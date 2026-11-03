// Animation de défaite du démineur : une petite magicienne en pixel art arrive
// en marchant, crie son sort dans une bulle, fait tout exploser et repart en
// dansant. Tout est dessiné ici, sans image externe.
// Rien n'est joué si le visiteur a demandé moins d'animations.
window.AnimationDefaite = (function () {
  var PALETTE = { h: "#2b2140", b: "#d9a441", p: "#4a2f23", s: "#f2c9a0", e: "#2a1a14",
                  r: "#7a4fb5", d: "#53347f", w: "#3a2a1e", t: "#8a5a2b", g: "#ff5a3c" };

  var TETE = [
    "......hh........",
    ".....hhhh.......",
    ".....hhhh.......",
    "....hhhhhh......",
    "....hhhhhh......",
    "..bbbbbbbbbb....",
    ".hhhhhhhhhhhh...",
    "...pssssssp.....",
    "...pseSSesp.....",
    "...pssssssp.....",
    "....pssssp......"
  ].map(function (l) { return l.replace(/S/g, "s"); });

  var CORPS = [
    "...rrrrrrr......",
    "..rrrrrrrrr.....",
    "..srrrrrrrs.....",
    "...ddrrrdd......",
    "...dddddd.......",
    "...dddddd......."
  ];

  var JAMBES = {
    a: ["....ww..ww......", "....ww..ww......"],
    b: ["...ww....ww.....", "...ww....ww....."],
    c: ["....ww...ww.....", "....ww....ww...."],
    d: ["...ww...ww......", "..ww....ww......"]
  };

  // Le bâton est peint par-dessus : [colonne, de la ligne, à la ligne].
  var IMAGES = {
    marche1: { jambes: "a", baton: [13, 3, 18] },
    marche2: { jambes: "b", baton: [13, 3, 18] },
    sort: { jambes: "a", baton: [14, 0, 14], bras: { ligne: 11, de: 10, a: 13 } },
    danse1: { jambes: "c", baton: [14, 0, 14], bras: { ligne: 10, de: 10, a: 13 } },
    danse2: { jambes: "d", baton: [1, 0, 14], bras: { ligne: 10, de: 2, a: 3 } }
  };

  var cache = {};
  var dessiner = function (nom) {
    if (cache[nom]) return cache[nom];
    var def = IMAGES[nom];
    var lignes = TETE.concat(CORPS, JAMBES[def.jambes]);
    var toile = document.createElement("canvas");
    toile.width = 16;
    toile.height = lignes.length;
    var c = toile.getContext("2d");
    var point = function (x, y, cle) {
      c.fillStyle = PALETTE[cle];
      c.fillRect(x, y, 1, 1);
    };
    lignes.forEach(function (l, y) {
      l.split("").forEach(function (cle, x) { if (PALETTE[cle]) point(x, y, cle); });
    });
    for (var y = def.baton[1]; y <= def.baton[2]; y++) point(def.baton[0], y, "t");
    point(def.baton[0], def.baton[1], "g");
    if (def.bras) {
      for (var x = def.bras.de; x <= def.bras.a; x++) point(x, def.bras.ligne, "s");
    }
    return (cache[nom] = toile.toDataURL());
  };

  var scene = null, minuteurs = [], rythme = null;

  var arreter = function () {
    minuteurs.forEach(clearTimeout);
    minuteurs = [];
    if (rythme !== null) { clearInterval(rythme); rythme = null; }
    if (scene) { scene.remove(); scene = null; }
  };

  var eclats = function (largeur, hauteur, centre) {
    var couleurs = ["#ffd166", "#ff8c42", "#ff5a3c", "#fff3c4"];
    for (var i = 0; i < 44; i++) {
      var e = document.createElement("span");
      e.className = "dem-eclat";
      e.style.left = centre.x + "px";
      e.style.top = centre.y + "px";
      e.style.background = couleurs[i % couleurs.length];
      scene.appendChild(e);
      var angle = Math.random() * Math.PI * 2;
      var portee = 50 + Math.random() * Math.min(largeur, hauteur) * 0.6;
      var a = e.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: "translate(" + Math.cos(angle) * portee + "px," + Math.sin(angle) * portee + "px) scale(0.4)", opacity: 0 }
      ], { duration: 650 + Math.random() * 500, easing: "steps(9)", fill: "forwards" });
      a.onfinish = e.remove.bind(e);
    }
  };

  var jouer = function (cadre, cri) {
    arreter();
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!cadre.animate) return;

    scene = document.createElement("div");
    scene.className = "dem-scene";
    scene.setAttribute("aria-hidden", "true");
    var perso = document.createElement("img");
    perso.className = "dem-perso-pixel";
    perso.alt = "";
    var bulle = document.createElement("div");
    bulle.className = "dem-bulle";
    bulle.textContent = cri;
    bulle.hidden = true;
    scene.appendChild(perso);
    scene.appendChild(bulle);

    // La scène couvre la partie visible du terrain : une grande grille dépasse
    // souvent de l'écran, et la magicienne doit rester à portée de vue.
    var r = cadre.getBoundingClientRect();
    var gauche = Math.max(r.left, 0), droite = Math.min(r.right, window.innerWidth);
    var haut = Math.max(r.top, 0), bas = Math.min(r.bottom, window.innerHeight);
    if (bas - haut < 120) { haut = 0; bas = window.innerHeight; }
    var largeur = droite - gauche, hauteur = bas - haut;
    scene.style.left = gauche + "px";
    scene.style.top = haut + "px";
    scene.style.width = largeur + "px";
    scene.style.height = hauteur + "px";
    cadre.appendChild(scene);

    var arrivee = Math.max(10, Math.round(largeur * 0.16));
    var centre = { x: largeur / 2, y: hauteur / 2 };

    var alterner = function (a, b, delai) {
      if (rythme !== null) clearInterval(rythme);
      var n = 0;
      perso.src = dessiner(a);
      rythme = setInterval(function () { perso.src = dessiner(n++ % 2 ? a : b); }, delai);
    };
    var plus = function (ms, f) { minuteurs.push(setTimeout(f, ms)); };

    // Elle arrive en marchant.
    alterner("marche1", "marche2", 170);
    perso.animate([{ left: "-70px" }, { left: arrivee + "px" }],
                  { duration: 1600, easing: "linear", fill: "forwards" });

    // Elle lève son bâton et crie.
    plus(1600, function () {
      clearInterval(rythme);
      rythme = null;
      perso.src = dessiner("sort");
      bulle.style.left = arrivee + 54 + "px";
      bulle.hidden = false;
    });

    // Tout explose.
    plus(3000, function () {
      bulle.hidden = true;
      var boule = document.createElement("div");
      boule.className = "dem-boule";
      boule.style.left = centre.x + "px";
      boule.style.top = centre.y + "px";
      scene.appendChild(boule);
      var taille = Math.max(largeur, hauteur) * 1.1;
      var b = boule.animate([
        { width: "10px", height: "10px", opacity: 1 },
        { width: taille * 0.8 + "px", height: taille * 0.8 + "px", opacity: 1, offset: 0.45 },
        { width: taille + "px", height: taille + "px", opacity: 0 }
      ], { duration: 950, easing: "steps(10)", fill: "forwards" });
      b.onfinish = boule.remove.bind(boule);
      eclats(largeur, hauteur, centre);
      cadre.querySelector(".dem-zone").animate([
        { transform: "translate(0, 0)" }, { transform: "translate(-7px, 4px)" },
        { transform: "translate(6px, -5px)" }, { transform: "translate(-5px, -3px)" },
        { transform: "translate(5px, 4px)" }, { transform: "translate(0, 0)" }
      ], { duration: 520, iterations: 2 });
    });

    // Satisfaite, elle danse puis repart en dansant.
    plus(4100, function () { alterner("danse1", "danse2", 260); });
    plus(5300, function () {
      perso.animate([{ left: arrivee + "px" }, { left: largeur + 70 + "px" }],
                    { duration: 3000, easing: "linear", fill: "forwards" });
    });
    plus(8400, arreter);
  };

  return { jouer: jouer, arreter: arreter };
})();
