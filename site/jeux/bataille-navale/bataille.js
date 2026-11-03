// Bataille navale : le joueur contre l'ordinateur, sur des grilles de 10 × 10.
//
// L'ordinateur ne triche pas : son IA (creerIa) n'a jamais accès à la flotte du
// joueur. Elle ne reçoit que les réponses de l'arbitre à ses tirs, exactement
// les informations que le joueur reçoit de son côté.
//
// La partie en cours et les scores sont mémorisés dans le navigateur.
// Les couleurs viennent des variables du thème, voir style.css.
(function () {
  var TEXTES = {
    fr: {
      navires: ["Porte-avions", "Croiseur", "Contre-torpilleur", "Sous-marin", "Torpilleur"],
      placer: function (nom, n) { return "Place ton " + nom.toLowerCase() + " (" + n + " cases)."; },
      pret: "Ta flotte est prête.",
      aToi: "À toi de tirer.",
      reflexion: "L'ordinateur réfléchit…",
      eau: "Raté.",
      touche: "Touché !",
      coule: function (nom) { return "Coulé : " + nom.toLowerCase() + " !"; },
      tirOrdi: function (c, r) { return "L'ordinateur tire en " + c + " : " + r; },
      eauOrdi: "raté.",
      toucheOrdi: "touché !",
      couleOrdi: function (nom) { return "il a coulé ton " + nom.toLowerCase() + " !"; },
      gagne: function (n) { return "Bravo, tu as gagné en " + n + " tirs !"; },
      perdu: "L'ordinateur a coulé toute ta flotte. Ses navires restants sont révélés.",
      horizontal: "Horizontal",
      vertical: "Vertical",
      etats: { vide: "inconnue", eau: "raté", touche: "touché", coule: "coulé", navire: "navire" }
    },
    en: {
      navires: ["Carrier", "Battleship", "Cruiser", "Submarine", "Destroyer"],
      placer: function (nom, n) { return "Place your " + nom.toLowerCase() + " (" + n + " squares)."; },
      pret: "Your fleet is ready.",
      aToi: "Your shot.",
      reflexion: "The computer is thinking…",
      eau: "Miss.",
      touche: "Hit!",
      coule: function (nom) { return "Sunk: " + nom.toLowerCase() + "!"; },
      tirOrdi: function (c, r) { return "The computer fires at " + c + ": " + r; },
      eauOrdi: "miss.",
      toucheOrdi: "hit!",
      couleOrdi: function (nom) { return "it sank your " + nom.toLowerCase() + "!"; },
      gagne: function (n) { return "Well done, you won in " + n + " shots!"; },
      perdu: "The computer sank your whole fleet. Its remaining ships are revealed.",
      horizontal: "Horizontal",
      vertical: "Vertical",
      etats: { vide: "unknown", eau: "miss", touche: "hit", coule: "sunk", navire: "ship" }
    }
  };

  // --- Règles et IA -----------------------------------------------------------
  var TAILLE = 10;
  var LONGUEURS = [5, 4, 3, 3, 2];

  // Cases d'un navire posé à partir de la case `depart`, ou null s'il dépasse.
  var casesNavire = function (depart, longueur, horizontal) {
    var ligne = Math.floor(depart / TAILLE), col = depart % TAILLE;
    if ((horizontal ? col : ligne) + longueur > TAILLE) return null;
    var cases = [];
    for (var n = 0; n < longueur; n++) cases.push(depart + n * (horizontal ? 1 : TAILLE));
    return cases;
  };

  var flotteVide = function () {
    return LONGUEURS.map(function (l) { return { longueur: l, cases: [], touches: [] }; });
  };

  var estLibre = function (flotte, cases) {
    return flotte.every(function (n) {
      return n.cases.every(function (c) { return cases.indexOf(c) < 0; });
    });
  };

  var placerAuHasard = function (flotte) {
    flotte.forEach(function (navire) {
      navire.cases = [];
      var cases = null;
      while (!cases) {
        var essai = casesNavire(Math.floor(Math.random() * TAILLE * TAILLE),
                                navire.longueur, Math.random() < 0.5);
        if (essai && estLibre(flotte, essai)) cases = essai;
      }
      navire.cases = cases;
    });
    return flotte;
  };

  // L'arbitre : la seule fonction qui consulte une flotte pour répondre à un tir.
  var repondre = function (flotte, cible) {
    for (var i = 0; i < flotte.length; i++) {
      var navire = flotte[i];
      if (navire.cases.indexOf(cible) < 0) continue;
      if (navire.touches.indexOf(cible) < 0) navire.touches.push(cible);
      if (navire.touches.length === navire.longueur) {
        return { resultat: "coule", navire: i, longueur: navire.longueur, cases: navire.cases.slice() };
      }
      return { resultat: "touche" };
    }
    return { resultat: "eau" };
  };

  var flotteCoulee = function (flotte) {
    return flotte.every(function (n) { return n.touches.length === n.longueur; });
  };

  // L'adversaire. Pour chaque navire encore à flot, il compte les positions
  // compatibles avec ce qu'il sait, et tire là où il y en a le plus. Après un
  // touché, il ne regarde que les positions qui expliquent ce touché. En
  // recherche, il tire parmi les bonnes cases et pas toujours la meilleure,
  // pour rester battable.
  var INCONNU = 0, EAU = 1, TOUCHE = 2, COULE = 3;
  var creerIa = function (longueurs) {
    var grille = [], restants = longueurs.slice();
    for (var n = 0; n < TAILLE * TAILLE; n++) grille.push(INCONNU);

    var compter = function (enCible) {
      var scores = grille.map(function () { return 0; });
      restants.forEach(function (longueur) {
        [true, false].forEach(function (horizontal) {
          for (var depart = 0; depart < grille.length; depart++) {
            var cases = casesNavire(depart, longueur, horizontal);
            if (!cases) continue;
            var possible = true, touches = 0;
            cases.forEach(function (c) {
              if (grille[c] === EAU || grille[c] === COULE) possible = false;
              if (grille[c] === TOUCHE) touches++;
            });
            if (!possible || (enCible && !touches)) continue;
            var poids = 1 + 10 * touches * touches;
            cases.forEach(function (c) { if (grille[c] === INCONNU) scores[c] += poids; });
          }
        });
      });
      return scores;
    };

    var meilleures = function (scores, seuil) {
      var max = Math.max.apply(null, scores);
      if (!max) return [];
      var liste = [];
      scores.forEach(function (s, c) { if (s >= max * seuil) liste.push(c); });
      return liste;
    };

    return {
      choisir: function () {
        var candidates = grille.indexOf(TOUCHE) >= 0 ? meilleures(compter(true), 1) : [];
        if (!candidates.length) candidates = meilleures(compter(false), 0.8);
        if (!candidates.length) {
          grille.forEach(function (v, c) { if (v === INCONNU) candidates.push(c); });
        }
        return candidates[Math.floor(Math.random() * candidates.length)];
      },
      noter: function (cible, reponse) {
        if (reponse.resultat === "eau") grille[cible] = EAU;
        else if (reponse.resultat === "touche") grille[cible] = TOUCHE;
        else {
          reponse.cases.forEach(function (c) { grille[c] = COULE; });
          restants.splice(restants.indexOf(reponse.longueur), 1);
        }
      }
    };
  };

  // --- Interface --------------------------------------------------------------
  var textes = TEXTES[document.documentElement.lang] || TEXTES.fr;
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DELAI = reduit ? 0 : 650;
  var CLE = "bataille-navale";

  var statut = document.querySelector(".naval-statut");
  var merJoueur = document.querySelector(".mer-joueur");
  var merOrdi = document.querySelector(".mer-ordi");
  var panneauOrdi = document.querySelector(".naval-adverse");
  var commandes = document.querySelector(".naval-placement");
  var boutonPivoter = document.querySelector(".naval-pivoter");
  var boutonCommencer = document.querySelector(".naval-commencer");

  var memoire = { victoires: 0, defaites: 0, premier: "joueur" };
  var phase = "placement", trait = "joueur", horizontal = true;
  var flotteJoueur = flotteVide(), flotteOrdi = flotteVide();
  var tirsJoueur = [], tirsOrdi = [];
  var ia = null, minuteur = null, message = "", dernierTirOrdi = -1, apercu = -1;

  var nomCase = function (c) {
    return "ABCDEFGHIJ".charAt(c % TAILLE) + (Math.floor(c / TAILLE) + 1);
  };

  var enregistrer = function () {
    var partie = phase === "combat" ? {
      joueur: flotteJoueur.map(function (n) { return n.cases; }),
      ordi: flotteOrdi.map(function (n) { return n.cases; }),
      tirsJoueur: tirsJoueur,
      tirsOrdi: tirsOrdi,
      trait: trait
    } : null;
    try {
      localStorage.setItem(CLE, JSON.stringify({
        victoires: memoire.victoires, defaites: memoire.defaites,
        premier: memoire.premier, partie: partie
      }));
    } catch (e) { /* stockage indisponible : la partie n'est simplement pas mémorisée */ }
  };

  var navireSuivant = function () {
    for (var i = 0; i < flotteJoueur.length; i++) if (!flotteJoueur[i].cases.length) return i;
    return -1;
  };

  // --- Grilles ----------------------------------------------------------------
  var construireMer = function (mer, surCase) {
    var cases = [];
    var entete = function (texte) {
      var el = document.createElement("span");
      el.className = "mer-entete";
      el.setAttribute("aria-hidden", "true");
      el.textContent = texte;
      mer.appendChild(el);
    };
    entete("");
    for (var c = 0; c < TAILLE; c++) entete("ABCDEFGHIJ".charAt(c));
    for (var i = 0; i < TAILLE * TAILLE; i++) {
      if (i % TAILLE === 0) entete(i / TAILLE + 1);
      (function (numero) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "mer-case";
        b.tabIndex = numero === 0 ? 0 : -1;
        b.addEventListener("click", function () { surCase(numero); });
        b.addEventListener("focus", function () {
          cases.forEach(function (x) { x.tabIndex = x === b ? 0 : -1; });
        });
        // Les flèches se déplacent dans la grille, Tab en sort.
        b.addEventListener("keydown", function (ev) {
          var pas = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -TAILLE, ArrowDown: TAILLE }[ev.key];
          if (!pas) return;
          ev.preventDefault();
          var cible = numero + pas;
          var memeLigne = Math.abs(pas) === TAILLE || Math.floor(cible / TAILLE) === Math.floor(numero / TAILLE);
          if (cible >= 0 && cible < cases.length && memeLigne) cases[cible].focus();
        });
        mer.appendChild(b);
        cases.push(b);
      })(i);
    }
    return cases;
  };

  var etatCase = function (flotte, tirs, c, montrer) {
    var navire = flotte.filter(function (n) { return n.cases.indexOf(c) >= 0; })[0];
    if (tirs.indexOf(c) >= 0) {
      if (!navire) return "eau";
      return navire.touches.length === navire.longueur ? "coule" : "touche";
    }
    return navire && montrer ? "navire" : "vide";
  };

  var peindre = function (cases, flotte, tirs, montrer) {
    cases.forEach(function (b, c) {
      var e = etatCase(flotte, tirs, c, montrer);
      b.dataset.etat = e;
      b.setAttribute("aria-label", nomCase(c) + " : " + textes.etats[e]);
    });
  };

  var listeFlotte = function (el, flotte) {
    el.innerHTML = "";
    flotte.forEach(function (n, i) {
      var li = document.createElement("li");
      li.textContent = textes.navires[i] + " " + n.longueur;
      if (n.touches.length === n.longueur) li.className = "coule";
      el.appendChild(li);
    });
  };

  var dessiner = function () {
    var enPlacement = phase === "placement";
    var suivant = navireSuivant();
    panneauOrdi.hidden = enPlacement;
    commandes.hidden = !enPlacement;

    peindre(casesJoueur, flotteJoueur, tirsOrdi, true);
    peindre(casesOrdi, flotteOrdi, tirsJoueur, phase === "fin");

    casesJoueur.forEach(function (b, c) {
      b.classList.toggle("dernier", c === dernierTirOrdi);
      b.classList.remove("apercu", "apercu-ko");
      b.setAttribute("aria-disabled", enPlacement ? "false" : "true");
    });
    casesOrdi.forEach(function (b, c) {
      var jouable = phase === "combat" && trait === "joueur" && tirsJoueur.indexOf(c) < 0;
      b.setAttribute("aria-disabled", jouable ? "false" : "true");
    });
    if (enPlacement && suivant >= 0 && apercu >= 0) {
      var cases = casesNavire(apercu, flotteJoueur[suivant].longueur, horizontal);
      var valide = cases && estLibre(flotteJoueur, cases);
      (cases || [apercu]).forEach(function (c) {
        casesJoueur[c].classList.add(valide ? "apercu" : "apercu-ko");
      });
    }

    if (enPlacement) {
      statut.textContent = suivant >= 0
        ? textes.placer(textes.navires[suivant], flotteJoueur[suivant].longueur)
        : textes.pret;
    } else {
      statut.textContent = message;
    }
    boutonPivoter.textContent = horizontal ? textes.horizontal : textes.vertical;
    boutonCommencer.disabled = suivant >= 0;

    listeFlotte(document.querySelector(".flotte-joueur"), flotteJoueur);
    listeFlotte(document.querySelector(".flotte-ordi"), flotteOrdi);

    document.querySelector('[data-info="victoires"]').textContent = memoire.victoires;
    document.querySelector('[data-info="defaites"]').textContent = memoire.defaites;
    document.querySelector('[data-info="tirs"]').textContent = tirsJoueur.length;
  };

  // --- Placement --------------------------------------------------------------
  var clicPlacement = function (c) {
    if (phase !== "placement") return;
    // Toucher un navire déjà posé le reprend.
    var pose = flotteJoueur.filter(function (n) { return n.cases.indexOf(c) >= 0; })[0];
    if (pose) {
      pose.cases = [];
      dessiner();
      return;
    }
    var i = navireSuivant();
    if (i < 0) return;
    var cases = casesNavire(c, flotteJoueur[i].longueur, horizontal);
    if (cases && estLibre(flotteJoueur, cases)) flotteJoueur[i].cases = cases;
    dessiner();
  };

  var pivoter = function () {
    horizontal = !horizontal;
    dessiner();
  };

  // --- Combat -----------------------------------------------------------------
  var terminer = function (joueurGagne) {
    phase = "fin";
    if (joueurGagne) memoire.victoires++; else memoire.defaites++;
    memoire.premier = memoire.premier === "joueur" ? "ordi" : "joueur";
    message = joueurGagne ? textes.gagne(tirsJoueur.length) : textes.perdu;
    enregistrer();
    dessiner();
  };

  var jouerOrdi = function () {
    minuteur = setTimeout(function () {
      minuteur = null;
      var cible = ia.choisir();
      var reponse = repondre(flotteJoueur, cible);
      ia.noter(cible, reponse);
      tirsOrdi.push(cible);
      dernierTirOrdi = cible;
      if (flotteCoulee(flotteJoueur)) { terminer(false); return; }
      var texte = reponse.resultat === "eau" ? textes.eauOrdi
                : reponse.resultat === "touche" ? textes.toucheOrdi
                : textes.couleOrdi(textes.navires[reponse.navire]);
      message = textes.tirOrdi(nomCase(cible), texte) + " " + textes.aToi;
      trait = "joueur";
      enregistrer();
      dessiner();
    }, DELAI);
  };

  var clicTir = function (c) {
    if (phase !== "combat" || trait !== "joueur" || tirsJoueur.indexOf(c) >= 0) return;
    var reponse = repondre(flotteOrdi, c);
    tirsJoueur.push(c);
    if (flotteCoulee(flotteOrdi)) { terminer(true); return; }
    var texte = reponse.resultat === "eau" ? textes.eau
              : reponse.resultat === "touche" ? textes.touche
              : textes.coule(textes.navires[reponse.navire]);
    message = texte + " " + textes.reflexion;
    trait = "ordi";
    enregistrer();
    dessiner();
    jouerOrdi();
  };

  var commencer = function () {
    if (navireSuivant() >= 0) return;
    placerAuHasard(flotteOrdi);
    ia = creerIa(LONGUEURS);
    phase = "combat";
    trait = memoire.premier;
    message = trait === "joueur" ? textes.aToi : textes.reflexion;
    enregistrer();
    dessiner();
    if (trait === "ordi") jouerOrdi();
  };

  var nouvellePartie = function () {
    if (minuteur !== null) { clearTimeout(minuteur); minuteur = null; }
    phase = "placement";
    flotteJoueur = flotteVide();
    flotteOrdi = flotteVide();
    tirsJoueur = [];
    tirsOrdi = [];
    ia = null;
    dernierTirOrdi = -1;
    message = "";
    enregistrer();
    dessiner();
  };

  // On rejoue les tirs : l'IA retrouve ses connaissances par les mêmes réponses.
  var reprendre = function (partie) {
    var charger = function (listes) {
      var flotte = flotteVide();
      if (listes.length !== flotte.length) throw new Error("flotte");
      listes.forEach(function (cases, i) {
        if (cases.length !== flotte[i].longueur) throw new Error("navire");
        flotte[i].cases = cases;
      });
      return flotte;
    };
    flotteJoueur = charger(partie.joueur);
    flotteOrdi = charger(partie.ordi);
    ia = creerIa(LONGUEURS);
    tirsJoueur = partie.tirsJoueur;
    tirsOrdi = partie.tirsOrdi;
    tirsJoueur.forEach(function (c) { repondre(flotteOrdi, c); });
    tirsOrdi.forEach(function (c) { ia.noter(c, repondre(flotteJoueur, c)); });
    dernierTirOrdi = tirsOrdi.length ? tirsOrdi[tirsOrdi.length - 1] : -1;
    trait = partie.trait === "ordi" ? "ordi" : "joueur";
    phase = "combat";
    message = trait === "joueur" ? textes.aToi : textes.reflexion;
    dessiner();
    if (trait === "ordi") jouerOrdi();
  };

  // --- Mise en place ----------------------------------------------------------
  var casesJoueur = construireMer(merJoueur, clicPlacement);
  var casesOrdi = construireMer(merOrdi, clicTir);

  casesJoueur.forEach(function (b, c) {
    var montrer = function () { if (phase === "placement") { apercu = c; dessiner(); } };
    b.addEventListener("pointerenter", montrer);
    b.addEventListener("focus", montrer);
  });
  merJoueur.addEventListener("pointerleave", function () {
    if (phase === "placement") { apercu = -1; dessiner(); }
  });

  document.addEventListener("keydown", function (ev) {
    if (phase === "placement" && (ev.key === "r" || ev.key === "R") && !ev.ctrlKey && !ev.metaKey) pivoter();
  });

  boutonPivoter.addEventListener("click", pivoter);
  boutonCommencer.addEventListener("click", commencer);
  document.querySelector(".naval-hasard").addEventListener("click", function () {
    flotteJoueur = placerAuHasard(flotteVide());
    dessiner();
  });
  document.querySelector(".naval-effacer").addEventListener("click", function () {
    flotteJoueur = flotteVide();
    dessiner();
  });
  document.querySelector(".naval-nouvelle").addEventListener("click", nouvellePartie);

  var partieLue = null;
  try {
    var lu = JSON.parse(localStorage.getItem(CLE));
    if (lu) {
      if (typeof lu.victoires === "number") memoire.victoires = lu.victoires;
      if (typeof lu.defaites === "number") memoire.defaites = lu.defaites;
      if (lu.premier === "ordi") memoire.premier = "ordi";
      partieLue = lu.partie;
    }
  } catch (e) { /* stockage indisponible ou illisible : on repart de zéro */ }

  dessiner();
  if (partieLue) {
    try { reprendre(partieLue); }
    catch (e) { nouvellePartie(); }
  }
})();
