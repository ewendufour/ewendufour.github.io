// Jeux de cartes : solitaire (Klondike), Spider et FreeCell, sur un même moteur.
// Le jeu vient de l'attribut data-jeu de la page. Chaque carte est un bouton :
// on la fait glisser, ou on la touche puis on touche sa destination ; un double
// clic l'envoie au meilleur endroit possible. La partie en cours, l'option et
// le nombre de victoires sont mémorisés dans le navigateur.
// Les couleurs viennent des variables du thème, voir style.css.
(function () {
  var TEXTES = {
    fr: {
      rangs: ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "V", "D", "R"],
      noms: ["", "As", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Valet", "Dame", "Roi"],
      couleurs: ["pique", "cœur", "carreau", "trèfle"],
      de: function (nom, couleur) { return nom + " de " + couleur; },
      retournee: "Carte retournée",
      pioche: "Pioche",
      emplacements: { pioche: "Pioche vide", defausse: "Défausse vide", fondation: "Fondation vide",
                      cellule: "Cellule libre", tableau: "Colonne vide" },
      gagne: "Bravo, partie gagnée !",
      colonneVide: "Remplis les colonnes vides avant de distribuer."
    },
    en: {
      rangs: ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"],
      noms: ["", "Ace", "2", "3", "4", "5", "6", "7", "8", "9", "10", "Jack", "Queen", "King"],
      couleurs: ["spades", "hearts", "diamonds", "clubs"],
      de: function (nom, couleur) { return nom + " of " + couleur; },
      retournee: "Face-down card",
      pioche: "Stock",
      emplacements: { pioche: "Empty stock", defausse: "Empty waste", fondation: "Empty foundation",
                      cellule: "Free cell", tableau: "Empty column" },
      gagne: "Well done, you won!",
      colonneVide: "Fill the empty columns before dealing."
    }
  };
  var SYMBOLES = ["♠︎", "♥︎", "♦︎", "♣︎"];

  var melanger = function (liste) {
    for (var i = liste.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = liste[i]; liste[i] = liste[j]; liste[j] = t;
    }
    return liste;
  };

  var estRouge = function (c) { return c.couleur === 1 || c.couleur === 2; };
  var sommet = function (pile) { return pile.cartes[pile.cartes.length - 1]; };

  var paquetSimple = function (couleurs, fois) {
    var cartes = [];
    for (var n = 0; n < fois; n++) {
      couleurs.forEach(function (couleur) {
        for (var rang = 1; rang <= 13; rang++) cartes.push({ couleur: couleur, rang: rang });
      });
    }
    return cartes;
  };

  // Emplacements : `col` et `rangee` (0 en haut, 1 pour les colonnes de jeu).
  var serie = function (type, debut, nombre, rangee) {
    var piles = [];
    for (var i = 0; i < nombre; i++) piles.push({ type: type, col: debut + i, rangee: rangee, cartes: [] });
    return piles;
  };

  var cartesAlternees = function (a, b) { return b.rang === a.rang - 1 && estRouge(a) !== estRouge(b); };
  var memeCouleur = function (a, b) { return b.rang === a.rang - 1 && a.couleur === b.couleur; };

  // --- Règles de chaque jeu ---------------------------------------------------
  var JEUX = {
    solitaire: {
      colonnes: 7,
      optionDefaut: "1",
      suite: cartesAlternees,
      paquet: function () { return paquetSimple([0, 1, 2, 3], 1); },
      plan: function () {
        return serie("pioche", 0, 1, 0).concat(serie("defausse", 1, 1, 0),
          serie("fondation", 3, 4, 0), serie("tableau", 0, 7, 1));
      },
      distribuer: function (cartes) {
        pilesDe("tableau").forEach(function (pile, i) {
          for (var n = 0; n <= i; n++) {
            var c = cartes.pop();
            c.face = n === i;
            pile.cartes.push(c);
          }
        });
        pilesDe("pioche")[0].cartes = cartes;
      },
      surColonneVide: function (cartes) { return cartes[0].rang === 13; },
      piocher: function () {
        var pioche = pilesDe("pioche")[0], defausse = pilesDe("defausse")[0];
        if (!pioche.cartes.length && !defausse.cartes.length) return;
        memoriser();
        if (!pioche.cartes.length) {
          while (defausse.cartes.length) {
            var c = defausse.cartes.pop();
            c.face = false;
            pioche.cartes.push(c);
          }
          etat.fan = 0;
        } else {
          var n = Math.min(parseInt(option, 10), pioche.cartes.length);
          for (var i = 0; i < n; i++) {
            var carte = pioche.cartes.pop();
            carte.face = true;
            defausse.cartes.push(carte);
          }
          etat.fan = n;
        }
        etat.coups++;
      },
      infoPioche: function () { return pilesDe("pioche")[0].cartes.length; }
    },

    freecell: {
      colonnes: 8,
      suite: cartesAlternees,
      paquet: function () { return paquetSimple([0, 1, 2, 3], 1); },
      plan: function () {
        return serie("cellule", 0, 4, 0).concat(serie("fondation", 4, 4, 0), serie("tableau", 0, 8, 1));
      },
      distribuer: function (cartes) {
        var colonnes = pilesDe("tableau");
        cartes.forEach(function (c, i) {
          c.face = true;
          colonnes[i % 8].cartes.push(c);
        });
      },
      surColonneVide: function () { return true; },
      // Déplacer n cartes demande des cellules ou des colonnes vides intermédiaires.
      capacite: function (dest) {
        var cellules = pilesDe("cellule").filter(function (p) { return !p.cartes.length; }).length;
        var vides = pilesDe("tableau").filter(function (p) { return !p.cartes.length && p !== dest; }).length;
        return (cellules + 1) * Math.pow(2, vides);
      }
    },

    spider: {
      colonnes: 10,
      optionDefaut: "1",
      suite: memeCouleur,
      sansFondationManuelle: true,
      paquet: function (opt) {
        var couleurs = { "1": [0], "2": [0, 1], "4": [0, 1, 2, 3] }[opt] || [0];
        return paquetSimple(couleurs, 8 / couleurs.length);
      },
      plan: function () {
        return serie("pioche", 0, 1, 0).concat(serie("fondation", 2, 8, 0), serie("tableau", 0, 10, 1));
      },
      distribuer: function (cartes) {
        pilesDe("tableau").forEach(function (pile, i) {
          var nombre = i < 4 ? 6 : 5;
          for (var n = 0; n < nombre; n++) {
            var c = cartes.pop();
            c.face = n === nombre - 1;
            pile.cartes.push(c);
          }
        });
        pilesDe("pioche")[0].cartes = cartes;
      },
      surColonneVide: function () { return true; },
      posable: function (carte, dessous) { return dessous.rang === carte.rang + 1; },
      piocher: function () {
        var pioche = pilesDe("pioche")[0], colonnes = pilesDe("tableau");
        if (!pioche.cartes.length) return;
        if (colonnes.some(function (p) { return !p.cartes.length; })) {
          message = textes.colonneVide;
          return;
        }
        memoriser();
        colonnes.forEach(function (p) {
          var c = pioche.cartes.pop();
          c.face = true;
          p.cartes.push(c);
        });
        etat.coups++;
      },
      // Une suite complète du Roi à l'As part aux fondations.
      apresCoup: function () {
        pilesDe("tableau").forEach(function (p) {
          var n = p.cartes.length;
          if (n < 13 || !p.cartes[n - 1].face) return;
          for (var i = n - 1; i > n - 13; i--) {
            if (!p.cartes[i - 1].face || !memeCouleur(p.cartes[i - 1], p.cartes[i])) return;
          }
          if (p.cartes[n - 13].rang !== 13) return;
          var libre = pilesDe("fondation").filter(function (f) { return !f.cartes.length; })[0];
          libre.cartes = p.cartes.splice(n - 13, 13);
          if (p.cartes.length) sommet(p).face = true;
        });
      },
      infoPioche: function () { return Math.ceil(pilesDe("pioche")[0].cartes.length / 10); },
      gagne: function () {
        return pilesDe("fondation").every(function (f) { return f.cartes.length === 13; });
      }
    }
  };

  // --- État -------------------------------------------------------------------
  var plateau = document.querySelector(".plateau");
  var nomJeu = plateau.dataset.jeu;
  var jeu = JEUX[nomJeu];
  var textes = TEXTES[document.documentElement.lang] || TEXTES.fr;
  var CLE = "cartes-" + nomJeu;
  var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var statut = document.querySelector(".cartes-statut");
  var boutonAnnuler = document.querySelector(".cartes-annuler");
  var boutonRanger = document.querySelector(".cartes-ranger");

  var etat = { piles: [], fan: 0, coups: 0, finie: false };
  var option = jeu.optionDefaut || "";
  var victoires = 0;
  var cartes = [];       // toutes les cartes, chacune avec son bouton
  var historique = [];
  var selection = null;  // { pile, index }
  var message = "";

  var pilesDe = function (type) {
    return etat.piles.filter(function (p) { return p.type === type; });
  };

  var instantane = function () {
    return {
      piles: etat.piles.map(function (p) {
        return p.cartes.map(function (c) { return [c.id, c.face ? 1 : 0]; });
      }),
      fan: etat.fan,
      coups: etat.coups,
      finie: etat.finie
    };
  };

  var restaurer = function (s) {
    s.piles.forEach(function (liste, i) {
      etat.piles[i].cartes = liste.map(function (e) {
        var c = cartes[e[0]];
        c.face = !!e[1];
        return c;
      });
    });
    etat.fan = s.fan;
    etat.coups = s.coups;
    etat.finie = !!s.finie;
  };

  var memoriser = function () { historique.push(instantane()); };

  var enregistrer = function () {
    try {
      localStorage.setItem(CLE, JSON.stringify({ option: option, victoires: victoires, etat: instantane() }));
    } catch (e) { /* stockage indisponible : la partie n'est simplement pas mémorisée */ }
  };

  // --- Règles communes --------------------------------------------------------
  var peutPrendre = function (pile, index) {
    if (etat.finie || index < 0 || index >= pile.cartes.length) return false;
    if (pile.type === "pioche") return false;
    if (pile.type === "fondation") return !jeu.sansFondationManuelle && index === pile.cartes.length - 1;
    if (pile.type !== "tableau") return index === pile.cartes.length - 1;
    if (!pile.cartes[index].face) return false;
    for (var i = index; i < pile.cartes.length - 1; i++) {
      if (!jeu.suite(pile.cartes[i], pile.cartes[i + 1])) return false;
    }
    return true;
  };

  var peutPoser = function (lot, dest) {
    if (dest.type === "fondation") {
      if (jeu.sansFondationManuelle || lot.length !== 1) return false;
      var haut = sommet(dest);
      return haut ? haut.couleur === lot[0].couleur && haut.rang === lot[0].rang - 1 : lot[0].rang === 1;
    }
    if (dest.type === "cellule") return lot.length === 1 && !dest.cartes.length;
    if (dest.type !== "tableau") return false;
    if (jeu.capacite && lot.length > jeu.capacite(dest)) return false;
    var dessous = sommet(dest);
    if (!dessous) return jeu.surColonneVide(lot);
    if (!dessous.face) return false;
    return jeu.posable ? jeu.posable(lot[0], dessous) : jeu.suite(dessous, lot[0]);
  };

  // Retourne les cartes découvertes, puis applique la règle propre au jeu.
  var finirCoup = function () {
    pilesDe("tableau").forEach(function (p) {
      if (p.cartes.length) sommet(p).face = true;
    });
    if (jeu.apresCoup) jeu.apresCoup();
    var gagne = jeu.gagne ? jeu.gagne() : pilesDe("fondation").every(function (f) { return f.cartes.length === 13; });
    if (gagne && !etat.finie) {
      etat.finie = true;
      victoires++;
    }
  };

  var deplacer = function (source, index, dest) {
    var lot = source.cartes.splice(index);
    dest.cartes = dest.cartes.concat(lot);
    if (source.type === "defausse") etat.fan = source.cartes.length ? Math.max(1, etat.fan - 1) : 0;
    etat.coups++;
  };

  var tenter = function (source, index, dest) {
    if (source === dest || !peutPrendre(source, index)) return false;
    if (!peutPoser(source.cartes.slice(index), dest)) return false;
    memoriser();
    deplacer(source, index, dest);
    message = "";
    finirCoup();
    return true;
  };

  // Destination d'un double clic : fondation, colonne occupée, colonne vide, cellule.
  var meilleureDestination = function (source, index) {
    var lot = source.cartes.slice(index);
    var ok = function (p) { return p !== source && peutPoser(lot, p); };
    var occupees = pilesDe("tableau").filter(function (p) { return p.cartes.length && ok(p); });
    var memeSuite = occupees.filter(function (p) { return sommet(p).couleur === lot[0].couleur; });
    var fondation = source.type === "fondation" ? [] : pilesDe("fondation").filter(ok);
    var vides = pilesDe("tableau").filter(function (p) { return !p.cartes.length && ok(p); });
    return fondation.concat(memeSuite, occupees, vides, pilesDe("cellule").filter(ok))[0] || null;
  };

  // --- Affichage --------------------------------------------------------------
  var creerCarte = function (modele, id) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "carte" + (estRouge(modele) ? " rouge" : "");
    el.dataset.carte = id;
    var coin = document.createElement("span");
    coin.className = "carte-coin";
    coin.textContent = textes.rangs[modele.rang] + SYMBOLES[modele.couleur];
    var centre = document.createElement("span");
    centre.className = "carte-centre";
    centre.textContent = SYMBOLES[modele.couleur];
    el.appendChild(coin);
    el.appendChild(centre);
    return { id: id, couleur: modele.couleur, rang: modele.rang, face: false, el: el, x: 0, y: 0 };
  };

  var mesures = { l: 0, h: 0, ecart: 0, rangee1: 0 };

  var placer = function (animer) {
    var largeur = plateau.clientWidth;
    if (!largeur) return;   // onglet Règles affiché : on replacera au retour
    var n = jeu.colonnes;
    var ecart = Math.max(3, Math.round(largeur * 0.012));
    var l = Math.floor((largeur - ecart * (n - 1)) / n);
    var h = Math.round(l * 1.4);
    var rangee1 = h + ecart * 2;
    var coin = Math.max(10, l * 0.24);
    mesures = { l: l, h: h, ecart: ecart, rangee1: rangee1 };
    plateau.style.setProperty("--carte-l", l + "px");
    plateau.style.setProperty("--carte-h", h + "px");
    plateau.style.setProperty("--carte-coin", coin + "px");

    var pasCache = h * 0.1, pasVisible = Math.max(h * 0.26, coin * 1.2);
    var limite = Math.max(window.innerHeight - 40 - rangee1, h * 4);
    var bas = rangee1 + h * 3;
    var actif = document.activeElement;

    etat.piles.forEach(function (pile, numero) {
      var x = pile.col * (l + ecart), y = pile.rangee ? rangee1 : 0;
      pile.emplacement.style.transform = "translate(" + x + "px," + y + "px)";
      var vide = !pile.cartes.length;
      var actionnable = vide && pile.type !== "defausse" && pile.type !== "fondation";
      pile.emplacement.tabIndex = vide && (actionnable || selection) ? 0 : -1;
      plateau.appendChild(pile.emplacement);

      // Colonnes trop longues : on resserre les cartes, sans cacher le coin.
      var serrage = 1;
      if (pile.type === "tableau" && pile.cartes.length > 1) {
        var total = 0;
        pile.cartes.slice(0, -1).forEach(function (c) { total += c.face ? pasVisible : pasCache; });
        if (total + h > limite) {
          serrage = Math.max((limite - h) / total, Math.min(1, coin * 1.1 / pasVisible));
        }
      }

      var decalage = 0;
      pile.cartes.forEach(function (c, i) {
        var cx = x, cy = y;
        if (pile.type === "tableau") {
          cy = y + decalage;
          decalage += (c.face ? pasVisible : pasCache) * serrage;
        } else if (pile.type === "defausse") {
          cx = x + Math.max(0, i - (pile.cartes.length - etat.fan)) * l * 0.28;
        }
        var el = c.el;
        var prisable = peutPrendre(pile, i);
        var dernier = i === pile.cartes.length - 1;
        el.classList.toggle("retournee", !c.face);
        el.classList.toggle("prenable", prisable);
        el.classList.toggle("choisie", !!selection && selection.pile === numero && i >= selection.index);
        el.tabIndex = prisable || (dernier && (pile.type === "pioche" || c.face)) ? 0 : -1;
        el.setAttribute("aria-label", c.face
          ? textes.de(textes.noms[c.rang], textes.couleurs[c.couleur])
          : pile.type === "pioche" ? textes.pioche : textes.retournee);
        plateau.appendChild(el);

        var bouge = animer && !reduit && (c.x !== cx || c.y !== cy);
        var depart = "translate(" + c.x + "px," + c.y + "px)";
        var arrivee = "translate(" + cx + "px," + cy + "px)";
        el.style.transform = arrivee;
        if (bouge && el.animate) {
          el.style.zIndex = 50;
          el.animate([{ transform: depart }, { transform: arrivee }],
                     { duration: 170, easing: "ease-out" }).onfinish = function () { el.style.zIndex = ""; };
        }
        c.x = cx;
        c.y = cy;
        bas = Math.max(bas, cy + h);
      });
    });

    plateau.style.height = Math.ceil(bas + ecart) + "px";
    if (actif && actif !== document.body && plateau.contains(actif)) actif.focus({ preventScroll: true });
  };

  var afficherInfos = function () {
    statut.textContent = etat.finie ? textes.gagne : message;
    document.querySelectorAll("[data-info]").forEach(function (el) {
      var cle = el.dataset.info;
      el.textContent = cle === "coups" ? etat.coups
                     : cle === "victoires" ? victoires
                     : jeu.infoPioche ? jeu.infoPioche() : 0;
    });
    boutonAnnuler.disabled = !historique.length || etat.finie;
    if (boutonRanger) boutonRanger.disabled = etat.finie;
  };

  var rafraichir = function (animer) {
    placer(animer);
    afficherInfos();
    enregistrer();
  };

  // --- Actions ----------------------------------------------------------------
  var nouvellePartie = function () {
    etat.piles.forEach(function (p) { p.cartes = []; });
    etat.fan = 0;
    etat.coups = 0;
    etat.finie = false;
    historique = [];
    selection = null;
    message = "";
    var melange = melanger(cartes.slice());
    jeu.distribuer(melange);
    rafraichir(false);
  };

  var activer = function (numero, index) {
    var pile = etat.piles[numero];
    if (etat.finie) return;
    message = "";
    if (pile.type === "pioche") {
      selection = null;
      if (jeu.piocher) jeu.piocher();
      finirCoup();
      rafraichir(true);
      return;
    }
    if (selection) {
      var depuis = selection;
      selection = null;
      if (depuis.pile === numero && depuis.index === index) { rafraichir(false); return; }
      if (tenter(etat.piles[depuis.pile], depuis.index, pile)) { rafraichir(true); return; }
    }
    if (index >= 0 && peutPrendre(pile, index)) selection = { pile: numero, index: index };
    rafraichir(false);
  };

  var activerDouble = function (numero, index) {
    var pile = etat.piles[numero];
    selection = null;
    if (!peutPrendre(pile, index)) { rafraichir(false); return; }
    var dest = meilleureDestination(pile, index);
    if (dest) tenter(pile, index, dest);
    rafraichir(true);
  };

  // Envoie aux fondations tout ce qui peut y aller, en un seul coup à annuler.
  var ranger = function () {
    if (etat.finie) return;
    selection = null;
    var avant = instantane(), aBouge = true, total = 0;
    while (aBouge) {
      aBouge = false;
      etat.piles.forEach(function (p) {
        if (p.type === "fondation" || p.type === "pioche" || !p.cartes.length) return;
        var i = p.cartes.length - 1;
        if (!peutPrendre(p, i)) return;
        var f = pilesDe("fondation").filter(function (d) { return peutPoser([p.cartes[i]], d); })[0];
        if (f) {
          deplacer(p, i, f);
          finirCoup();
          aBouge = true;
          total++;
        }
      });
    }
    if (total) historique.push(avant);
    rafraichir(true);
  };

  var annuler = function () {
    if (!historique.length || etat.finie) return;
    selection = null;
    message = "";
    restaurer(historique.pop());
    rafraichir(true);
  };

  // --- Souris, doigt et clavier -----------------------------------------------
  var localiser = function (cible) {
    var el = cible.closest(".carte, .emplacement");
    if (!el) return null;
    if (el.dataset.pile !== undefined) return { pile: parseInt(el.dataset.pile, 10), index: -1, carte: null };
    var carte = cartes[parseInt(el.dataset.carte, 10)];
    for (var p = 0; p < etat.piles.length; p++) {
      var i = etat.piles[p].cartes.indexOf(carte);
      if (i >= 0) return { pile: p, index: i, carte: carte };
    }
    return null;
  };

  var pileSous = function (x, y) {
    var pas = mesures.l + mesures.ecart;
    var rangee = y < mesures.rangee1 - mesures.ecart / 2 ? 0 : 1;
    var col = Math.floor((x + mesures.ecart / 2) / pas);
    return etat.piles.filter(function (p) { return p.col === col && p.rangee === rangee; })[0] || null;
  };

  var appui = null, dernierClic = null;

  plateau.addEventListener("pointerdown", function (ev) {
    if (ev.button !== 0) return;
    var lieu = localiser(ev.target);
    if (!lieu) {
      if (selection) { selection = null; placer(false); }
      return;
    }
    appui = { x: ev.clientX, y: ev.clientY, lieu: lieu, glisse: false, lot: [], id: ev.pointerId };
    if (lieu.carte && peutPrendre(etat.piles[lieu.pile], lieu.index)) {
      appui.lot = etat.piles[lieu.pile].cartes.slice(lieu.index);
    }
  });

  plateau.addEventListener("pointermove", function (ev) {
    if (!appui || ev.pointerId !== appui.id || !appui.lot.length) return;
    var dx = ev.clientX - appui.x, dy = ev.clientY - appui.y;
    if (!appui.glisse) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      appui.glisse = true;
      selection = null;
      plateau.setPointerCapture(ev.pointerId);
      appui.lot.forEach(function (c) {
        c.el.getAnimations().forEach(function (a) { a.cancel(); });
        c.el.classList.remove("choisie");
        c.el.classList.add("glisse");
      });
    }
    appui.dx = dx;
    appui.dy = dy;
    appui.lot.forEach(function (c) {
      c.el.style.transform = "translate(" + (c.x + dx) + "px," + (c.y + dy) + "px)";
    });
  });

  var finGlissement = function (poser) {
    var a = appui;
    appui = null;
    a.lot.forEach(function (c) {
      c.el.classList.remove("glisse");
      // La carte repart de là où on l'a lâchée.
      c.x += a.dx || 0;
      c.y += a.dy || 0;
    });
    if (poser) {
      var meneuse = a.lot[0];
      var dest = pileSous(meneuse.x + mesures.l / 2, meneuse.y + mesures.h / 2);
      if (dest) tenter(etat.piles[a.lieu.pile], a.lieu.index, dest);
    }
    rafraichir(true);
  };

  plateau.addEventListener("pointerup", function (ev) {
    if (!appui || ev.pointerId !== appui.id) return;
    if (appui.glisse) { finGlissement(true); return; }
    var lieu = appui.lieu;
    appui = null;
    var maintenant = Date.now();
    var doubleClic = lieu.carte && dernierClic && dernierClic.carte === lieu.carte &&
                     maintenant - dernierClic.t < 350;
    dernierClic = doubleClic ? null : { carte: lieu.carte, t: maintenant };
    if (doubleClic && etat.piles[lieu.pile].type !== "pioche") activerDouble(lieu.pile, lieu.index);
    else activer(lieu.pile, lieu.index);
  });

  plateau.addEventListener("pointercancel", function (ev) {
    if (!appui || ev.pointerId !== appui.id) return;
    if (appui.glisse) finGlissement(false);
    else appui = null;
  });

  // Clavier : Entrée ou Espace déclenchent un clic sans position (detail 0).
  plateau.addEventListener("click", function (ev) {
    if (ev.detail !== 0) return;
    var lieu = localiser(ev.target);
    if (lieu) activer(lieu.pile, lieu.index);
  });

  // --- Mise en place ----------------------------------------------------------
  etat.piles = jeu.plan();
  etat.piles.forEach(function (pile, numero) {
    var el = document.createElement("button");
    el.type = "button";
    el.className = "emplacement emplacement-" + pile.type;
    el.dataset.pile = numero;
    el.setAttribute("aria-label", textes.emplacements[pile.type]);
    if (pile.type === "pioche" && nomJeu === "solitaire") el.textContent = "↻";
    if (pile.type === "fondation" && nomJeu !== "spider") el.textContent = "A";
    pile.emplacement = el;
    plateau.appendChild(el);
  });

  var charger = function () {
    try {
      var lu = JSON.parse(localStorage.getItem(CLE));
      if (!lu) return null;
      if (typeof lu.victoires === "number") victoires = lu.victoires;
      if (typeof lu.option === "string") option = lu.option;
      return lu.etat;
    } catch (e) { return null; }
  };

  var sauvegardeValide = function (s) {
    if (!s || !s.piles || s.piles.length !== etat.piles.length) return false;
    var vus = {}, total = 0;
    return s.piles.every(function (liste) {
      return liste.every(function (e) {
        total++;
        if (vus[e[0]] || !cartes[e[0]]) return false;
        vus[e[0]] = true;
        return true;
      });
    }) && total === cartes.length;
  };

  var choix = document.querySelectorAll('input[name="option"]');
  var sauvegarde = charger();
  if (choix.length && !Array.prototype.some.call(choix, function (r) { return r.value === option; })) {
    option = jeu.optionDefaut;
    sauvegarde = null;
  }
  jeu.paquet(option).forEach(function (modele, i) { cartes.push(creerCarte(modele, i)); });

  choix.forEach(function (radio) {
    radio.checked = radio.value === option;
    radio.addEventListener("change", function () {
      option = radio.value;
      cartes.forEach(function (c) { c.el.remove(); });
      cartes = [];
      jeu.paquet(option).forEach(function (modele, i) { cartes.push(creerCarte(modele, i)); });
      nouvellePartie();
    });
  });

  document.querySelector(".cartes-nouvelle").addEventListener("click", nouvellePartie);
  boutonAnnuler.addEventListener("click", annuler);
  if (boutonRanger) boutonRanger.addEventListener("click", ranger);

  // Onglets Jeu / Règles.
  var onglets = document.querySelectorAll('.onglets [role="tab"]');
  onglets.forEach(function (onglet) {
    onglet.addEventListener("click", function () {
      onglets.forEach(function (o) {
        var actif = o === onglet;
        o.setAttribute("aria-selected", actif ? "true" : "false");
        document.getElementById(o.getAttribute("aria-controls")).hidden = !actif;
      });
      placer(false);
    });
  });

  if (window.ResizeObserver) new ResizeObserver(function () { placer(false); }).observe(plateau);
  else window.addEventListener("resize", function () { placer(false); });

  if (sauvegardeValide(sauvegarde)) {
    restaurer(sauvegarde);
    rafraichir(false);
  } else {
    nouvellePartie();
  }
})();
