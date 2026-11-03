// Démineur : interface. Les règles et le générateur sont dans moteur.js.
// La grille n'est créée qu'au premier clic, pour qu'il soit toujours sûr.
// Commandes : clic gauche pour ouvrir, clic droit pour marquer, deux boutons (ou
// clic simple) sur un chiffre pour ouvrir ses voisines ; au clavier, Entrée et
// Espace agissent sur la case survolée, F2 relance, + et - zooment, H conseille.
// Les couleurs viennent des variables du thème, voir style.css.
(function () {
  var TEXTES = {
    fr: {
      tailles: { debutant: "Débutant (9 × 9, 10 mines)", intermediaire: "Intermédiaire (16 × 16, 40 mines)",
                 avance: "Avancé (30 × 16, 99 mines)", surhomme: "Surhomme (50 × 50, 500 mines)",
                 extra: "Extraterrestre (100 × 100, 2000 mines)", perso: "Paramètres personnalisés" },
      taillesCourt: { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé",
                      surhomme: "Surhomme", extra: "Extraterrestre", perso: "Personnalisé" },
      formes: { carre: "Carrés", hexa: "Hexagones" },
      surfaces: { plan: "Plan", cylindre: "Cylindre", tore: "Tore", mobius: "Ruban de Möbius", klein: "Bouteille de Klein" },
      voisinages: { normal: "Cases voisines", cavalier: "Saut du cavalier",
                    croix: "Croix (4 cases)", etoile: "Étoile", anneau: "Anneau lointain", haut: "Regard vers le haut",
                    etendu: "Deux couronnes" },
      mines: { simples: "Simples", doubles: "Simples et doubles", triples: "Jusqu'aux triples",
               anti: "Simples et anti-mines", tout: "Tous les types" },
      noms: { "1": "simples", "2": "doubles", "3": "triples", "-1": "anti" },
      pret: "Clique où tu veux : ton premier coup est toujours sûr.",
      generation: "Génération d'une grille sans hasard…",
      essais: function (n) { return "Génération d'une grille sans hasard… (essai " + n + ")"; },
      echec: "Aucune grille sans hasard trouvée à temps. Clique pour réessayer, ou réduis le nombre de mines.",
      enCours: "Tout se déduit : aucun coup de chance n'est nécessaire.",
      gagne: function (t) { return "Bravo, grille terminée en " + t + " !"; },
      perdu: "Boum ! Cette grille pouvait être résolue par la logique.",
      cri: "EXPLOSION !",
      rejouer: "Rejouer",
      conseil: "Conseil : la case en surbrillance est sûre. Cette partie ne comptera pas dans les statistiques.",
      sansConseil: "Pas de conseil possible pour l'instant.",
      caseFermee: "fermée", drapeauSur: "drapeau", question: "point d'interrogation", mine: "mine",
      ligne: function (l, c) { return "Ligne " + l + ", colonne " + c; },
      hauteurPaire: "Le tore hexagonal demande un nombre pair de rangées : une rangée a été ajoutée.",
      statsVide: "–"
    },
    en: {
      tailles: { debutant: "Beginner (9 × 9, 10 mines)", intermediaire: "Intermediate (16 × 16, 40 mines)",
                 avance: "Expert (30 × 16, 99 mines)", surhomme: "Superhuman (50 × 50, 500 mines)",
                 extra: "Extraterrestrial (100 × 100, 2000 mines)", perso: "Custom settings" },
      taillesCourt: { debutant: "Beginner", intermediaire: "Intermediate", avance: "Expert",
                      surhomme: "Superhuman", extra: "Extraterrestrial", perso: "Custom" },
      formes: { carre: "Squares", hexa: "Hexagons" },
      surfaces: { plan: "Flat", cylindre: "Cylinder", tore: "Torus", mobius: "Möbius strip", klein: "Klein bottle" },
      voisinages: { normal: "Neighbouring cells", cavalier: "Knight's move",
                    croix: "Cross (4 cells)", etoile: "Star", anneau: "Far ring", haut: "Looking up",
                    etendu: "Two rings" },
      mines: { simples: "Single", doubles: "Single and double", triples: "Up to triple",
               anti: "Single and anti-mines", tout: "All types" },
      noms: { "1": "single", "2": "double", "3": "triple", "-1": "anti" },
      pret: "Click anywhere: your first move is always safe.",
      generation: "Generating a grid with no luck involved…",
      essais: function (n) { return "Generating a grid with no luck involved… (try " + n + ")"; },
      echec: "No luck-free grid found in time. Click to try again, or lower the number of mines.",
      enCours: "Everything can be deduced: no lucky guess is ever needed.",
      gagne: function (t) { return "Well done, grid cleared in " + t + "!"; },
      perdu: "Boom! This grid could have been solved by logic.",
      cri: "EXPLOSION!",
      rejouer: "Play again",
      conseil: "Hint: the highlighted cell is safe. This game will not count in the statistics.",
      sansConseil: "No hint available right now.",
      caseFermee: "closed", drapeauSur: "flag", question: "question mark", mine: "mine",
      ligne: function (l, c) { return "Row " + l + ", column " + c; },
      hauteurPaire: "A hexagonal torus needs an even number of rows: one row was added.",
      statsVide: "–"
    }
  };
  var TAILLES = { debutant: [9, 9, 10], intermediaire: [16, 16, 40], avance: [30, 16, 99],
                  surhomme: [50, 50, 500], extra: [100, 100, 2000] };
  var SYMBOLE = { "1": "●", "2": "●●", "3": "●●●", "-1": "○" };
  var QUESTION = 9;     // marque « ? » : ne compte pas comme un drapeau
  var CLE = "demineur";
  var BUDGET = 25000;
  var CASE_BASE = 30;   // taille d'une case à 100 % de zoom

  var textes = TEXTES[document.documentElement.lang] || TEXTES.fr;
  var el = function (s) { return document.querySelector(s); };
  var zone = el(".dem-zone"), plateau = el(".dem-plateau"), statut = el(".dem-statut");
  var cadre = el(".dem-cadre");
  var champs = {
    taille: el("#dem-taille"), forme: el("#dem-forme"), surface: el("#dem-surface"),
    voisinage: el("#dem-voisinage"), mines: el("#dem-mines"),
    largeur: el("#dem-largeur"), hauteur: el("#dem-hauteur"), nb: el("#dem-nb"),
    questions: el("#dem-questions"), inverser: el("#dem-inverser"), zoom: el("#dem-zoom")
  };
  var dialogueOptions = el("#dem-options"), dialogueStats = el("#dem-stats");
  var compteurs = el(".dem-compteurs");

  var reglages = { taille: "debutant", forme: "carre", surface: "plan", voisinage: "normal",
                   mines: "simples", largeur: 20, hauteur: 20, nbMines: 60,
                   questions: true, inverser: false, zoom: 100 };
  var stats = {}, tailleCase = CASE_BASE;
  var cfg, grille, cases = [], valeurs = null, ouvert, drapeaux, phase = "attente";
  var ecoule = 0, departChrono = 0, minuterie = null, travailleur = null;
  var message = "", depuisAppui = false, focusCase = 0, explosee = -1, assiste = false;
  var survol = -1, accordA = 0, caseConseil = -1;

  var remplir = function (select, options, valeur) {
    select.innerHTML = "";
    Object.keys(options).forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = options[k];
      select.appendChild(o);
    });
    select.value = options[valeur] ? valeur : Object.keys(options)[0];
  };

  var filtrer = function (source, cles) {
    var r = {};
    cles.forEach(function (k) { r[k] = source[k]; });
    return r;
  };

  // Le dialogue s'adapte à ce qui y est choisi : pas de Möbius en hexagones, par exemple.
  var majDialogue = function () {
    var hexa = champs.forme.value === "hexa";
    remplir(champs.surface, filtrer(textes.surfaces, hexa ? ["plan", "cylindre", "tore"] : ["plan", "cylindre", "tore", "mobius", "klein"]), champs.surface.value);
    remplir(champs.voisinage, filtrer(textes.voisinages, hexa ? ["normal", "etendu", "anneau"] : ["normal", "cavalier", "croix", "etoile", "anneau", "haut"]), champs.voisinage.value);
    var haut = champs.voisinage.value === "haut";
    if (haut) champs.surface.value = "tore";
    champs.surface.disabled = haut;
    el(".dem-perso").hidden = champs.taille.value !== "perso";
  };

  var remplirDialogue = function () {
    champs.taille.value = reglages.taille;
    champs.forme.value = reglages.forme;
    champs.mines.value = reglages.mines;
    remplir(champs.surface, textes.surfaces, reglages.surface);
    remplir(champs.voisinage, textes.voisinages, reglages.voisinage);
    champs.largeur.value = reglages.largeur;
    champs.hauteur.value = reglages.hauteur;
    champs.nb.value = reglages.nbMines;
    champs.questions.checked = reglages.questions;
    champs.inverser.checked = reglages.inverser;
    champs.zoom.value = reglages.zoom;
    majDialogue();
  };

  var borne = function (v, min, max, def) {
    var n = parseInt(v, 10);
    return isNaN(n) ? def : Math.max(min, Math.min(max, n));
  };

  var lireDialogue = function () {
    var r = { taille: champs.taille.value, forme: champs.forme.value, surface: champs.surface.value,
              voisinage: champs.voisinage.value, mines: champs.mines.value,
              questions: champs.questions.checked, inverser: champs.inverser.checked,
              zoom: borne(champs.zoom.value, 50, 200, 100) };
    r.largeur = borne(champs.largeur.value, 5, 100, 20);
    r.hauteur = borne(champs.hauteur.value, 5, 100, 20);
    var plafond = Math.floor(r.largeur * r.hauteur * Demineur.DENSITE_MAX);
    r.nbMines = borne(champs.nb.value, 1, plafond, Math.min(60, plafond));
    return r;
  };

  var dimensions = function () {
    var t = TAILLES[reglages.taille];
    return t ? { largeur: t[0], hauteur: t[1], nbMines: t[2] }
             : { largeur: reglages.largeur, hauteur: reglages.hauteur, nbMines: reglages.nbMines };
  };

  var configuration = function () {
    var d = dimensions();
    return Demineur.normaliser({
      largeur: d.largeur, hauteur: d.hauteur, nbMines: d.nbMines, forme: reglages.forme,
      surface: reglages.surface, voisinage: reglages.voisinage, mines: reglages.mines
    });
  };

  // Les statistiques sont propres à chaque jeu de règles.
  var cleRegles = function () {
    return [cfg.forme, cfg.surface, cfg.voisinage, cfg.mines].join("|");
  };

  var statsCourantes = function () {
    var r = stats[cleRegles()] = stats[cleRegles()] || {};
    return r[reglages.taille] = r[reglages.taille] || { gagnees: 0, perdues: 0, abandons: 0, meilleur: null, date: null };
  };

  // --- Dessin -----------------------------------------------------------------
  var positionner = function () {
    var t = tailleCase, hexa = cfg.forme === "hexa";
    var hauteurCase = hexa ? Math.round(t * 1.1547) : t;
    var pasY = hexa ? t * 0.866 : t;
    var bords = cfg.surface === "plan" ? 2 : 22;
    plateau.style.setProperty("--t", t + "px");
    plateau.style.setProperty("--th", hauteurCase + "px");
    cases.forEach(function (b, i) {
      var x = i % cfg.largeur, y = Math.floor(i / cfg.largeur);
      b.style.left = bords + x * t + (hexa && y % 2 ? t / 2 : 0) + "px";
      b.style.top = bords + y * pasY + "px";
    });
    var l = bords * 2 + cfg.largeur * t + (hexa ? t / 2 : 0);
    var h = bords * 2 + (cfg.hauteur - 1) * pasY + hauteurCase;
    plateau.style.width = l + "px";
    plateau.style.height = Math.ceil(h) + "px";
    plateau.querySelectorAll(".dem-repere").forEach(function (r) {
      var a = parseInt(r.dataset.a, 10), cote = r.dataset.cote;
      if (cote === "g" || cote === "d") {
        r.style.left = (cote === "g" ? 0 : l - bords) + "px";
        r.style.top = bords + a * pasY + "px";
        r.style.height = hauteurCase + "px";
      } else {
        r.style.top = (cote === "h" ? 0 : h - bords) + "px";
        r.style.left = bords + a * t + "px";
        r.style.width = t + "px";
      }
    });
  };

  var appliquerZoom = function () {
    tailleCase = Math.max(12, Math.round(CASE_BASE * reglages.zoom / 100));
    positionner();
  };

  // Repères sur les bords raccordés : deux numéros égaux sont la même rangée.
  var creerReperes = function () {
    var ajouter = function (cote, a, texte) {
      var s = document.createElement("span");
      s.className = "dem-repere dem-repere-" + cote;
      s.dataset.cote = cote;
      s.dataset.a = a;
      s.textContent = texte;
      s.setAttribute("aria-hidden", "true");
      plateau.appendChild(s);
    };
    var i, x = cfg.surface !== "plan", y = cfg.surface === "tore" || cfg.surface === "klein";
    var inverse = cfg.surface === "mobius" || cfg.surface === "klein";
    if (x) {
      for (i = 0; i < cfg.hauteur; i++) {
        ajouter("g", i, i + 1);
        ajouter("d", i, inverse ? cfg.hauteur - i : i + 1);
      }
    }
    if (y) {
      for (i = 0; i < cfg.largeur; i++) {
        ajouter("h", i, i + 1);
        ajouter("b", i, i + 1);
      }
    }
  };

  var libelle = function (i, texte) {
    return textes.ligne(Math.floor(i / cfg.largeur) + 1, i % cfg.largeur + 1) + " : " + texte;
  };

  var construire = function () {
    cfg = configuration();
    grille = Demineur.creerGrille(cfg);
    plateau.innerHTML = "";
    plateau.dataset.forme = cfg.forme;
    cases = [];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < grille.n; i++) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "dem-case";
      b.dataset.i = i;
      b.dataset.etat = "fermee";
      b.tabIndex = i === 0 ? 0 : -1;
      b.setAttribute("aria-label", libelle(i, textes.caseFermee));
      frag.appendChild(b);
      cases.push(b);
    }
    plateau.appendChild(frag);
    creerReperes();
    appliquerZoom();
    ouvert = new Uint8Array(grille.n);
    drapeaux = new Int8Array(grille.n);
    focusCase = 0;
    survol = -1;
    caseConseil = -1;
  };

  var peindre = function (i) {
    var b = cases[i];
    b.classList.toggle("conseil", i === caseConseil);
    if (ouvert[i]) {
      if (valeurs[i]) {
        b.dataset.etat = i === explosee ? "explosee" : "mine";
        b.textContent = SYMBOLE[valeurs[i]];
        b.setAttribute("aria-label", libelle(i, textes.mine));
        return;
      }
      var ch = Demineur.chiffres(grille, valeurs, i);
      b.dataset.etat = "ouverte";
      var n = ch[0], videe = Demineur.estVide(grille, valeurs, i);
      b.dataset.teinte = n < 0 ? 5 : Math.min(n, 4);
      b.textContent = videe ? "" : String(n).replace("-", "−");
      b.setAttribute("aria-label", libelle(i, videe ? "0" : String(n)));
      return;
    }
    var d = drapeaux[i];
    if (d === QUESTION) {
      b.dataset.etat = "question";
      b.textContent = "?";
      b.setAttribute("aria-label", libelle(i, textes.question));
    } else if (d) {
      var fausse = phase === "perdu" && valeurs && valeurs[i] !== d;
      b.dataset.etat = fausse ? "faux" : "drapeau";
      b.textContent = "⚑︎" + (d === 1 ? "" : d === -1 ? "−" : d);
      b.setAttribute("aria-label", libelle(i, textes.drapeauSur + " " + textes.noms[d]));
    } else if (phase === "perdu" && valeurs && valeurs[i]) {
      b.dataset.etat = "mine";
      b.textContent = SYMBOLE[valeurs[i]];
      b.setAttribute("aria-label", libelle(i, textes.mine));
    } else {
      b.dataset.etat = "fermee";
      b.textContent = "";
      b.setAttribute("aria-label", libelle(i, textes.caseFermee));
    }
  };

  var formatTemps = function (s) {
    var m = Math.floor(s / 60);
    return (m < 10 ? "0" : "") + m + ":" + (s % 60 < 10 ? "0" : "") + (s % 60);
  };

  var tempsTotal = function () {
    return phase === "jeu" ? ecoule + Math.floor((Date.now() - departChrono) / 1000) : ecoule;
  };

  var majTemps = function () {
    el('[data-info="temps"]').textContent = formatTemps(tempsTotal());
  };

  var majInfos = function () {
    var parts = Demineur.repartition(cfg), poses = {}, totalDrapeaux = 0, fermees = 0, i;
    for (i = 0; i < grille.n; i++) {
      var d = drapeaux[i];
      if (d && d !== QUESTION) { poses[d] = (poses[d] || 0) + 1; totalDrapeaux++; }
      if (!ouvert[i]) fermees++;
    }
    el('[data-info="mines"]').textContent = cfg.nbMines - totalDrapeaux;
    el('[data-info="cases"]').textContent = Math.max(0, fermees - cfg.nbMines);
    compteurs.innerHTML = "";
    var sortes = Object.keys(parts);
    if (sortes.length > 1) {
      sortes.sort(function (a, b) { return Math.abs(a) - Math.abs(b) || a - b; }).forEach(function (k) {
        var s = document.createElement("span");
        s.className = "dem-compteur";
        s.textContent = SYMBOLE[k] + " " + (parts[k] - (poses[k] || 0));
        s.title = textes.noms[k];
        compteurs.appendChild(s);
      });
    }
    statut.textContent = message;
    majTemps();
  };

  var enregistrer = function () {
    var partie = null;
    if (phase === "jeu") {
      partie = { valeurs: valeurs, ouvert: Array.prototype.join.call(ouvert, ""),
                 drapeaux: Array.prototype.slice.call(drapeaux),
                 ecoule: tempsTotal(), assiste: assiste };
    }
    try {
      localStorage.setItem(CLE, JSON.stringify({ reglages: reglages, stats: stats, partie: partie }));
    } catch (e) { /* stockage indisponible ou plein : la partie n'est simplement pas mémorisée */ }
  };

  // --- Partie -----------------------------------------------------------------
  var arreterChrono = function () {
    if (minuterie !== null) { clearInterval(minuterie); minuterie = null; }
  };

  var demarrerChrono = function () {
    departChrono = Date.now();
    arreterChrono();
    minuterie = setInterval(majTemps, 1000);
  };

  var nouvelle = function () {
    if (travailleur) { travailleur.terminate(); travailleur = null; }
    if (phase === "jeu" && !assiste) statsCourantes().abandons++;
    window.AnimationDefaite.arreter();
    arreterChrono();
    phase = "attente";
    valeurs = null;
    ecoule = 0;
    explosee = -1;
    assiste = false;
    construire();
    message = textes.pret;
    if (cfg.hauteur !== dimensions().hauteur) message += " " + textes.hauteurPaire;
    majInfos();
    enregistrer();
  };

  var finir = function (gagne) {
    ecoule = tempsTotal();
    arreterChrono();
    phase = gagne ? "gagne" : "perdu";
    message = gagne ? textes.gagne(formatTemps(ecoule)) : textes.perdu;
    if (!assiste) {
      var s = statsCourantes();
      if (gagne) {
        s.gagnees++;
        if (s.meilleur === null || ecoule < s.meilleur) {
          s.meilleur = ecoule;
          s.date = new Date().toLocaleDateString(document.documentElement.lang);
        }
      } else {
        s.perdues++;
      }
    }
    caseConseil = -1;
    for (var i = 0; i < grille.n; i++) {
      if (gagne && valeurs[i] && (!drapeaux[i] || drapeaux[i] === QUESTION)) drapeaux[i] = valeurs[i];
      peindre(i);
    }
    majInfos();
    enregistrer();
    if (!gagne) {
      window.AnimationDefaite.jouer(cadre, {
        cri: textes.cri, rejouer: textes.rejouer, surRejouer: nouvelle, caseEl: cases[explosee]
      });
    }
  };

  var ouvrirDepuis = function (depart) {
    if (valeurs[depart]) {
      ouvert[depart] = 1;
      explosee = depart;
      finir(false);
      return;
    }
    if (caseConseil >= 0) {
      var ancien = caseConseil;
      caseConseil = -1;
      peindre(ancien);
    }
    var pile = [depart];
    while (pile.length) {
      var c = pile.pop();
      if (ouvert[c] || valeurs[c]) continue;
      ouvert[c] = 1;
      drapeaux[c] = 0;
      peindre(c);
      if (Demineur.estVide(grille, valeurs, c)) {
        grille.groupes[c].forEach(function (g) {
          g.cases.forEach(function (v) { if (!ouvert[v]) pile.push(v); });
        });
      }
    }
    for (var i = 0; i < grille.n; i++) if (!valeurs[i] && !ouvert[i]) return;
    finir(true);
  };

  var appliquerGrille = function (resultat, depart) {
    valeurs = resultat.valeurs;
    phase = "jeu";
    message = textes.enCours;
    ecoule = 0;
    demarrerChrono();
    ouvrirDepuis(depart);
    if (phase === "jeu") {
      majInfos();
      enregistrer();
    }
  };

  var echecGeneration = function () {
    phase = "attente";
    message = textes.echec;
    majInfos();
  };

  var genererPuisOuvrir = function (depart) {
    phase = "generation";
    message = textes.generation;
    majInfos();
    var demande = { largeur: cfg.largeur, hauteur: cfg.hauteur, nbMines: cfg.nbMines, forme: cfg.forme,
                    surface: cfg.surface, voisinage: cfg.voisinage, mines: cfg.mines };
    var surFin = function (r) {
      if (r.reussi) appliquerGrille(r, depart);
      else echecGeneration();
    };
    try {
      travailleur = new Worker(el('script[src*="moteur.js"]').src);
      travailleur.onmessage = function (ev) {
        if (ev.data.type === "progres") {
          statut.textContent = textes.essais(ev.data.essais);
          return;
        }
        travailleur.terminate();
        travailleur = null;
        surFin(ev.data.resultat);
      };
      travailleur.onerror = function () {
        if (travailleur) travailleur.terminate();
        travailleur = null;
        surFin(Demineur.generer(demande, depart, BUDGET));
      };
      travailleur.postMessage({ reglages: demande, depart: depart, budget: BUDGET });
    } catch (e) {
      // Sans Worker (fichier ouvert en local) : génération sur la page.
      setTimeout(function () { surFin(Demineur.generer(demande, depart, BUDGET)); }, 20);
    }
  };

  // Ouvre les voisines d'un chiffre entouré d'assez de drapeaux.
  var accord = function (i) {
    if (phase !== "jeu" || !ouvert[i] || valeurs[i]) return;
    var ch = Demineur.chiffres(grille, valeurs, i);
    var pret = grille.groupes[i].every(function (g, q) {
      var s = 0;
      g.cases.forEach(function (v, r) {
        if (drapeaux[v] !== QUESTION) s += g.poids[r] * drapeaux[v];
      });
      return s === ch[q];
    });
    if (!pret) return;
    grille.groupes[i].forEach(function (g) {
      g.cases.forEach(function (v) {
        if (phase === "jeu" && (!drapeaux[v] || drapeaux[v] === QUESTION) && !ouvert[v]) ouvrirDepuis(v);
      });
    });
    if (phase === "jeu") { majInfos(); enregistrer(); }
  };

  var creuser = function (i) {
    if (phase === "generation" || phase === "gagne" || phase === "perdu") return;
    if (drapeaux[i] && drapeaux[i] !== QUESTION) return;
    if (phase === "attente") {
      genererPuisOuvrir(i);
      return;
    }
    if (ouvert[i]) {
      accord(i);
      return;
    }
    ouvrirDepuis(i);
    if (phase === "jeu") { majInfos(); enregistrer(); }
  };

  var marquer = function (i) {
    if (phase !== "jeu" && phase !== "attente") return;
    if (ouvert[i]) return;
    var sorte = [0].concat(Object.keys(Demineur.repartition(cfg)).map(Number)
      .sort(function (a, b) { return (a < 0 ? 9 : a) - (b < 0 ? 9 : b); }));
    if (reglages.questions) sorte.push(QUESTION);
    drapeaux[i] = sorte[(sorte.indexOf(drapeaux[i]) + 1) % sorte.length];
    peindre(i);
    majInfos();
    enregistrer();
  };

  var conseiller = function () {
    if (phase !== "jeu") return;
    assiste = true;
    var c = Demineur.conseil(grille, valeurs, ouvert);
    message = c >= 0 ? textes.conseil : textes.sansConseil;
    var ancien = caseConseil;
    caseConseil = c;
    if (ancien >= 0) peindre(ancien);
    if (c >= 0) {
      peindre(c);
      cases[c].scrollIntoView({ block: "nearest", inline: "nearest" });
    }
    majInfos();
    enregistrer();
  };

  var zoomer = function (pas) {
    reglages.zoom = Math.max(50, Math.min(200, reglages.zoom + pas));
    appliquerZoom();
    enregistrer();
  };

  // --- Souris, doigt et clavier -----------------------------------------------
  var caseDe = function (cible) {
    var b = cible.closest && cible.closest(".dem-case");
    return b ? parseInt(b.dataset.i, 10) : -1;
  };

  var actionPrincipale = function (i) { if (reglages.inverser) marquer(i); else creuser(i); };
  var actionSecondaire = function (i) { if (reglages.inverser) creuser(i); else marquer(i); };

  var appuiLong = null;
  plateau.addEventListener("pointerdown", function (ev) {
    var i = caseDe(ev.target);
    if (i < 0) return;
    // Les deux boutons à la fois sur un chiffre : ouvre ses voisines.
    if (ev.pointerType === "mouse" && ev.buttons === 3) {
      accordA = Date.now();
      accord(i);
      return;
    }
    if (ev.pointerType !== "touch") return;
    depuisAppui = false;
    appuiLong = setTimeout(function () {
      depuisAppui = true;
      actionSecondaire(i);
    }, 420);
  });
  plateau.addEventListener("mousedown", function (ev) {
    var i = caseDe(ev.target);
    if (i >= 0 && ev.buttons === 3) {
      accordA = Date.now();
      accord(i);
    }
  });
  ["pointerup", "pointercancel", "pointermove"].forEach(function (type) {
    plateau.addEventListener(type, function (ev) {
      if (type === "pointermove" && Math.abs(ev.movementX) + Math.abs(ev.movementY) < 4) return;
      if (appuiLong !== null) { clearTimeout(appuiLong); appuiLong = null; }
    });
  });

  plateau.addEventListener("pointerover", function (ev) {
    if (ev.pointerType === "touch") return;
    survol = caseDe(ev.target);
  });
  plateau.addEventListener("pointerleave", function () { survol = -1; });

  plateau.addEventListener("click", function (ev) {
    var i = caseDe(ev.target);
    if (i < 0 || Date.now() - accordA < 500) return;
    if (depuisAppui) { depuisAppui = false; return; }
    actionPrincipale(i);
  });

  plateau.addEventListener("contextmenu", function (ev) {
    var i = caseDe(ev.target);
    if (i < 0) return;
    ev.preventDefault();
    if (Date.now() - accordA < 500) return;
    actionSecondaire(i);
  });

  plateau.addEventListener("focusin", function (ev) {
    var i = caseDe(ev.target);
    if (i < 0) return;
    cases[focusCase].tabIndex = -1;
    focusCase = i;
    cases[i].tabIndex = 0;
  });

  document.addEventListener("keydown", function (ev) {
    if (dialogueOptions.open || dialogueStats.open || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === "F2") {
      ev.preventDefault();
      nouvelle();
      return;
    }
    if (document.getElementById("panneau-jeu").hidden) return;
    if (ev.target.closest("select, input, a, .palette")) return;
    if (ev.key === "+" || ev.key === "=") { zoomer(10); return; }
    if (ev.key === "-") { zoomer(-10); return; }
    if (ev.key === "h" || ev.key === "H") { conseiller(); return; }

    var surCase = caseDe(ev.target);
    var i = survol >= 0 ? survol : surCase;
    if (i < 0) return;
    if (ev.key === "Enter") {
      ev.preventDefault();
      creuser(i);
    } else if (ev.key === " ") {
      ev.preventDefault();
      if (ouvert[i]) accord(i);
      else marquer(i);
    } else if (surCase >= 0) {
      if (ev.key === "f" || ev.key === "F") {
        ev.preventDefault();
        marquer(surCase);
        return;
      }
      var pas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[ev.key];
      if (!pas) return;
      ev.preventDefault();
      var x = surCase % cfg.largeur + pas[0], y = Math.floor(surCase / cfg.largeur) + pas[1];
      if (x >= 0 && x < cfg.largeur && y >= 0 && y < cfg.hauteur) cases[y * cfg.largeur + x].focus();
    }
  });

  // --- Menus ------------------------------------------------------------------
  el(".dem-nouvelle").addEventListener("click", nouvelle);
  el(".dem-conseil").addEventListener("click", conseiller);
  el(".dem-aide").addEventListener("click", function () {
    document.querySelector('[aria-controls="panneau-regles"]').click();
  });

  el(".dem-ouvrir-options").addEventListener("click", function () {
    remplirDialogue();
    dialogueOptions.showModal();
  });
  ["taille", "forme", "voisinage"].forEach(function (k) {
    champs[k].addEventListener("change", majDialogue);
  });
  el(".dem-options-annuler").addEventListener("click", function () { dialogueOptions.close(); });
  el(".dem-options-ok").addEventListener("click", function () {
    var r = lireDialogue();
    var regleDeJeu = ["taille", "forme", "surface", "voisinage", "mines"].concat(
      r.taille === "perso" ? ["largeur", "hauteur", "nbMines"] : []);
    var change = regleDeJeu.some(function (k) { return r[k] !== reglages[k]; });
    Object.keys(r).forEach(function (k) { reglages[k] = r[k]; });
    dialogueOptions.close();
    if (change) nouvelle();
    else {
      appliquerZoom();
      enregistrer();
    }
  });

  var afficherStats = function () {
    var corps = el(".dem-stats-corps");
    corps.innerHTML = "";
    var r = stats[cleRegles()] || {};
    Object.keys(textes.taillesCourt).forEach(function (t) {
      var s = r[t] || {}, tr = document.createElement("tr");
      [textes.taillesCourt[t], s.gagnees || 0, s.perdues || 0, s.abandons || 0,
       s.meilleur === null || s.meilleur === undefined ? textes.statsVide : formatTemps(s.meilleur),
       s.date || textes.statsVide].forEach(function (v) {
        var td = document.createElement("td");
        td.textContent = v;
        tr.appendChild(td);
      });
      corps.appendChild(tr);
    });
  };
  el(".dem-ouvrir-stats").addEventListener("click", function () {
    afficherStats();
    dialogueStats.showModal();
  });
  el(".dem-stats-fermer").addEventListener("click", function () { dialogueStats.close(); });
  el(".dem-stats-effacer").addEventListener("click", function () {
    delete stats[cleRegles()];
    enregistrer();
    afficherStats();
  });

  // --- Mise en place ----------------------------------------------------------
  var partie = null;
  try {
    var lu = JSON.parse(localStorage.getItem(CLE));
    if (lu) {
      if (lu.stats) stats = lu.stats;
      if (lu.reglages) Object.keys(reglages).forEach(function (k) {
        if (lu.reglages[k] !== undefined) reglages[k] = lu.reglages[k];
      });
      partie = lu.partie;
    }
  } catch (e) { /* stockage indisponible ou illisible : on repart de zéro */ }

  remplir(champs.taille, textes.tailles, reglages.taille);
  remplir(champs.forme, textes.formes, reglages.forme);
  remplir(champs.mines, textes.mines, reglages.mines);
  remplirDialogue();

  construire();
  if (partie && partie.valeurs && partie.valeurs.length === grille.n && partie.ouvert.length === grille.n) {
    valeurs = partie.valeurs;
    for (var i = 0; i < grille.n; i++) {
      ouvert[i] = partie.ouvert.charCodeAt(i) === 49 ? 1 : 0;
      drapeaux[i] = partie.drapeaux[i] || 0;
    }
    phase = "jeu";
    ecoule = partie.ecoule || 0;
    assiste = !!partie.assiste;
    message = textes.enCours;
    for (i = 0; i < grille.n; i++) if (ouvert[i] || drapeaux[i]) peindre(i);
    demarrerChrono();
  } else {
    message = textes.pret;
  }
  majInfos();
})();
