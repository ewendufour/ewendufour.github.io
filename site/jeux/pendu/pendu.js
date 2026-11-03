// Pendu : deviner un mot lettre par lettre, avec droit à sept erreurs.
// La partie et les scores sont mémorisés par langue.
// Les couleurs viennent des variables du thème, voir style.css.
(function () {
  var TEXTES = {
    fr: {
      reste: function (n) { return n > 1 ? "Encore " + n + " erreurs permises." : "Dernière erreur permise !"; },
      gagne: "Bravo, tu as trouvé le mot !",
      perdu: function (m) { return "Perdu, le mot était " + m + "."; },
      mot: function (m) { return "Mot : " + m; },
      inconnue: "lettre inconnue"
    },
    en: {
      reste: function (n) { return n > 1 ? n + " mistakes left." : "One mistake left!"; },
      gagne: "Well done, you found the word!",
      perdu: function (m) { return "You lost, the word was " + m + "."; },
      mot: function (m) { return "Word: " + m; },
      inconnue: "unknown letter"
    }
  };
  var MAX_ERREURS = 7;

  var outils = window.JeuxMots;
  var textes = TEXTES[outils.langue];
  var CLE = "pendu-" + outils.langue;

  var motEl = document.querySelector(".pendu-mot");
  var statut = document.querySelector(".mots-statut");
  var traits = document.querySelectorAll(".pendu-dessin [data-erreur]");

  var mot = "", lettres = [], victoires = 0, defaites = 0;

  var erreurs = function () {
    return lettres.filter(function (l) { return mot.indexOf(l) < 0; }).length;
  };

  var trouve = function () {
    return mot.split("").every(function (l) { return lettres.indexOf(l) >= 0; });
  };

  var finie = function () { return trouve() || erreurs() >= MAX_ERREURS; };

  var enregistrer = function () {
    try {
      localStorage.setItem(CLE, JSON.stringify({
        mot: mot, lettres: lettres, victoires: victoires, defaites: defaites
      }));
    } catch (e) { /* stockage indisponible : la partie n'est simplement pas mémorisée */ }
  };

  var dessiner = function () {
    var fin = finie(), n = erreurs();
    motEl.innerHTML = "";
    mot.split("").forEach(function (l) {
      var c = document.createElement("span");
      c.className = "pendu-lettre";
      var connue = lettres.indexOf(l) >= 0;
      if (connue || fin) c.textContent = l;
      if (!connue && fin) c.classList.add("manquee");
      c.setAttribute("role", "img");
      c.setAttribute("aria-label", connue || fin ? l : textes.inconnue);
      motEl.appendChild(c);
    });

    traits.forEach(function (t) {
      t.classList.toggle("visible", parseInt(t.dataset.erreur, 10) <= n);
    });

    Object.keys(touches).forEach(function (l) {
      var t = touches[l], jouee = lettres.indexOf(l) >= 0;
      if (jouee) t.dataset.etat = mot.indexOf(l) >= 0 ? "place" : "absent";
      else delete t.dataset.etat;
      t.disabled = jouee || fin;
    });

    statut.textContent = trouve() ? textes.gagne
                       : fin ? textes.perdu(mot)
                       : textes.reste(MAX_ERREURS - n);
    document.querySelector('[data-info="victoires"]').textContent = victoires;
    document.querySelector('[data-info="defaites"]').textContent = defaites;
  };

  var jouer = function (l) {
    if (finie() || lettres.indexOf(l) >= 0) return;
    lettres.push(l);
    if (trouve()) victoires++;
    else if (erreurs() >= MAX_ERREURS) defaites++;
    enregistrer();
    dessiner();
  };

  var nouvellePartie = function () {
    mot = outils.tirer();
    lettres = [];
    enregistrer();
    dessiner();
  };

  var touches = outils.clavier(document.querySelector(".clavier"), jouer);

  document.addEventListener("keydown", function (ev) {
    if (ev.target.closest("select, a") || document.getElementById("panneau-jeu").hidden) return;
    var l = outils.lettre(ev);
    if (l) jouer(l);
  });

  document.querySelector(".mots-nouvelle").addEventListener("click", nouvellePartie);

  var partie = null;
  try { partie = JSON.parse(localStorage.getItem(CLE)); }
  catch (e) { /* stockage indisponible ou illisible : on repart de zéro */ }

  if (partie) {
    if (typeof partie.victoires === "number") victoires = partie.victoires;
    if (typeof partie.defaites === "number") defaites = partie.defaites;
  }
  if (partie && typeof partie.mot === "string" && partie.mot && Array.isArray(partie.lettres)) {
    mot = partie.mot;
    lettres = partie.lettres;
    dessiner();
  } else {
    nouvellePartie();
  }
})();
