# TODO : Weebdle

Les données sont en place ([data/weebdle.json](data/weebdle.json), générées par `npm run fetch:weebdle`, voir « Données Weebdle » dans le README). Reste :

- **Tri et compléments à la main :** retirer les personnages trop inconnus et compléter sexe, âge, occupation et cheveux, dans [data/weebdle-manual.json](data/weebdle-manual.json) (format dans le README, « Corrections à la main »). La liste des manques est dans le récap (`.cache/weebdle/weebdle-recap.md`). AniList renseigne surtout les personnages principaux, et presque jamais l'occupation et les cheveux. Après déduction depuis le texte des descriptions : 266 sans sexe, 1 541 sans âge, 1 934 sans occupation, 2 305 sans cheveux. Les sexes déduits des pronoms (0,8 % d'erreurs) et les occupations tirées du texte (« is a young nun » → Nun) sont à relire.
- **Noms ambigus :** avec 2 500 personnages, des prénoms sont partagés (« Tatsumi » dans Akame ga Kill!, Death Parade et Shiki ; « King » dans One-Punch Man et Seven Deadly Sins...). La liste est dans le récap. Pistes : afficher l'anime entre parenthèses dans l'autocomplétion de `/guess`, et un message qui demande de préciser quand un nom écrit dans le salon correspond à plusieurs personnages.

Une fois tout ça fait : supprimer ce fichier.
