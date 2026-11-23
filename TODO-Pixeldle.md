# TODO : données du Pixeldle

Le fonctionnement et les règles sont dans la section « Données Pixeldle » du README. Ce fichier ne garde que ce qu'il reste à faire avant le 1er test.

Remplissage : sexe 100 %, espèce 100 %, nationalité 66 %, occupation 55 %, cheveux 58 %. Franchise, développeur, genres et année sont à 100 %.

## À faire

1. **Nationalité** : Wikidata (pays, naissance, résidence), les champs des wikis (dont la date de naissance et `location` en dernier recours), puis `defaults` et `edit` pour des lieux qui se croisent entre franchises (Japan, Earth, Hell, Olympus…). Les franchises 100 % fictives restent vides exprès. Reste éventuellement : Wikipédia en dernier recours.
2. **Sundered** (mis de côté) : 0 personnage. FX remplit le wiki, puis on relance le script avec les bons réglages dans `wikis`.
3. **1er test** : jouer en vrai (`/quiz pixeldle`), puis supprimer ce fichier.
