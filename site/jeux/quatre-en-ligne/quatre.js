// Quatre en ligne : le joueur contre l'ordinateur, sur 7 colonnes et 6 rangées.
//   faible : joue au hasard, mais saisit une victoire immédiate ;
//   moyen  : gagne ou bloque s'il le peut, regarde un peu devant lui ;
//   fort   : recherche alpha-bêta sur plusieurs coups.
// Le niveau, la partie et les scores sont mémorisés dans le navigateur.
// Les couleurs viennent des variables du thème, voir style.css.
(function () {
  var TEXTES = {
    fr: {
      aToi: "À toi de jouer.",
      reflexion: "L'ordinateur réfléchit…",
      gagne: "Bravo, tu as aligné quatre pions !",
      perdu: "L'ordinateur a aligné quatre pions.",
      nul: "Grille pleine : match nul.",
      colonne: function (c) { return "Jouer en colonne " + c; }
    },
    en: {
      aToi: "Your turn.",
      reflexion: "The computer is thinking…",
      gagne: "Well done, you lined up four!",
      perdu: "The computer lined up four.",
      nul: "Board full: it's a draw.",
      colonne: function (c) { return "Play in column " + c; }
    }
  };

  // --- Règles et IA -----------------------------------------------------------
  var COLONNES = 7, RANGEES = 6, JOUEUR = 1, ORDI = 2;
  // Colonnes du centre d'abord : la recherche coupe plus vite.
  var ORDRE = [3, 2, 4, 1, 5, 0, 6];
  var PROFONDEUR = { moyen: 3, fort: 7 };

  var vide = function () {
    var g = [];
    for (var i = 0; i < COLONNES * RANGEES; i++) g.push(0);
    return g;
  };

  // Rangée d'arrivée d'un pion (0 en haut), ou -1 si la colonne est pleine.
  var chute = function (g, c) {
    for (var r = RANGEES - 1; r >= 0; r--) if (!g[r * COLONNES + c]) return r;
    return -1;
  };

  var LIGNES = (function () {
    var l = [], dirs = [[1, 0], [0, 1], [1, 1], [1, -1]];
    for (var r = 0; r < RANGEES; r++) {
      for (var c = 0; c < COLONNES; c++) {
        dirs.forEach(function (d) {
          var fin = [c + 3 * d[0], r + 3 * d[1]];
          if (fin[0] < 0 || fin[0] >= COLONNES || fin[1] < 0 || fin[1] >= RANGEES) return;
          l.push([0, 1, 2, 3].map(function (k) { return (r + k * d[1]) * COLONNES + c + k * d[0]; }));
        });
      }
    }
    return l;
  })();

  var ligneGagnante = function (g) {
    for (var i = 0; i < LIGNES.length; i++) {
      var l = LIGNES[i], v = g[l[0]];
      if (v && v === g[l[1]] && v === g[l[2]] && v === g[l[3]]) return l;
    }
    return null;
  };

  var coupsPossibles = function (g) {
    return ORDRE.filter(function (c) { return chute(g, c) >= 0; });
  };

  var jouerCoup = function (g, c, qui) {
    var copie = g.slice();
    copie[chute(g, c) * COLONNES + c] = qui;
    return copie;
  };

  var coupGagnant = function (g, qui) {
    var liste = coupsPossibles(g);
    for (var i = 0; i < liste.length; i++) {
      if (ligneGagnante(jouerCoup(g, liste[i], qui))) return liste[i];
    }
    return -1;
  };

  // Valeur d'une position pour l'ordinateur : lignes encore ouvertes et centre.
  var evaluer = function (g) {
    var score = 0, i;
    for (i = 0; i < LIGNES.length; i++) {
      var o = 0, j = 0;
      for (var k = 0; k < 4; k++) {
        if (g[LIGNES[i][k]] === ORDI) o++;
        else if (g[LIGNES[i][k]] === JOUEUR) j++;
      }
      if (o && !j) score += o === 3 ? 25 : o === 2 ? 4 : 1;
      else if (j && !o) score -= j === 3 ? 25 : j === 2 ? 4 : 1;
    }
    for (var r = 0; r < RANGEES; r++) {
      if (g[r * COLONNES + 3] === ORDI) score += 3;
      else if (g[r * COLONNES + 3] === JOUEUR) score -= 3;
    }
    return score;
  };

  var GAIN = 100000;
  var alphaBeta = function (g, prof, alpha, beta, maxi) {
    if (ligneGagnante(g)) return maxi ? -GAIN - prof : GAIN + prof;   // le dernier coup est de l'adversaire
    var coups = coupsPossibles(g);
    if (!coups.length) return 0;
    if (!prof) return evaluer(g);
    var meilleur = maxi ? -Infinity : Infinity;
    for (var i = 0; i < coups.length; i++) {
      var v = alphaBeta(jouerCoup(g, coups[i], maxi ? ORDI : JOUEUR), prof - 1, alpha, beta, !maxi);
      if (maxi) {
        if (v > meilleur) meilleur = v;
        if (v > alpha) alpha = v;
      } else {
        if (v < meilleur) meilleur = v;
        if (v < beta) beta = v;
      }
      if (alpha >= beta) break;
    }
    return meilleur;
  };

  var choisirCoup = function (g, niveau) {
    var coups = coupsPossibles(g);
    var gain = coupGagnant(g, ORDI);
    if (gain >= 0) return gain;
    if (niveau === "faible") return coups[Math.floor(Math.random() * coups.length)];
    var blocage = coupGagnant(g, JOUEUR);
    if (blocage >= 0) return blocage;
    var prof = PROFONDEUR[niveau], meilleurs = [], meilleur = -Infinity;
    coups.forEach(function (c) {
      var v = alphaBeta(jouerCoup(g, c, ORDI), prof - 1, -Infinity, Infinity, false);
      if (v > meilleur) { meilleur = v; meilleurs = []; }
      if (v === meilleur) meilleurs.push(c);
    });
    return meilleurs[Math.floor(Math.random() * meilleurs.length)];
  };

  // --- Interface --------------------------------------------------------------
  var textes = TEXTES[document.documentElement.lang] || TEXTES.fr;
  var el = function (s) { return document.querySelector(s); };
  var plateau = el(".quatre-plateau"), statut = el(".quatre-statut");
  var CLE = "quatre-en-ligne";
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DELAI = reduit ? 0 : 450;

  var memoire = { niveau: "moyen", premier: JOUEUR, scores: {} };
  var grille = vide(), trait = JOUEUR, finie = false, message = "", minuteur = null, dernier = -1, gagnante = null;

  var scoreCourant = function () {
    var s = memoire.scores[memoire.niveau];
    return s || (memoire.scores[memoire.niveau] = { victoires: 0, nuls: 0, defaites: 0 });
  };

  var enregistrer = function () {
    try {
      localStorage.setItem(CLE, JSON.stringify({ niveau: memoire.niveau, premier: memoire.premier, scores: memoire.scores,
        partie: finie ? null : { grille: grille, trait: trait, dernier: dernier } }));
    } catch (e) { /* stockage indisponible : la partie n'est simplement pas mémorisée */ }
  };

  var trous = [], colonnes = [];
  (function construire() {
    for (var c = 0; c < COLONNES; c++) {
      (function (col) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "quatre-colonne";
        b.setAttribute("aria-label", textes.colonne(col + 1));
        b.addEventListener("click", function () { jouerJoueur(col); });
        colonnes.push(b);
        plateau.appendChild(b);
      })(c);
    }
    for (var r = 0; r < RANGEES * COLONNES; r++) {
      var t = document.createElement("span");
      t.className = "quatre-trou";
      t.style.gridRow = Math.floor(r / COLONNES) + 1;
      t.style.gridColumn = r % COLONNES + 1;
      t.setAttribute("aria-hidden", "true");
      plateau.appendChild(t);
      trous.push(t);
    }
  })();

  var dessiner = function () {
    trous.forEach(function (t, i) {
      var v = grille[i];
      var cible = v === JOUEUR ? "joueur" : v === ORDI ? "ordi" : "";
      if (t.dataset.pion !== cible) {
        t.dataset.pion = cible;
        if (cible && !reduit && t.animate && i === dernier) {
          var rangee = Math.floor(i / COLONNES);
          t.animate([{ transform: "translateY(-" + (rangee + 1) * 105 + "%)" }, { transform: "translateY(0)" }],
                    { duration: 120 + rangee * 45, easing: "cubic-bezier(.45,.05,.9,.6)" });
        }
      }
      t.classList.toggle("gagnant", !!gagnante && gagnante.indexOf(i) >= 0);
    });
    var attente = finie || trait !== JOUEUR;
    colonnes.forEach(function (b, c) {
      b.setAttribute("aria-disabled", attente || chute(grille, c) < 0 ? "true" : "false");
    });
    statut.textContent = message;
    var s = scoreCourant();
    el('[data-score="victoires"]').textContent = s.victoires;
    el('[data-score="nuls"]').textContent = s.nuls;
    el('[data-score="defaites"]').textContent = s.defaites;
  };

  var terminer = function () {
    finie = true;
    var s = scoreCourant();
    if (gagnante) {
      var joueurGagne = grille[gagnante[0]] === JOUEUR;
      if (joueurGagne) s.victoires++; else s.defaites++;
      message = joueurGagne ? textes.gagne : textes.perdu;
    } else {
      s.nuls++;
      message = textes.nul;
    }
    memoire.premier = memoire.premier === JOUEUR ? ORDI : JOUEUR;
  };

  // Pose le pion ; renvoie vrai si la partie continue.
  var poser = function (c, qui) {
    var r = chute(grille, c);
    grille = jouerCoup(grille, c, qui);
    dernier = r * COLONNES + c;
    trait = qui === JOUEUR ? ORDI : JOUEUR;
    gagnante = ligneGagnante(grille);
    if (gagnante || !coupsPossibles(grille).length) { terminer(); return false; }
    return true;
  };

  var jouerOrdi = function () {
    message = textes.reflexion;
    dessiner();
    minuteur = setTimeout(function () {
      minuteur = null;
      if (poser(choisirCoup(grille, memoire.niveau), ORDI)) message = textes.aToi;
      enregistrer();
      dessiner();
    }, DELAI);
  };

  var jouerJoueur = function (c) {
    if (finie || trait !== JOUEUR || chute(grille, c) < 0) return;
    if (poser(c, JOUEUR)) {
      enregistrer();
      jouerOrdi();
    } else {
      enregistrer();
      dessiner();
    }
  };

  var nouvelle = function () {
    if (minuteur !== null) { clearTimeout(minuteur); minuteur = null; }
    grille = vide();
    finie = false;
    gagnante = null;
    dernier = -1;
    trait = memoire.premier;
    enregistrer();
    if (trait === ORDI) jouerOrdi();
    else {
      message = textes.aToi;
      dessiner();
    }
  };

  el(".quatre-nouvelle").addEventListener("click", nouvelle);

  // Touches 1 à 7 : jouer dans la colonne.
  document.addEventListener("keydown", function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || document.getElementById("panneau-jeu").hidden) return;
    if (ev.target.closest("select, input, a")) return;
    var n = parseInt(ev.key, 10);
    if (n >= 1 && n <= COLONNES) jouerJoueur(n - 1);
  });

  var partie = null;
  try {
    var lu = JSON.parse(localStorage.getItem(CLE));
    if (lu) {
      if (/^(faible|moyen|fort)$/.test(lu.niveau)) memoire.niveau = lu.niveau;
      if (lu.premier === ORDI) memoire.premier = ORDI;
      if (lu.scores) memoire.scores = lu.scores;
      partie = lu.partie;
    }
  } catch (e) { /* stockage indisponible ou illisible : on repart de zéro */ }

  document.querySelectorAll('input[name="niveau"]').forEach(function (r) {
    r.checked = r.value === memoire.niveau;
    r.addEventListener("change", function () {
      memoire.niveau = r.value;
      nouvelle();
    });
  });

  if (partie && Array.isArray(partie.grille) && partie.grille.length === grille.length) {
    grille = partie.grille;
    dernier = partie.dernier;
    trait = partie.trait === ORDI ? ORDI : JOUEUR;
    if (trait === ORDI) jouerOrdi();
    else {
      message = textes.aToi;
      dessiner();
    }
  } else {
    nouvelle();
  }
})();
