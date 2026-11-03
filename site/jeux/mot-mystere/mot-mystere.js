// Mot mystère : deviner un mot de 5, 6 ou 7 lettres, avec un essai de plus que
// de lettres. Chaque essai indique les lettres bien placées, mal placées ou
// absentes. Un essai absent du dictionnaire (dico-fr.js, dico-en.js) est refusé
// sans coûter d'essai. La partie et les scores sont mémorisés par langue.
// Les couleurs viennent des variables du thème, voir style.css.
(function () {
  var TEXTES = {
    fr: {
      essais: function (n) { return n > 1 ? "Encore " + n + " essais." : "Dernier essai !"; },
      court: function (n) { return "Il faut " + n + " lettres."; },
      inconnu: "Ce mot n'est pas dans le dictionnaire.",
      gagne: function (n) { return n > 1 ? "Bravo, trouvé en " + n + " essais !" : "Bravo, trouvé du premier coup !"; },
      perdu: function (m) { return "Perdu, le mot était " + m + "."; },
      effacer: "Effacer", valider: "Valider",
      etats: { place: "bien placée", present: "mal placée", absent: "absente" }
    },
    en: {
      essais: function (n) { return n > 1 ? n + " guesses left." : "Last guess!"; },
      court: function (n) { return "You need " + n + " letters."; },
      inconnu: "That word is not in the dictionary.",
      gagne: function (n) { return n > 1 ? "Well done, found in " + n + " guesses!" : "Well done, first try!"; },
      perdu: function (m) { return "You lost, the word was " + m + "."; },
      effacer: "Delete", valider: "Enter",
      etats: { place: "right spot", present: "wrong spot", absent: "not in the word" }
    }
  };

  // --- Règle ------------------------------------------------------------------
  // Une lettre répétée n'est signalée qu'autant de fois qu'elle est dans le mot.
  var evaluer = function (mot, essai) {
    var resultat = [], reste = {}, i;
    for (i = 0; i < mot.length; i++) {
      if (essai[i] === mot[i]) resultat[i] = "place";
      else reste[mot[i]] = (reste[mot[i]] || 0) + 1;
    }
    for (i = 0; i < mot.length; i++) {
      if (resultat[i]) continue;
      if (reste[essai[i]]) {
        resultat[i] = "present";
        reste[essai[i]]--;
      } else {
        resultat[i] = "absent";
      }
    }
    return resultat;
  };

  // Recherche par dichotomie dans les mots collés et triés du dictionnaire.
  // Si le dictionnaire n'a pas pu être chargé, on ne bloque pas la partie.
  var existe = function (essai) {
    var dico = window.DICTIONNAIRE;
    if (!dico) return true;
    var n = essai.length, bloc = dico[n];
    var bas = 0, haut = bloc.length / n - 1;
    while (bas <= haut) {
      var milieu = (bas + haut) >> 1;
      var m = bloc.substr(milieu * n, n);
      if (m === essai) return true;
      if (m < essai) bas = milieu + 1;
      else haut = milieu - 1;
    }
    return false;
  };

  // --- Interface --------------------------------------------------------------
  var outils = window.JeuxMots;
  var textes = TEXTES[outils.langue];
  var CLE = "mot-mystere-" + outils.langue;
  var RANG = { absent: 1, present: 2, place: 3 };

  var grille = document.querySelector(".mots-grille");
  var statut = document.querySelector(".mots-statut");
  var choix = document.querySelectorAll('input[name="option"]');

  var longueur = 5, mot = "", essais = [], saisie = "", finie = false, message = "";
  var victoires = 0, defaites = 0;

  var maxEssais = function () { return longueur + 1; };

  var enregistrer = function () {
    try {
      localStorage.setItem(CLE, JSON.stringify({
        longueur: longueur, mot: mot, essais: essais, saisie: saisie,
        victoires: victoires, defaites: defaites
      }));
    } catch (e) { /* stockage indisponible : la partie n'est simplement pas mémorisée */ }
  };

  var dessiner = function () {
    grille.innerHTML = "";
    grille.style.setProperty("--lettres", longueur);
    for (var e = 0; e < maxEssais(); e++) {
      var essai = essais[e] || (e === essais.length && !finie ? saisie : "");
      var etats = essais[e] ? evaluer(mot, essai) : null;
      var ligne = document.createElement("div");
      ligne.className = "mots-ligne";
      for (var i = 0; i < longueur; i++) {
        var c = document.createElement("span");
        c.className = "mots-case";
        c.textContent = essai[i] || "";
        if (etats) {
          c.dataset.etat = etats[i];
          c.setAttribute("role", "img");
          c.setAttribute("aria-label", essai[i] + " : " + textes.etats[etats[i]]);
        } else if (essai[i]) {
          c.dataset.etat = "saisie";
        }
        ligne.appendChild(c);
      }
      grille.appendChild(ligne);
    }

    Object.keys(touches).forEach(function (l) { delete touches[l].dataset.etat; });
    essais.forEach(function (essai) {
      evaluer(mot, essai).forEach(function (etat, i) {
        var t = touches[essai[i]];
        if (!t.dataset.etat || RANG[etat] > RANG[t.dataset.etat]) t.dataset.etat = etat;
      });
    });

    statut.textContent = message;
    document.querySelector('[data-info="victoires"]').textContent = victoires;
    document.querySelector('[data-info="defaites"]').textContent = defaites;
  };

  var ajouter = function (l) {
    if (finie || saisie.length >= longueur) return;
    saisie += l;
    message = "";
    enregistrer();
    dessiner();
  };

  var effacer = function () {
    if (finie || !saisie.length) return;
    saisie = saisie.slice(0, -1);
    message = "";
    enregistrer();
    dessiner();
  };

  var valider = function () {
    if (finie) return;
    if (saisie.length < longueur) {
      message = textes.court(longueur);
      dessiner();
      return;
    }
    if (saisie !== mot && !existe(saisie)) {
      message = textes.inconnu;
      dessiner();
      return;
    }
    essais.push(saisie);
    var trouve = saisie === mot;
    saisie = "";
    if (trouve) {
      finie = true;
      victoires++;
      message = textes.gagne(essais.length);
    } else if (essais.length >= maxEssais()) {
      finie = true;
      defaites++;
      message = textes.perdu(mot);
    } else {
      message = textes.essais(maxEssais() - essais.length);
    }
    enregistrer();
    dessiner();
  };

  var nouvellePartie = function () {
    mot = outils.tirer(longueur);
    essais = [];
    saisie = "";
    finie = false;
    message = textes.essais(maxEssais());
    enregistrer();
    dessiner();
  };

  var touches = outils.clavier(document.querySelector(".clavier"), ajouter, {
    gauche: { texte: "⏎", nom: textes.valider, action: valider },
    droite: { texte: "⌫", nom: textes.effacer, action: effacer }
  });

  document.addEventListener("keydown", function (ev) {
    // Les réglages de la page gardent leurs touches, et l'onglet Règles n'écrit pas.
    if (ev.target.closest("select, a") || document.getElementById("panneau-jeu").hidden) return;
    if (ev.key === "Enter") {
      // Sur un bouton encore actif, Entrée l'actionne, sauf si un mot est en cours.
      if (ev.target.closest(".touche") || (ev.target.closest("button") && !saisie)) return;
      ev.preventDefault();
      valider();
    } else if (ev.key === "Backspace") {
      ev.preventDefault();
      effacer();
    } else {
      var l = outils.lettre(ev);
      if (l) ajouter(l);
    }
  });

  document.querySelector(".mots-nouvelle").addEventListener("click", nouvellePartie);

  choix.forEach(function (radio) {
    radio.addEventListener("change", function () {
      longueur = parseInt(radio.value, 10);
      nouvellePartie();
    });
  });

  var partie = null;
  try { partie = JSON.parse(localStorage.getItem(CLE)); }
  catch (e) { /* stockage indisponible ou illisible : on repart de zéro */ }

  if (partie) {
    if (typeof partie.victoires === "number") victoires = partie.victoires;
    if (typeof partie.defaites === "number") defaites = partie.defaites;
  }
  if (partie && [5, 6, 7].indexOf(partie.longueur) >= 0 && typeof partie.mot === "string" &&
      partie.mot.length === partie.longueur && Array.isArray(partie.essais)) {
    longueur = partie.longueur;
    mot = partie.mot;
    essais = partie.essais;
    saisie = partie.saisie || "";
    var dernier = essais[essais.length - 1];
    finie = dernier === mot || essais.length >= maxEssais();
    message = dernier === mot ? textes.gagne(essais.length)
            : finie ? textes.perdu(mot)
            : textes.essais(maxEssais() - essais.length);
    dessiner();
  } else {
    nouvellePartie();
  }
  choix.forEach(function (radio) { radio.checked = parseInt(radio.value, 10) === longueur; });
})();
