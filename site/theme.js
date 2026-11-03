// Mode néon (mémorisé dans le navigateur) et interrupteur de langue animé.
//
// Au changement de langue, deux informations passent dans l'adresse :
//   ?theme=neon|normal : en local (file://), chaque page a son propre
//                        stockage, le réglage serait sinon perdu ;
//   &palette=…         : palette néon choisie (violet, vert, orange, bleu) ;
//   &pos=i:f           : section affichée (indice i, -1 pour l'en-tête) et
//                        proportion f déjà parcourue, pour retrouver le même
//                        endroit dans l'autre langue (les textes n'ont pas la
//                        même longueur, d'où une proportion et non des pixels).
// Le thème est lu par le script en tête de page, avant l'affichage. Les deux
// paramètres sont ensuite retirés de l'adresse pour la garder propre.
(function () {
  var racine = document.documentElement;
  var langue = document.querySelector(".langue");
  var bouton = document.querySelector(".neon-btn");
  var palette = document.querySelector(".palette");
  var sections = document.querySelectorAll("main section");
  var neon = function () { return racine.dataset.theme === "neon"; };

  // --- Position dans la page ----------------------------------------------

  // Bornes [haut, bas] de chaque zone : l'en-tête (-1) puis chaque section.
  var zones = function () {
    var y = window.scrollY, liste = [];
    var haut = 0;
    for (var i = 0; i < sections.length; i++) {
      var r = sections[i].getBoundingClientRect();
      liste.push({ i: i - 1, haut: haut, bas: r.top + y });
      haut = r.top + y;
    }
    liste.push({ i: sections.length - 1, haut: haut,
                 bas: Math.max(haut + 1, document.documentElement.scrollHeight) });
    return liste;
  };

  var positionCourante = function () {
    var y = window.scrollY;
    if (y <= 0) return null;
    var z = zones();
    for (var k = z.length - 1; k >= 0; k--) {
      if (y >= z[k].haut) {
        var f = (y - z[k].haut) / Math.max(1, z[k].bas - z[k].haut);
        return z[k].i + ":" + f.toFixed(4);
      }
    }
    return null;
  };

  var allerA = function (pos) {
    var m = /^(-?\d+):([\d.]+)$/.exec(pos || "");
    if (!m) return null;
    var i = parseInt(m[1], 10), f = parseFloat(m[2]);
    var z = zones();
    for (var k = 0; k < z.length; k++) {
      if (z[k].i === i) {
        var cible = Math.round(z[k].haut + f * (z[k].bas - z[k].haut));
        window.scrollTo({ top: cible, behavior: "instant" });
        return window.scrollY;
      }
    }
    return null;
  };

  // --- Lecture puis nettoyage des paramètres d'adresse --------------------
  var posArrivee = null;
  try {
    var url = new URL(window.location.href);
    posArrivee = url.searchParams.get("pos");
    if (url.searchParams.has("theme") || url.searchParams.has("pos") || url.searchParams.has("palette")) {
      url.searchParams.delete("theme");
      url.searchParams.delete("pos");
      url.searchParams.delete("palette");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  } catch (e) { /* navigateur ancien : sans conséquence */ }

  if (posArrivee) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    var posee = allerA(posArrivee);
    // Les polices peuvent décaler la mise en page : on réajuste une fois au
    // chargement complet, sauf si le visiteur a déjà fait défiler la page.
    window.addEventListener("load", function () {
      if (posee === null || Math.abs(window.scrollY - posee) < 2) allerA(posArrivee);
    });
  }

  // --- Mode néon ---------------------------------------------------------
  var majBouton = function () {
    if (bouton) bouton.setAttribute("aria-pressed", neon() ? "true" : "false");
  };

  if (bouton) {
    bouton.addEventListener("click", function () {
      if (neon()) delete racine.dataset.theme;
      else racine.dataset.theme = "neon";
      try {
        if (neon()) localStorage.setItem("theme", "neon");
        else localStorage.removeItem("theme");
      } catch (e) { /* stockage indisponible : le choix n'est simplement pas mémorisé */ }
      majBouton();
    });
  }
  majBouton();

  // --- Palette du mode néon (volet déroulant) -----------------------------
  var paletteCourante = function () { return racine.dataset.palette || "violet"; };
  if (palette) {
    palette.value = paletteCourante();
    palette.addEventListener("change", function () {
      if (palette.value === "violet") delete racine.dataset.palette;
      else racine.dataset.palette = palette.value;
      try { localStorage.setItem("palette", palette.value); } catch (e) { /* non mémorisé */ }
    });
  }

  // --- Interrupteur FR / EN ------------------------------------------------
  if (langue) {
    var base = langue.getAttribute("href").split("?")[0];
    var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var initiale = langue.dataset.pos;

    // Adresse de l'autre langue, avec le thème et la position courants.
    var majLien = function () {
      var p = positionCourante();
      langue.setAttribute("href", base + "?theme=" + (neon() ? "neon" : "normal") +
                                   "&palette=" + paletteCourante() +
                                   (p ? "&pos=" + p : ""));
    };

    // Mise à jour juste avant usage (clic, clic milieu, menu contextuel, clavier).
    ["pointerdown", "focus", "contextmenu"].forEach(function (ev) {
      langue.addEventListener(ev, majLien);
    });

    // Retour arrière (cache du navigateur) : remettre le curseur en place.
    window.addEventListener("pageshow", function () { langue.dataset.pos = initiale; });

    langue.addEventListener("click", function (ev) {
      majLien();
      if (reduit || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      // Fait glisser le curseur avant de changer de page.
      ev.preventDefault();
      langue.dataset.pos = langue.dataset.pos === "gauche" ? "droite" : "gauche";
      var cible = langue.href;
      setTimeout(function () { window.location.href = cible; }, 220);
    });
  }
})();
