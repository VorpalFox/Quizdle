# TODO : Weebdle

Les données sont en place ([data/weebdle.json](data/weebdle.json), générées par `npm run fetch:weebdle`, voir « Données Weebdle » dans le README). Reste :

- **Tri et compléments à la main :** retirer les personnages trop inconnus et compléter âge, taille et sexe. La liste des manques est dans le récap (`.cache/weebdle/weebdle-recap.md`). Environ 1 600 personnages sans âge, 1 900 sans taille et 600 sans sexe : AniList les renseigne surtout pour les personnages principaux.
- **Garder les corrections faites à la main :** relancer `npm run fetch:weebdle` réécrit `data/weebdle.json`. Piste : une liste d'exclusion (par exemple `data/weebdle-excluded.json`) et un fichier de corrections (par exemple `data/weebdle-overrides.json`, id → attributs), appliqués par le script.
- **Noms ambigus :** avec 2 500 personnages, des prénoms sont partagés (« Tatsumi » dans Akame ga Kill!, Death Parade et Shiki ; « King » dans One-Punch Man et Seven Deadly Sins...). La liste est dans le récap. Pistes : afficher l'anime entre parenthèses dans l'autocomplétion de `/guess`, et un message qui demande de préciser quand un nom écrit dans le salon correspond à plusieurs personnages.
- **Retirer un personnage trop inconnu en cours de partie :** une commande (par exemple `/quizdebug remove <nom>`) qui l'ajoute à la liste d'exclusion. Si la partie du jour portait sur lui, nouveau tirage.

Une fois tout ça fait : supprimer ce fichier.
