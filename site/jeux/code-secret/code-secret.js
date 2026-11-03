// Code secret : retrouver une combinaison de couleurs tirée par l'ordinateur.
// Chaque essai indique combien de pions sont bien placés et combien sont
// présents ailleurs. La partie et les scores sont mémorisés dans le navigateur.
// Les couleurs viennent de variables de style.css ; chaque pion a aussi un
// symbole, pour ne pas dépendre de la seule couleur.
(function () {
  var TEXTES = {
    fr: {
      noms: ["rouge", "bleu", "vert", "jaune", "violet", "orange", "cyan", "rose"],
      essais: function (n) { return n > 1 ? "Encore " + n + " essais." : "Dernier essai !"; },
      incomplet: "Remplis toutes les positions.",
      gagne: function (n) { return n > 1 ? "Bravo, code trouvé en " + n + " essais !" : "Bravo, trouvé du premier coup !"; },
      perdu: "Perdu : voici le code.",
      vide: "vide",
      resultat: function (b, m) { return b + " bien placés, " + m + " mal placés"; },
      effacer: "Effacer"
    },
    en: {
      noms: ["red", "blue", "green", "yellow", "purple", "orange", "cyan", "pink"],
      essais: function (n) { return n > 1 ? n + " guesses left." : "Last guess!"; },
      incomplet: "Fill every position.",
      gagne: function (n) { return n > 1 ? "Well done, code found in " + n + " guesses!" : "Well done, first try!"; },
      perdu: "You lost: here is the code.",
      vide: "empty",
      resultat: function (b, m) { return b + " in the right spot, " + m + " in the wrong spot"; },
      effacer: "Delete"
    }
  };
  var SYMBOLES = ["●", "▲", "■", "◆", "★", "✚", "⬟", "♥"];
  var MAX_ESSAIS = 10;
  var CLE = "code-secret";

  // --- Règle ------------------------------------------------------------------
  // Un pion répété n'est compté qu'autant de fois qu'il est dans le code.
  var evaluer = function (code, essai) {
    var bien = 0, restant = {}, i;
    for (i = 0; i < code.length; i++) {
      if (code[i] === essai[i]) bien++;
      else restant[code[i]] = (restant[code[i]] || 0) + 1;
    }
    var mal = 0;
    for (i = 0; i < code.length; i++) {
      if (code[i] !== essai[i] && restant[essai[i]]) {
        mal++;
        restant[essai[i]]--;
      }
    }
    return { bien: bien, mal: mal };
  };

  // --- Interface --------------------------------------------------------------
  var textes = TEXTES[document.documentElement.lang] || TEXTES.fr;
  var el = function (s) { return document.querySelector(s); };
  var grille = el(".code-grille"), statut = el(".code-statut");
  var palette = el(".code-palette"), solution = el(".code-solution");
  var boutonValider = el(".code-valider");

  var positions = 4, couleurs = 6, code = [], essais = [], saisie = [], finie = false;
  var message = "", victoires = 0, defaites = 0;

  var enregistrer = function () {
    try {
      localStorage.setItem(CLE, JSON.stringify({ positions: positions, couleurs: couleurs, code: code,
        essais: essais, saisie: saisie, victoires: victoires, defaites: defaites }));
    } catch (e) { /* stockage indisponible : la partie n'est simplement pas mémorisée */ }
  };

  var creerPion = function (valeur, classe) {
    var p = document.createElement("span");
    p.className = "code-pion " + (classe || "");
    if (valeur === undefined || valeur === null) {
      p.dataset.vide = "1";
      p.setAttribute("aria-label", textes.vide);
    } else {
      p.dataset.couleur = valeur;
      p.textContent = SYMBOLES[valeur];
      p.setAttribute("aria-label", textes.noms[valeur]);
    }
    p.setAttribute("role", "img");
    return p;
  };

  var dessinerPalette = function () {
    palette.innerHTML = "";
    for (var c = 0; c < couleurs; c++) {
      (function (valeur) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "code-pion code-choix";
        b.dataset.couleur = valeur;
        b.textContent = SYMBOLES[valeur];
        b.setAttribute("aria-label", textes.noms[valeur]);
        b.addEventListener("click", function () { ajouter(valeur); });
        palette.appendChild(b);
      })(c);
    }
    var eff = document.createElement("button");
    eff.type = "button";
    eff.className = "bouton code-effacer";
    eff.textContent = "⌫";
    eff.setAttribute("aria-label", textes.effacer);
    eff.addEventListener("click", effacer);
    palette.appendChild(eff);
  };

  var dessiner = function () {
    grille.innerHTML = "";
    for (var e = 0; e < MAX_ESSAIS; e++) {
      var ligne = document.createElement("div");
      ligne.className = "code-ligne";
      var joue = essais[e];
      var courant = !joue && e === essais.length && !finie;
      if (courant) ligne.classList.add("courante");
      var pions = document.createElement("div");
      pions.className = "code-pions";
      for (var i = 0; i < positions; i++) {
        pions.appendChild(creerPion(joue ? joue[i] : courant ? saisie[i] : null));
      }
      ligne.appendChild(pions);

      var indices = document.createElement("div");
      indices.className = "code-indices";
      indices.style.setProperty("--positions", positions);
      if (joue) {
        var r = evaluer(code, joue);
        indices.setAttribute("role", "img");
        indices.setAttribute("aria-label", textes.resultat(r.bien, r.mal));
        for (var b = 0; b < positions; b++) {
          var point = document.createElement("span");
          point.className = "code-indice " + (b < r.bien ? "bien" : b < r.bien + r.mal ? "mal" : "");
          indices.appendChild(point);
        }
      }
      ligne.appendChild(indices);
      grille.appendChild(ligne);
    }

    solution.innerHTML = "";
    if (finie) code.forEach(function (c) { solution.appendChild(creerPion(c)); });
    solution.hidden = !finie;
    palette.hidden = finie;
    boutonValider.hidden = finie;
    statut.textContent = message;
    el('[data-info="victoires"]').textContent = victoires;
    el('[data-info="defaites"]').textContent = defaites;
  };

  var ajouter = function (valeur) {
    if (finie || saisie.length >= positions) return;
    saisie.push(valeur);
    message = textes.essais(MAX_ESSAIS - essais.length);
    enregistrer();
    dessiner();
  };

  var effacer = function () {
    if (finie || !saisie.length) return;
    saisie.pop();
    enregistrer();
    dessiner();
  };

  var valider = function () {
    if (finie) return;
    if (saisie.length < positions) {
      message = textes.incomplet;
      dessiner();
      return;
    }
    essais.push(saisie);
    saisie = [];
    if (evaluer(code, essais[essais.length - 1]).bien === positions) {
      finie = true;
      victoires++;
      message = textes.gagne(essais.length);
    } else if (essais.length >= MAX_ESSAIS) {
      finie = true;
      defaites++;
      message = textes.perdu;
    } else {
      message = textes.essais(MAX_ESSAIS - essais.length);
    }
    enregistrer();
    dessiner();
  };

  var nouvelle = function () {
    code = [];
    for (var i = 0; i < positions; i++) code.push(Math.floor(Math.random() * couleurs));
    essais = [];
    saisie = [];
    finie = false;
    message = textes.essais(MAX_ESSAIS);
    dessinerPalette();
    enregistrer();
    dessiner();
  };

  boutonValider.addEventListener("click", valider);
  el(".code-nouvelle").addEventListener("click", nouvelle);

  var radios = function (nom) { return document.querySelectorAll('input[name="' + nom + '"]'); };
  radios("positions").forEach(function (r) {
    r.addEventListener("change", function () { positions = parseInt(r.value, 10); nouvelle(); });
  });
  radios("couleurs").forEach(function (r) {
    r.addEventListener("change", function () { couleurs = parseInt(r.value, 10); nouvelle(); });
  });

  // Clavier : chiffres pour les couleurs, Retour arrière et Entrée.
  document.addEventListener("keydown", function (ev) {
    if (ev.ctrlKey || ev.metaKey || ev.altKey || document.getElementById("panneau-jeu").hidden) return;
    if (ev.target.closest("select, a, input")) return;
    var n = parseInt(ev.key, 10);
    if (n >= 1 && n <= couleurs) ajouter(n - 1);
    else if (ev.key === "Backspace") { ev.preventDefault(); effacer(); }
    else if (ev.key === "Enter" && !ev.target.closest("button")) { ev.preventDefault(); valider(); }
  });

  var partie = null;
  try { partie = JSON.parse(localStorage.getItem(CLE)); }
  catch (e) { /* stockage indisponible ou illisible : on repart de zéro */ }
  if (partie) {
    if (typeof partie.victoires === "number") victoires = partie.victoires;
    if (typeof partie.defaites === "number") defaites = partie.defaites;
  }
  if (partie && [4, 5].indexOf(partie.positions) >= 0 && [6, 8].indexOf(partie.couleurs) >= 0 &&
      Array.isArray(partie.code) && partie.code.length === partie.positions && Array.isArray(partie.essais)) {
    positions = partie.positions;
    couleurs = partie.couleurs;
    code = partie.code;
    essais = partie.essais;
    saisie = partie.saisie || [];
    var dernier = essais[essais.length - 1];
    var trouve = dernier && evaluer(code, dernier).bien === positions;
    finie = trouve || essais.length >= MAX_ESSAIS;
    message = trouve ? textes.gagne(essais.length) : finie ? textes.perdu : textes.essais(MAX_ESSAIS - essais.length);
    dessinerPalette();
    dessiner();
  } else {
    nouvelle();
  }
  radios("positions").forEach(function (r) { r.checked = parseInt(r.value, 10) === positions; });
  radios("couleurs").forEach(function (r) { r.checked = parseInt(r.value, 10) === couleurs; });
})();
