# TODO

## L'idée du projet

- Un bot Discord du même genre que le Pokédle, mais **plus large** : pas seulement les Pokémon, plein d'autres sujets de quiz.
- Le moteur doit rester **séparé** du bot, comme dans CoopPoker, pour pouvoir changer de front plus tard (site web, autre plateforme...).
- La première étape était de refaire un Pokédle comme base, en organisant le code pour pouvoir **refaire le même type de quiz sur d'autres sujets facilement**.

## Fait (v0.1)

- Moteur générique ([src/engine/](src/engine/)) : comparaison `exact` / `set` / `number`, recherche tolérante (accents, casse, alias), partie avec nombre d'essais optionnel, tirage au hasard et tirage « du jour » (`dailyEntry`, pas encore utilisé).
- Sujet Pokémon : génération 1 (151), données générées depuis PokeAPI par `npm run fetch:pokemon`.
- Bot : `/quiz start | guess | board | giveup`, une partie par salon, en coop, avec autocomplétion sur `guess`.
- Tests du moteur sur un sujet inventé (`npm test`).

## À faire

- [ ] Créer l'appli Discord, remplir `.env`, tester en vrai sur un serveur.
- [ ] Choisir un 2e sujet, pour vérifier que l'architecture tient vraiment.
- [ ] Mode « du jour » : même cible pour tout le monde, score par joueur, partie à garder (fichier ou base) pour qu'elle survive à un redémarrage.
- [ ] Pokémon : toutes les générations (`npm run fetch:pokemon -- 1025`). Que faire de l'habitat, absent après la génération 3 (le retirer ? le remplacer par un autre attribut ?).
- [ ] Autres modes que le tableau d'attributs, comme sur les sites -dle : image floutée, cri, description, emoji...
- [ ] Sur Discord, un bouton pour proposer plus vite que `/quiz guess` ?
