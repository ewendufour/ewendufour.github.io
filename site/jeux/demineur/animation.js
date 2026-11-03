// Animation de défaite du démineur : une petite magicienne en pixel art jaillit
// de la case piégée, atterrit, crie son sort dans une bulle, fait tout exploser
// et repart en dansant. Un bouton Rejouer apparaît au milieu après l'explosion.
// Tout est dessiné ici, sans image externe. Si le visiteur a demandé moins
// d'animations, seul le bouton s'affiche.
window.AnimationDefaite = (function () {
  var PALETTE = {
    K: "#241a33",   // contour
    H: "#2f3a8f", j: "#222a6b", Y: "#ffd866", b: "#e0a93f",   // chapeau, ombre, étoile, ruban
    c: "#f0b8dc", n: "#c98abb",   // cheveux, ombre
    s: "#ffe2cc", o: "#f7a8a0",   // peau, joues
    e: "#3a2a5a", w: "#ffffff", m: "#c96a7a",   // yeux, blanc, bouche
    t: "#46b5d1", u: "#2c84a8",   // robe, ombre
    g: "#ff6fa8", x: "#7a5238",   // broche et gemme, bottes
    a: "#b98a4e"    // bâton
  };

  var CORPS = [
    "..........KK........",
    ".........KjjK.......",
    "........KHHHjK......",
    "........KHYHjK......",
    ".......KHYYYHjK.....",
    ".......KHHYHHjK.....",
    "......KHHHHHHjjK....",
    "...KKKKbbbbbbbbKKKK.",
    "..KHHHHHHHHHHHHHHjK.",
    "....KccccccccccK....",
    "...KccssccsscscK....",
    "...KcsssssssssnK....",
    "...KcseessseesnK....",
    "...KcsewsssewsnK....",
    "...KcoossmssoonK....",
    "....KcsssssssnK.....",
    "...KcKwwwwwwwKnK....",
    "...KcKtttgtuuKnK....",
    "..KttKtttttuuKtuK...",
    "..KssKtttttuuKssK...",
    "...KKKttttttuKKK....",
    "....KtttttttuuK.....",
    "....KwwwwwwwwwK.....",
    "....KKKKKKKKKKK....."
  ];

  var JAMBES = {
    a: [".....KxxK..KxxK.....", ".....KxxK..KxxK.....", ".....KxxxK.KxxxK....", ".....KKKKK.KKKKK...."],
    b: ["....KxxK....KxxK....", "...KxxK......KxxK...", "...KxxxK.....KxxxK..", "...KKKKK.....KKKKK.."],
    c: [".....KxxK..KxxK.....", "......KKK..KKK......", "....................", "...................."],
    d: ["....KxxK...KxxK.....", "....KxxK....KxxK....", "....KxxxK...KxxxK...", "....KKKKK...KKKKK..."]
  };

  // Le bâton : [colonne, de la ligne, à la ligne]. Les bras levés remplacent ceux
  // du dessin de base : `gauche` et `droite` indiquent celui qui se lève.
  var IMAGES = {
    marche1: { jambes: "a", baton: [17, 12, 26] },
    marche2: { jambes: "b", baton: [17, 12, 26] },
    saut: { jambes: "c", gauche: true, droite: true },
    sort: { jambes: "a", droite: true, baton: [18, 3, 20] },
    danse1: { jambes: "a", droite: true, baton: [18, 3, 20] },
    danse2: { jambes: "d", gauche: true, baton: [1, 3, 20] }
  };

  var cache = {};
  var dessiner = function (nom) {
    if (cache[nom]) return cache[nom];
    var def = IMAGES[nom];
    var lignes = CORPS.concat(JAMBES[def.jambes]);
    var toile = document.createElement("canvas");
    toile.width = 20;
    toile.height = lignes.length;
    var c = toile.getContext("2d");
    var point = function (x, y, cle) {
      c.fillStyle = PALETTE[cle];
      c.fillRect(x, y, 1, 1);
    };
    lignes.forEach(function (l, y) {
      l.split("").forEach(function (cle, x) { if (PALETTE[cle]) point(x, y, cle); });
    });
    var leverBras = function (cotes) {
      // Efface le bras le long du corps, puis le redessine vers le haut.
      cotes.forEach(function (cote) {
        var d = cote === "droite";
        c.clearRect(d ? 14 : 2, 18, 3, 2);
        point(d ? 13 : 5, 18, "K");
        point(d ? 13 : 5, 19, "K");
        [[0, 17], [0, 16], [1, 15], [1, 14]].forEach(function (p) {
          var x = d ? 15 + p[0] : 4 - p[0];
          point(x, p[1], p[1] === 14 ? "s" : "t");
          point(d ? x + 1 : x - 1, p[1], "K");
        });
        point(d ? 16 : 3, 13, "K");
      });
    };
    var bras = [];
    if (def.gauche) bras.push("gauche");
    if (def.droite) bras.push("droite");
    leverBras(bras);
    if (def.baton) {
      var col = def.baton[0];
      for (var y = def.baton[1]; y <= def.baton[2]; y++) point(col, y, "a");
      var haut = def.baton[1];
      [[0, -2], [-1, -1], [0, -1], [1, -1], [0, 0]].forEach(function (p) {
        point(col + p[0], haut + p[1], "g");
      });
      point(col, haut - 1, "w");
    }
    return (cache[nom] = toile.toDataURL());
  };

  var scene = null, bouton = null, minuteurs = [], rythme = null;

  var arreter = function () {
    minuteurs.forEach(clearTimeout);
    minuteurs = [];
    if (rythme !== null) { clearInterval(rythme); rythme = null; }
    if (scene) { scene.remove(); scene = null; }
    if (bouton) { bouton.remove(); bouton = null; }
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
      var angle = -Math.random() * Math.PI;   // vers le haut uniquement
      var portee = 50 + Math.random() * Math.max(largeur * 0.5, hauteur * 0.8);
      var a = e.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: "translate(" + Math.cos(angle) * portee + "px," + Math.sin(angle) * portee + "px) scale(0.4)", opacity: 0 }
      ], { duration: 650 + Math.random() * 500, easing: "steps(9)", fill: "forwards" });
      a.onfinish = e.remove.bind(e);
    }
  };

  // options : cri, rejouer (texte du bouton), surRejouer, caseEl (la case piégée).
  var jouer = function (cadre, options) {
    arreter();
    scene = document.createElement("div");
    scene.className = "dem-scene";
    scene.setAttribute("aria-hidden", "true");

    // La scène couvre toute la boîte de jeu et défile avec elle : la magicienne
    // se tient sur le bord bas de la boîte.
    var r = cadre.getBoundingClientRect();
    var gauche = r.left, dessus = r.top, largeur = r.width, hauteur = r.height;
    cadre.appendChild(scene);

    // L'explosion part du sol de la boîte, au milieu, et monte en dôme.
    var centre = { x: largeur / 2, y: hauteur };
    var montrerBouton = function () {
      // Dans le cadre et non dans la scène : centré sur la boîte de jeu entière.
      bouton = document.createElement("button");
      bouton.type = "button";
      bouton.className = "bouton bouton-plein dem-rejouer";
      bouton.textContent = options.rejouer;
      bouton.addEventListener("click", options.surRejouer);
      cadre.appendChild(bouton);
      bouton.focus({ preventScroll: true });
    };

    var moinsAnime = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (moinsAnime || !cadre.animate) {
      montrerBouton();
      return;
    }

    var L = 60, H = 84;   // taille affichée : trois fois le dessin
    var perso = document.createElement("img");
    perso.className = "dem-perso-pixel";
    perso.alt = "";
    var bulle = document.createElement("div");
    bulle.className = "dem-bulle";
    bulle.textContent = options.cri;
    bulle.hidden = true;
    scene.appendChild(perso);
    scene.appendChild(bulle);

    // Départ : le centre de la case piégée. Arrivée : en bas, dans sa colonne.
    var c = options.caseEl.getBoundingClientRect();
    var departX = c.left + c.width / 2 - gauche - L / 2;
    var departY = c.top + c.height / 2 - dessus - H / 2;
    var finX = Math.max(6, Math.min(largeur - L - 6, departX));
    var finY = Math.max(0, hauteur - H - 4);
    var sommet = Math.max(0, Math.min(departY, finY) - 70);

    var alterner = function (a, b, delai) {
      if (rythme !== null) clearInterval(rythme);
      var n = 0;
      perso.src = dessiner(a);
      rythme = setInterval(function () { perso.src = dessiner(n++ % 2 ? a : b); }, delai);
    };
    var plus = function (ms, f) { minuteurs.push(setTimeout(f, ms)); };

    // Elle jaillit de la case et retombe sur ses pieds.
    perso.src = dessiner("saut");
    perso.style.left = finX + "px";
    perso.style.top = finY + "px";
    perso.animate([
      { left: departX + "px", top: departY + "px", transform: "scale(0.2)", easing: "ease-out" },
      { left: (departX + finX) / 2 + "px", top: sommet + "px", transform: "scale(1)", offset: 0.5, easing: "ease-in" },
      { left: finX + "px", top: finY + "px", transform: "scale(1)" }
    ], { duration: 800 });

    plus(800, function () { perso.src = dessiner("marche1"); });

    // Elle lève son bâton et crie, la bulle du côté où il y a de la place.
    plus(1150, function () {
      perso.src = dessiner("sort");
      var aDroite = finX + L + 140 < largeur;
      bulle.classList.toggle("dem-bulle-gauche", !aDroite);
      bulle.style.top = finY + 2 + "px";
      if (aDroite) bulle.style.left = finX + L + 8 + "px";
      else bulle.style.right = largeur - finX + 8 + "px";
      bulle.hidden = false;
    });

    // Tout explose.
    plus(2550, function () {
      bulle.hidden = true;
      var boule = document.createElement("div");
      boule.className = "dem-boule";
      boule.style.left = centre.x + "px";
      boule.style.top = centre.y + "px";
      scene.appendChild(boule);
      // Le dôme finit par recouvrir toute la boîte, coins du haut compris.
      var taille = 2 * Math.sqrt(largeur * largeur / 4 + hauteur * hauteur);
      var b = boule.animate([
        { width: "10px", height: "10px", opacity: 1 },
        { width: taille * 0.8 + "px", height: taille * 0.8 + "px", opacity: 1, offset: 0.45 },
        { width: taille + "px", height: taille + "px", opacity: 0 }
      ], { duration: 950, easing: "steps(10)", fill: "forwards" });
      plus(1000, boule.remove.bind(boule));
      eclats(largeur, hauteur, centre);
      cadre.querySelector(".dem-zone").animate([
        { transform: "translate(0, 0)" }, { transform: "translate(-7px, 4px)" },
        { transform: "translate(6px, -5px)" }, { transform: "translate(-5px, -3px)" },
        { transform: "translate(5px, 4px)" }, { transform: "translate(0, 0)" }
      ], { duration: 520, iterations: 2 });
    });

    plus(3500, montrerBouton);

    // Satisfaite, elle danse puis repart en dansant.
    plus(3600, function () { alterner("danse1", "danse2", 260); });
    plus(4800, function () {
      perso.animate([{ left: finX + "px" }, { left: largeur + 70 + "px" }],
                    { duration: 2800, easing: "linear", fill: "forwards" });
    });
    plus(7700, function () {
      clearInterval(rythme);
      rythme = null;
      perso.remove();
    });
  };

  return { jouer: jouer, arreter: arreter };
})();
