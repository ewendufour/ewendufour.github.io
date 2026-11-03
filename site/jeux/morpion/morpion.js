// Morpion : le joueur (X) contre l'ordinateur (O), en trois niveaux.
//   faible : joue au hasard ;
//   moyen  : gagne ou bloque s'il le peut, joue au hasard sinon ;
//   fort   : minimax, donc imbattable.
// Le niveau et les scores (un par niveau) sont mémorisés dans le navigateur.
// Les couleurs viennent des variables du thème, voir style.css.
(function () {
  var TEXTES = {
    fr: {
      aToi: "À toi de jouer",
      reflexion: "L'ordinateur réfléchit…",
      gagne: "Tu as gagné !",
      perdu: "L'ordinateur a gagné.",
      nul: "Match nul.",
      caseLabel: function (l, c, contenu) {
        return "Ligne " + l + ", colonne " + c + " : " + (contenu || "vide");
      }
    },
    en: {
      aToi: "Your turn",
      reflexion: "The computer is thinking…",
      gagne: "You won!",
      perdu: "The computer won.",
      nul: "It's a draw.",
      caseLabel: function (l, c, contenu) {
        return "Row " + l + ", column " + c + ": " + (contenu || "empty");
      }
    }
  };

  // --- Règles et IA ---------------------------------------------------------
  var JOUEUR = "X", ORDI = "O";
  var LIGNES = [[0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]];

  var ligneGagnante = function (cases) {
    for (var i = 0; i < LIGNES.length; i++) {
      var l = LIGNES[i];
      if (cases[l[0]] && cases[l[0]] === cases[l[1]] && cases[l[0]] === cases[l[2]]) return l;
    }
    return null;
  };

  var casesLibres = function (cases) {
    var libres = [];
    for (var i = 0; i < 9; i++) if (!cases[i]) libres.push(i);
    return libres;
  };

  var auHasard = function (liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  };

  // Case qui donne immédiatement la victoire à `qui`, ou null.
  var coupGagnant = function (cases, qui) {
    var libres = casesLibres(cases);
    for (var i = 0; i < libres.length; i++) {
      var essai = cases.slice();
      essai[libres[i]] = qui;
      if (ligneGagnante(essai)) return libres[i];
    }
    return null;
  };

  // Valeur de la position pour l'ordinateur ; `prof` fait préférer les
  // victoires rapides et les défaites lentes.
  var minimax = function (cases, trait, prof) {
    var gagnante = ligneGagnante(cases);
    if (gagnante) return cases[gagnante[0]] === ORDI ? 10 - prof : prof - 10;
    var libres = casesLibres(cases);
    if (!libres.length) return 0;
    var meilleur = trait === ORDI ? -Infinity : Infinity;
    for (var i = 0; i < libres.length; i++) {
      var essai = cases.slice();
      essai[libres[i]] = trait;
      var v = minimax(essai, trait === ORDI ? JOUEUR : ORDI, prof + 1);
      meilleur = trait === ORDI ? Math.max(meilleur, v) : Math.min(meilleur, v);
    }
    return meilleur;
  };

  // Tirage parmi les meilleurs coups, pour que les parties varient.
  var coupOptimal = function (cases) {
    var libres = casesLibres(cases), meilleurs = [], meilleur = -Infinity;
    for (var i = 0; i < libres.length; i++) {
      var essai = cases.slice();
      essai[libres[i]] = ORDI;
      var v = minimax(essai, JOUEUR, 1);
      if (v > meilleur) { meilleur = v; meilleurs = []; }
      if (v === meilleur) meilleurs.push(libres[i]);
    }
    return auHasard(meilleurs);
  };

  var choisirCoup = function (cases, niveau) {
    if (niveau === "fort") return coupOptimal(cases);
    if (niveau === "moyen") {
      var gain = coupGagnant(cases, ORDI);
      if (gain !== null) return gain;
      var blocage = coupGagnant(cases, JOUEUR);
      if (blocage !== null) return blocage;
    }
    return auHasard(casesLibres(cases));
  };

  // --- Interface ------------------------------------------------------------
  var textes = TEXTES[document.documentElement.lang] || TEXTES.fr;
  var grille = document.querySelector(".grille");
  var statut = document.querySelector(".morpion-statut");
  var nouvelle = document.querySelector(".morpion-nouvelle");
  var choix = document.querySelectorAll('input[name="niveau"]');
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DELAI = reduit ? 0 : 450;

  var SYMBOLES = {
    X: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>',
    O: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5"/></svg>'
  };

  var memoire = { niveau: "moyen", scores: {} };
  try {
    var lu = JSON.parse(localStorage.getItem("morpion"));
    if (lu && /^(faible|moyen|fort)$/.test(lu.niveau)) memoire.niveau = lu.niveau;
    if (lu && lu.scores) memoire.scores = lu.scores;
  } catch (e) { /* stockage indisponible ou illisible : on repart de zéro */ }

  var enregistrer = function () {
    try { localStorage.setItem("morpion", JSON.stringify(memoire)); }
    catch (e) { /* stockage indisponible : le score n'est simplement pas mémorisé */ }
  };

  var scoreCourant = function () {
    var s = memoire.scores[memoire.niveau];
    if (!s) s = memoire.scores[memoire.niveau] = { victoires: 0, nuls: 0, defaites: 0 };
    return s;
  };

  var afficherScore = function () {
    var s = scoreCourant();
    document.querySelectorAll("[data-score]").forEach(function (el) {
      el.textContent = s[el.dataset.score] || 0;
    });
  };

  var cases, finie = true, premier = JOUEUR, trait, minuteur = null;

  var boutons = [];
  for (var n = 0; n < 9; n++) {
    (function (i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "case";
      b.addEventListener("click", function () { jouerJoueur(i); });
      grille.appendChild(b);
      boutons.push(b);
    })(n);
  }

  var dessiner = function () {
    var attente = finie || trait !== JOUEUR;
    boutons.forEach(function (b, i) {
      var contenu = cases[i];
      if (b.dataset.joueur !== contenu) {
        b.innerHTML = contenu ? SYMBOLES[contenu] : "";
        b.dataset.joueur = contenu;
      }
      b.setAttribute("aria-label", textes.caseLabel(Math.floor(i / 3) + 1, i % 3 + 1, contenu));
      b.setAttribute("aria-disabled", attente || contenu ? "true" : "false");
    });
  };

  var terminer = function (ligne) {
    finie = true;
    var s = scoreCourant();
    if (ligne) {
      var joueurGagne = cases[ligne[0]] === JOUEUR;
      if (joueurGagne) s.victoires++; else s.defaites++;
      statut.textContent = joueurGagne ? textes.gagne : textes.perdu;
      ligne.forEach(function (i) { boutons[i].classList.add("gagnante"); });
    } else {
      s.nuls++;
      statut.textContent = textes.nul;
    }
    enregistrer();
    afficherScore();
    dessiner();
  };

  // Pose le coup et passe la main ; renvoie vrai si la partie continue.
  var poser = function (i, qui) {
    cases[i] = qui;
    trait = qui === JOUEUR ? ORDI : JOUEUR;
    var ligne = ligneGagnante(cases);
    if (ligne || !casesLibres(cases).length) { terminer(ligne); return false; }
    return true;
  };

  var jouerOrdi = function () {
    statut.textContent = textes.reflexion;
    dessiner();
    minuteur = setTimeout(function () {
      minuteur = null;
      if (poser(choisirCoup(cases, memoire.niveau), ORDI)) {
        statut.textContent = textes.aToi;
        dessiner();
      }
    }, DELAI);
  };

  var jouerJoueur = function (i) {
    if (finie || trait !== JOUEUR || cases[i]) return;
    if (poser(i, JOUEUR)) jouerOrdi();
  };

  // Le premier joueur change seulement si la partie précédente est allée au bout.
  var demarrer = function () {
    if (minuteur !== null) { clearTimeout(minuteur); minuteur = null; }
    if (cases && finie) premier = premier === JOUEUR ? ORDI : JOUEUR;
    cases = ["", "", "", "", "", "", "", "", ""];
    finie = false;
    trait = premier;
    boutons.forEach(function (b) { b.classList.remove("gagnante"); });
    if (trait === ORDI) jouerOrdi();
    else {
      statut.textContent = textes.aToi;
      dessiner();
    }
  };

  choix.forEach(function (radio) {
    radio.checked = radio.value === memoire.niveau;
    radio.addEventListener("change", function () {
      memoire.niveau = radio.value;
      enregistrer();
      afficherScore();
      demarrer();
    });
  });

  nouvelle.addEventListener("click", demarrer);

  afficherScore();
  demarrer();
})();
