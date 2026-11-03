// Démineur : règles, solveur et générateur, sans lien avec la page.
// Ce fichier sert aussi de Web Worker, pour générer les grandes grilles sans
// figer la page.
//
// Garantie : une grille n'est rendue que si le solveur la termine entièrement
// par déduction depuis le premier clic, sans jamais connaître l'emplacement des
// mines au-delà de ce qu'un joueur voit (chiffres et nombre total de mines).
// Sinon, la génération échoue : aucune grille non vérifiée n'est proposée.
var Demineur = (function () {
  var LIMITE_VARIABLES = 30;     // taille d'un groupe de cases étudié par cas
  var LIMITE_NOEUDS = 6000;      // essais par groupe
  var DENSITE_MAX = 0.35;

  // --- Réglages ---------------------------------------------------------------
  var normaliser = function (r) {
    var c = {
      largeur: r.largeur, hauteur: r.hauteur, nbMines: r.nbMines,
      forme: r.forme === "hexa" ? "hexa" : "carre",
      surface: r.surface || "plan", voisinage: r.voisinage || "normal",
      mines: r.mines || "simples"
    };
    if (c.forme === "hexa") {
      if (["plan", "cylindre", "tore"].indexOf(c.surface) < 0) c.surface = "plan";
      if (["normal", "etendu", "anneau"].indexOf(c.voisinage) < 0) c.voisinage = "normal";
      // Le tore hexagonal ne se referme que sur un nombre pair de rangées.
      if (c.surface === "tore" && c.hauteur % 2) c.hauteur++;
    } else if (["etendu"].indexOf(c.voisinage) >= 0) {
      c.voisinage = "normal";
    }
    // Personne ne regarde le bas de la grille sans raccord vertical.
    if (c.voisinage === "haut") c.surface = "tore";
    var total = c.largeur * c.hauteur;
    c.nbMines = Math.max(1, Math.min(c.nbMines, Math.floor(total * DENSITE_MAX)));
    return c;
  };

  // Nombre de mines de chaque valeur : { 1: simples, 2: doubles, 3: triples, -1: anti }.
  var repartition = function (c) {
    var parts = { simples: [[1, 1]], doubles: [[2, 0.3], [1, 0.7]],
                  triples: [[3, 0.15], [2, 0.25], [1, 0.6]],
                  anti: [[-1, 0.2], [1, 0.8]],
                  tout: [[-1, 0.15], [3, 0.1], [2, 0.2], [1, 0.55]] }[c.mines] || [[1, 1]];
    var r = {}, reste = c.nbMines;
    parts.forEach(function (p, i) {
      var n = i === parts.length - 1 ? reste : Math.round(c.nbMines * p[1]);
      n = Math.min(n, reste);
      if (n > 0) r[p[0]] = n;
      reste -= n;
    });
    return r;
  };

  // --- Géométrie --------------------------------------------------------------
  // Numéro de la case (x, y) après raccord des bords, ou -1 si elle est dehors.
  var raccord = function (c, x, y) {
    var L = c.largeur, H = c.hauteur, s = c.surface;
    if (x < 0 || x >= L) {
      if (s === "plan") return -1;
      var tours = Math.floor(x / L);
      x -= tours * L;
      if ((s === "mobius" || s === "klein") && tours % 2) y = H - 1 - y;
    }
    if (y < 0 || y >= H) {
      if (s !== "tore" && s !== "klein") return -1;
      y = ((y % H) + H) % H;
    }
    return y * L + x;
  };

  var ORTHO = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  var DIAG = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  var CAVALIER = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  var LOIN = [[2, 0], [0, 2], [-2, 0], [0, -2]];
  var HAUT = [[-1, -1], [0, -1], [1, -1], [-1, -2], [0, -2], [1, -2]];
  var anneau2 = function () {
    var a = [];
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === 2) a.push([dx, dy]);
    }
    return a;
  };

  // Les six voisines hexagonales, par sens : E, NE, NO, O, SO, SE (rangées impaires décalées).
  var hexa = function (c, i) {
    var x = i % c.largeur, y = Math.floor(i / c.largeur), d = y % 2;
    return [[1, 0], [d, -1], [d - 1, -1], [-1, 0], [d - 1, 1], [d, 1]].map(function (o) {
      return raccord(c, x + o[0], y + o[1]);
    });
  };

  // Groupe = cases comptées par un même chiffre, avec leur poids.
  var creerGroupe = function (liste, soi) {
    var poids = {};
    liste.forEach(function (e) {
      if (e[0] >= 0 && e[0] !== soi) poids[e[0]] = (poids[e[0]] || 0) + e[1];
    });
    var cases = Object.keys(poids).map(Number);
    return { cases: cases, poids: cases.map(function (k) { return poids[k]; }) };
  };

  var groupesCarre = function (c, i) {
    var x = i % c.largeur, y = Math.floor(i / c.largeur);
    var via = function (offs, w) {
      return offs.map(function (o) { return [raccord(c, x + o[0], y + o[1]), w]; });
    };
    var liste;
    switch (c.voisinage) {
      case "cavalier": liste = via(CAVALIER, 1); break;
      case "croix": liste = via(ORTHO, 1); break;
      case "etoile": liste = via(ORTHO, 1).concat(via(DIAG, 1), via(LOIN, 1)); break;
      case "anneau": liste = via(anneau2(), 1); break;
      case "haut": liste = via(HAUT, 1); break;
      default: liste = via(ORTHO, 1).concat(via(DIAG, 1));
    }
    return [creerGroupe(liste, i)];
  };

  var groupesHexa = function (c, i) {
    var six = hexa(c, i);
    var poser = function (l, w) { return l.map(function (k) { return [k, w]; }); };
    if (c.voisinage === "normal") return [creerGroupe(poser(six, 1), i)];
    var second = {};
    six.forEach(function (v) {
      if (v < 0) return;
      hexa(c, v).forEach(function (w) {
        if (w >= 0 && w !== i && six.indexOf(w) < 0) second[w] = 1;
      });
    });
    var loin = Object.keys(second).map(Number);
    if (c.voisinage === "anneau") return [creerGroupe(poser(loin, 1), i)];
    return [creerGroupe(poser(six, 1).concat(poser(loin, 1)), i)];
  };

  var creerGrille = function (c) {
    var n = c.largeur * c.hauteur, groupes = [], inverses = [], i;
    for (i = 0; i < n; i++) {
      groupes.push(c.forme === "hexa" ? groupesHexa(c, i) : groupesCarre(c, i));
      inverses.push([]);
    }
    groupes.forEach(function (gs, k) {
      gs.forEach(function (g) {
        g.cases.forEach(function (v) { inverses[v].push(k); });
      });
    });
    return { config: c, n: n, groupes: groupes, inverses: inverses };
  };

  // Zone du premier clic : la case et tout ce qu'elle compte restent sans mine.
  var zoneDepart = function (g, depart) {
    var zone = {};
    zone[depart] = true;
    g.groupes[depart].forEach(function (gr) {
      gr.cases.forEach(function (v) { zone[v] = true; });
    });
    return zone;
  };

  var estVide = function (g, valeurs, i) {
    return g.groupes[i].every(function (gr) {
      return gr.cases.every(function (v) { return !valeurs[v]; });
    });
  };

  var chiffres = function (g, valeurs, i) {
    return g.groupes[i].map(function (gr) {
      var s = 0;
      gr.cases.forEach(function (v, k) { s += gr.poids[k] * valeurs[v]; });
      return s;
    });
  };

  // --- Solveur ----------------------------------------------------------------
  // Chaque case a un masque de valeurs encore possibles (bit 0 : pas de mine).
  // `valeurs` ne sert qu'à répondre quand une case sûre est ouverte, comme le
  // jeu le ferait : chiffres affichés et ouverture automatique des zones vides.
  // Avec `dejaOuvertes`, il repart de ce que voit le joueur et s'arrête à la
  // première déduction : c'est le conseil.
  var resoudre = function (g, valeurs, depart, dejaOuvertes) {
    var n = g.n, cfg = g.config, deductions = [];
    var parts = repartition(cfg), dom = [0], k;
    Object.keys(parts).forEach(function (v) { dom.push(parseInt(v, 10)); });
    var plein = (1 << dom.length) - 1;

    var minDe = [], maxDe = [], nbBits = [];
    for (var m = 0; m <= plein; m++) {
      var lo = Infinity, hi = -Infinity, b = 0;
      for (k = 0; k < dom.length; k++) {
        if (m & (1 << k)) { lo = Math.min(lo, dom[k]); hi = Math.max(hi, dom[k]); b++; }
      }
      minDe.push(lo); maxDe.push(hi); nbBits.push(b);
    }

    var masque = new Uint8Array(n).fill(plein);
    var ouvert = new Uint8Array(n);
    var liens = new Array(n);       // contraintes qui comptent chaque case
    var contraintes = [];
    var file = [];
    var restantes = 0;              // cases sûres encore fermées
    var i;
    for (i = 0; i < n; i++) if (!valeurs[i]) restantes++;

    var mettreEnFile = function (ct) {
      if (!ct.enFile) { ct.enFile = true; file.push(ct); }
    };

    var ouvrir = function (premiere) {
      var pile = [premiere];
      while (pile.length) {
        var c = pile.pop();
        if (ouvert[c]) continue;
        ouvert[c] = 1;
        deductions.push(c);
        restantes--;
        masque[c] = 1;
        (liens[c] || []).forEach(mettreEnFile);
        var sommes = chiffres(g, valeurs, c);
        g.groupes[c].forEach(function (gr, q) {
          var ct = { cases: gr.cases, poids: gr.poids, somme: sommes[q], enFile: false, finie: false };
          contraintes.push(ct);
          gr.cases.forEach(function (v) { (liens[v] = liens[v] || []).push(ct); });
          mettreEnFile(ct);
        });
        if (estVide(g, valeurs, c)) {
          g.groupes[c].forEach(function (gr) {
            gr.cases.forEach(function (v) { if (!ouvert[v]) pile.push(v); });
          });
        }
      }
    };

    var changer = function (c, m) {
      masque[c] = m;
      if (m === 1) ouvrir(c);
      else (liens[c] || []).forEach(mettreEnFile);
    };

    var propager = function () {
      while (file.length) {
        var ct = file.pop();
        ct.enFile = false;
        var bas = 0, haut = 0, q, w, mk, indecis = 0;
        for (q = 0; q < ct.cases.length; q++) {
          mk = masque[ct.cases[q]];
          w = ct.poids[q];
          bas += w * minDe[mk];
          haut += w * maxDe[mk];
          if (nbBits[mk] > 1) indecis++;
        }
        if (!indecis) { ct.finie = true; continue; }
        for (q = 0; q < ct.cases.length; q++) {
          var c = ct.cases[q];
          mk = masque[c];
          if (nbBits[mk] < 2) continue;
          w = ct.poids[q];
          var restBas = bas - w * minDe[mk], restHaut = haut - w * maxDe[mk], nouveau = 0;
          for (k = 0; k < dom.length; k++) {
            if (!(mk & (1 << k))) continue;
            var part = w * dom[k];
            if (restBas + part <= ct.somme && ct.somme <= restHaut + part) nouveau |= 1 << k;
          }
          if (nouveau !== mk) {
            changer(c, nouveau);
            mettreEnFile(ct);
            break;   // les bornes ont changé : on repartira de valeurs à jour
          }
        }
      }
    };

    // Étude par cas d'un groupe de cases liées : une valeur qui n'apparaît dans
    // aucune solution locale est impossible.
    var dejaVus = {};
    var etudierGroupes = function () {
      var parent = {};
      var chercher = function (a) {
        while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; }
        return a;
      };
      var actives = contraintes.filter(function (ct) { return !ct.finie; });
      contraintes = actives;
      actives.forEach(function (ct) {
        var premiere = -1;
        ct.cases.forEach(function (c) {
          if (nbBits[masque[c]] < 2) return;
          if (parent[c] === undefined) parent[c] = c;
          if (premiere < 0) premiere = c;
          else parent[chercher(c)] = chercher(premiere);
        });
      });
      var groupes = {};
      Object.keys(parent).forEach(function (s) {
        var c = parseInt(s, 10), r = chercher(c);
        (groupes[r] = groupes[r] || []).push(c);
      });
      var liste = Object.keys(groupes).map(function (r) { return groupes[r]; });
      liste.sort(function (a, b) { return a.length - b.length; });

      for (var z = 0; z < liste.length; z++) {
        var vars = liste[z];
        if (vars.length > LIMITE_VARIABLES) break;
        var dans = {};
        vars.forEach(function (c) { dans[c] = true; });
        var cts = actives.filter(function (ct) {
          return ct.cases.some(function (c) { return dans[c]; });
        });
        var signature = vars.map(function (c) { return c + ":" + masque[c]; }).join() + "|" + cts.length;
        if (dejaVus[signature]) continue;
        dejaVus[signature] = true;
        if (enumerer(vars, cts)) return true;
      }
      return false;
    };

    var enumerer = function (vars, cts) {
      // Ordre de parcours : de proche en proche, pour contrôler tôt les sommes.
      var etat = cts.map(function (ct) {
        var fixe = 0, bas = 0, haut = 0;
        ct.cases.forEach(function (c, q) {
          var mk = masque[c], w = ct.poids[q];
          if (nbBits[mk] < 2) { fixe += w * minDe[mk]; return; }
          bas += w * minDe[mk];
          haut += w * maxDe[mk];
        });
        return { somme: ct.somme - fixe, bas: bas, haut: haut };
      });
      var liensLocaux = {};
      vars.forEach(function (c) { liensLocaux[c] = []; });
      cts.forEach(function (ct, q) {
        ct.cases.forEach(function (c, r) {
          if (liensLocaux[c]) liensLocaux[c].push([q, ct.poids[r]]);
        });
      });
      var ordre = [], vu = {}, attente = [vars[0]];
      while (attente.length) {
        var c = attente.shift();
        if (vu[c]) continue;
        vu[c] = true;
        ordre.push(c);
        liensLocaux[c].forEach(function (e) {
          cts[e[0]].cases.forEach(function (v) {
            if (liensLocaux[v] && !vu[v]) attente.push(v);
          });
        });
      }
      vars.forEach(function (v) { if (!vu[v]) ordre.push(v); });

      var vus = new Uint8Array(ordre.length), noeuds = 0, abandon = false, restent = ordre.length;
      var cible = ordre.map(function (v) { return masque[v]; });
      var choix = new Int8Array(ordre.length);

      var valider = function () {
        var libre = 0;
        for (var a = 0; a < ordre.length; a++) {
          vus[a] |= 1 << choix[a];
          if (vus[a] !== cible[a]) libre++;
        }
        restent = libre;
      };

      var explorer = function (pos) {
        if (abandon || !restent) return;
        if (pos === ordre.length) { valider(); return; }
        if (++noeuds > LIMITE_NOEUDS) { abandon = true; return; }
        var cel = ordre[pos], mk = masque[cel], lien = liensLocaux[cel];
        for (var v = 0; v < dom.length; v++) {
          if (!(mk & (1 << v))) continue;
          var possible = true, e, st;
          for (e = 0; e < lien.length; e++) {
            st = etat[lien[e][0]];
            st.somme -= lien[e][1] * dom[v];
            st.bas -= lien[e][1] * minDe[mk];
            st.haut -= lien[e][1] * maxDe[mk];
            if (st.somme < st.bas || st.somme > st.haut) possible = false;
          }
          if (possible) {
            choix[pos] = v;
            explorer(pos + 1);
          }
          for (e = 0; e < lien.length; e++) {
            st = etat[lien[e][0]];
            st.somme += lien[e][1] * dom[v];
            st.bas += lien[e][1] * minDe[mk];
            st.haut += lien[e][1] * maxDe[mk];
          }
          if (abandon || !restent) return;
        }
      };
      explorer(0);
      if (abandon) return false;

      var progres = false;
      for (var a = 0; a < ordre.length; a++) {
        if (vus[a] !== cible[a] && vus[a]) {
          changer(ordre[a], vus[a]);
          progres = true;
        }
      }
      return progres;
    };

    // Le compteur de mines : plus aucune à trouver, ou plus que des mines.
    var compterMines = function () {
      var connues = 0, indecises = [];
      for (var c = 0; c < n; c++) {
        if (ouvert[c]) continue;
        if (!(masque[c] & 1)) connues++;
        else if (masque[c] !== 1) indecises.push(c);
      }
      if (!indecises.length) return false;
      if (connues === cfg.nbMines) {
        indecises.forEach(function (x) { changer(x, 1); });
        return true;
      }
      if (connues + indecises.length === cfg.nbMines) {
        indecises.forEach(function (x) { changer(x, masque[x] & ~1); });
        return true;
      }
      return false;
    };

    if (dejaOuvertes) {
      for (i = 0; i < n; i++) if (dejaOuvertes[i] && !valeurs[i]) ouvrir(i);
      deductions = [];
    } else {
      ouvrir(depart);
    }
    for (;;) {
      propager();
      if (!restantes || (dejaOuvertes && deductions.length)) break;
      if (etudierGroupes()) continue;
      if (compterMines()) continue;
      break;
    }
    return { reussi: restantes === 0, ouvert: ouvert, masque: masque, domaine: dom, deductions: deductions };
  };

  // Case que la logique permet d'ouvrir maintenant, ou -1.
  var conseil = function (g, valeurs, ouvert) {
    var d = resoudre(g, valeurs, -1, ouvert).deductions;
    return d.length ? d[0] : -1;
  };

  // --- Générateur -------------------------------------------------------------
  // Tire les mines, puis déplace celles qui bloquent le solveur jusqu'à obtenir
  // une grille qu'il termine. Une nouvelle grille remplace celle qui stagne.
  var generer = function (brut, depart, budgetMs, surProgres) {
    var c = normaliser(brut), g = creerGrille(c), n = g.n;
    var zone = zoneDepart(g, depart), libres = [], i;
    for (i = 0; i < n; i++) if (!zone[i]) libres.push(i);
    if (libres.length < c.nbMines) return { reussi: false, raison: "dense" };

    var parts = repartition(c), sac = [];
    Object.keys(parts).forEach(function (v) {
      for (var q = 0; q < parts[v]; q++) sac.push(parseInt(v, 10));
    });

    var tirer = function () {
      var valeurs = new Int8Array(n), ordre = libres.slice();
      for (var q = 0; q < sac.length; q++) {
        var j = q + Math.floor(Math.random() * (ordre.length - q));
        var t = ordre[q]; ordre[q] = ordre[j]; ordre[j] = t;
        valeurs[ordre[q]] = sac[q];
      }
      return valeurs;
    };

    var debut = Date.now(), essais = 0, valeurs = tirer(), meilleur = -1, stagne = 0, sauvegarde = null;
    while (Date.now() - debut < budgetMs) {
      essais++;
      var r = resoudre(g, valeurs, depart);
      if (r.reussi) return { reussi: true, valeurs: Array.prototype.slice.call(valeurs), essais: essais, config: c };

      var score = 0;
      for (i = 0; i < n; i++) if (r.ouvert[i]) score++;
      if (score > meilleur) {
        meilleur = score;
        sauvegarde = valeurs.slice();
        stagne = 0;
      } else {
        if (score < meilleur) valeurs = sauvegarde.slice();
        stagne++;
      }
      if (stagne > 60) {
        valeurs = tirer();
        meilleur = -1;
        stagne = 0;
        continue;
      }
      if (surProgres && essais % 10 === 0) surProgres(essais);

      // Les mines voisines des cases sûres restées fermées partent ailleurs.
      var coincees = [], candidates = {};
      for (i = 0; i < n; i++) if (!valeurs[i] && !r.ouvert[i]) coincees.push(i);
      coincees.forEach(function (s) {
        g.inverses[s].forEach(function (v) { if (valeurs[v]) candidates[v] = true; });
        g.groupes[s].forEach(function (gr) {
          gr.cases.forEach(function (v) { if (valeurs[v]) candidates[v] = true; });
        });
      });
      var mines = Object.keys(candidates).map(Number);
      var aDeplacer = Math.max(1, Math.min(6, Math.ceil(mines.length / 5)));
      for (var d = 0; d < aDeplacer && mines.length; d++) {
        var pris = mines.splice(Math.floor(Math.random() * mines.length), 1)[0];
        var dest = -1;
        for (var e = 0; e < 40 && dest < 0; e++) {
          var essai = Math.random() < 0.5 && coincees.length
            ? coincees[Math.floor(Math.random() * coincees.length)]
            : libres[Math.floor(Math.random() * libres.length)];
          if (!valeurs[essai] && !zone[essai]) dest = essai;
        }
        if (dest >= 0) {
          valeurs[dest] = valeurs[pris];
          valeurs[pris] = 0;
        }
      }
    }
    return { reussi: false, raison: "temps", essais: essais };
  };

  return {
    normaliser: normaliser, repartition: repartition, creerGrille: creerGrille,
    chiffres: chiffres, estVide: estVide, resoudre: resoudre, generer: generer, conseil: conseil,
    DENSITE_MAX: DENSITE_MAX
  };
})();

// Web Worker : génère la grille demandée et renvoie le résultat.
if (typeof document === "undefined") {
  self.onmessage = function (ev) {
    var d = ev.data;
    self.postMessage({ type: "fin", resultat: Demineur.generer(d.reglages, d.depart, d.budget, function (n) {
      self.postMessage({ type: "progres", essais: n });
    }) });
  };
}
