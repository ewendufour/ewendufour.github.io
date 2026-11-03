// Outils communs aux jeux de mots : listes de mots et clavier à l'écran.
// Les mots sont en majuscules et sans accents.
window.JeuxMots = (function () {
  var MOTS = {
    fr: "ARBRE BALLE BATON BIERE BLANC BOIRE BOITE BRUME CANOE CARTE CHAMP CHANT CHIEN COEUR CORDE COURS CRANE CREME DANSE DOIGT DRAME ECOLE FABLE FARCE FERME FLEUR FORCE FORET FRAIS FRUIT GALET GARDE GLACE GRAIN GRAND HERBE HIVER HOMME IMAGE JAUNE JOUET LAMPE LAPIN LIVRE LOUPE LUNDI MAGIE MARDI MERLE METRE MONDE MOTIF MUSEE NEIGE NUAGE OCEAN OMBRE ONCLE ORAGE PATTE PECHE PERLE PIANO PLAGE PLUIE POEME POIRE POMME PORTE POULE PRUNE RADIO REINE ROBOT ROUGE ROUTE SABLE SAUCE SINGE SUCRE TABLE TARTE TEMPS TIGRE TITRE TRAIN TUILE USINE VAGUE VALSE VERRE VILLE VOILE ZEBRE " +
        "AVOCAT BALLON BATEAU BOUGIE BOUTON BUREAU CADEAU CAHIER CAMION CANARD CASTOR CHEVAL CITRON COCHON CRAYON DESSIN DRAGON ETOILE FOUDRE GATEAU GIRAFE JARDIN JOUEUR LEGUME LIMACE MAISON MENTHE MIROIR MOUTON MUSCLE NAVIRE NUMERO OISEAU ORANGE PAPIER PARFUM PIERRE PIRATE PLANTE RAISIN RENARD REQUIN RIVAGE SAPHIR SOLEIL SOURIS TOMATE TORTUE TRESOR VISAGE VOLCAN VOYAGE " +
        "ABEILLE BALEINE CAROTTE CERVEAU CHAPEAU CHARBON CHATEAU CONCERT COULEUR COUTEAU CUISINE DAUPHIN ECHELLE FAMILLE FANTOME FENETRE FROMAGE GUITARE HORLOGE JOURNAL LUMIERE MARTEAU MUSIQUE PEINTRE PLANETE POISSON POMPIER RIVIERE SERPENT SILENCE SOURIRE TABLEAU TEMPETE TRAVAIL VILLAGE VOITURE " +
        "AVENTURE DENTELLE ECUREUIL ELEPHANT FONTAINE HISTOIRE LANTERNE MONTAGNE PAPILLON PINGOUIN SANGLIER TRIANGLE VAISSEAU BOUTEILLE PRINTEMPS TROMPETTE",
    en: "APPLE BEACH BREAD BRICK BROWN CANDY CHAIR CHALK CLOUD COAST CRANE DANCE DREAM EARTH FENCE FIELD FLAME FLOOR FRUIT GHOST GLASS GRAPE GREEN HEART HORSE HOUSE JUICE KNIFE LEMON LIGHT MAGIC MONEY MOUSE MUSIC NIGHT OCEAN PAPER PEACH PIANO PLANE PLANT RADIO RIVER ROBOT SHEEP SHIRT SMILE SNAKE SPOON STONE STORM SUGAR TABLE TIGER TOWER TRAIN WATER WHALE WORLD ZEBRA " +
        "ANCHOR BANANA BASKET BOTTLE BRIDGE BUTTER CAMERA CANDLE CASTLE CHEESE CIRCLE COOKIE DRAGON FLOWER FOREST GARDEN GUITAR HAMMER ISLAND JACKET JUNGLE KITTEN LADDER MARKET MIRROR MONKEY ORANGE PALACE PEPPER PLANET POCKET PRINCE PURPLE RABBIT ROCKET SHADOW SILVER SPIDER SQUARE SUMMER TICKET TOMATO TUNNEL TURTLE VALLEY WINDOW WINTER " +
        "BALLOON BLANKET CABBAGE CAPTAIN CHICKEN COMPASS COUNTRY CRYSTAL DIAMOND DOLPHIN FACTORY FEATHER FREEDOM HARVEST HISTORY JOURNEY KITCHEN LANTERN LIBRARY MACHINE MORNING MYSTERY NETWORK PAINTER PENGUIN PICTURE PYRAMID RAINBOW SCIENCE STATION TEACHER THUNDER TRUMPET VILLAGE VOLCANO WEATHER " +
        "COMPUTER DAUGHTER ELEPHANT FOOTBALL HOSPITAL MOUNTAIN NOTEBOOK SANDWICH TREASURE TRIANGLE UMBRELLA BUTTERFLY CHOCOLATE"
  };

  var RANGEES = {
    fr: ["AZERTYUIOP", "QSDFGHJKLM", "WXCVBN"],
    en: ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"]
  };

  var langue = document.documentElement.lang === "en" ? "en" : "fr";

  return {
    langue: langue,

    // Mots de la langue de la page, éventuellement d'une seule longueur.
    tirer: function (longueur) {
      var liste = MOTS[langue].split(" ").filter(function (m) {
        return !longueur || m.length === longueur;
      });
      return liste[Math.floor(Math.random() * liste.length)];
    },

    // Lettre A-Z d'un évènement clavier (accents retirés), ou null.
    lettre: function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.key.length !== 1) return null;
      var l = ev.key.normalize("NFD").charAt(0).toUpperCase();
      return /^[A-Z]$/.test(l) ? l : null;
    },

    // Construit le clavier ; renvoie ses touches, indexées par lettre.
    clavier: function (el, surLettre, extremites) {
      var touches = {};
      RANGEES[langue].forEach(function (rangee, numero) {
        var ligne = document.createElement("div");
        ligne.className = "clavier-rangee";
        var ajouter = function (spec) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "touche touche-large";
          b.textContent = spec.texte;
          b.setAttribute("aria-label", spec.nom);
          b.addEventListener("click", function (ev) {
            if (ev.detail) b.blur();   // à la souris, le clavier physique reste libre
            spec.action();
          });
          ligne.appendChild(b);
        };
        if (numero === 2 && extremites) ajouter(extremites.gauche);
        rangee.split("").forEach(function (l) {
          var b = document.createElement("button");
          b.type = "button";
          b.className = "touche";
          b.textContent = l;
          b.addEventListener("click", function (ev) {
            if (ev.detail) b.blur();
            surLettre(l);
          });
          ligne.appendChild(b);
          touches[l] = b;
        });
        if (numero === 2 && extremites) ajouter(extremites.droite);
        el.appendChild(ligne);
      });
      return touches;
    }
  };
})();
