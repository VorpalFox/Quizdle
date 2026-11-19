# Quizdle

Bot Discord de quiz façon Pokédle : on doit trouver un élément mystère, et chaque proposition donne un indice par attribut. Une partie par salon, et tout le salon joue ensemble.

## Utilisation

- `/quiz start subject:<sujet>` : lance une partie dans le salon.
- `/quiz guess name:<nom>` : fait une proposition. La liste se complète pendant la frappe, sans les noms déjà proposés. Les accents et la casse sont ignorés, et le nom anglais marche aussi.
- `/quiz board` : la grille de toutes les propositions, la plus récente en haut.
- `/quiz giveup` : abandonne la partie et donne la réponse.

Indices : 🟩 juste · 🟨 en partie (ex : un type sur deux) · 🟥 faux · ⬆️ la réponse est plus grande · ⬇️ la réponse est plus petite.

## Architecture

```
src/
  engine/     moteur générique, sans Discord ni Pokémon : comparaison, recherche, partie, tirage
  subjects/   un dossier par sujet (liste des attributs) + registry.ts qui les liste tous
  bot/        couche Discord : commandes, rendu des embeds, interactions
data/         les données de chaque sujet (JSON)
scripts/      scripts de génération des données
```

Le bot ne passe que par le moteur, et le moteur ne connaît que l'interface `Subject` ([src/engine/types.ts](src/engine/types.ts)). On peut donc changer de front (site web, autre plateforme) sans toucher au moteur.

### Ajouter un sujet

1. Créer `data/<sujet>.json` : une liste d'entrées `{ id, name, aliases?, image?, attributes: { ... } }`.
2. Créer `src/subjects/<sujet>/index.ts`, qui définit les attributs. Chaque attribut a un type de comparaison :
   - `exact` : juste ou faux (couleur, pays...)
   - `set` : une liste de valeurs, juste en partie s'il y en a au moins une en commun (types, genres...)
   - `number` : juste, ou ⬆️ / ⬇️ (taille, année...). `format` sert à ajouter l'unité.
3. L'ajouter dans [src/subjects/registry.ts](src/subjects/registry.ts), puis relancer `npm run deploy-commands`.

### Données Pokémon

`npm run fetch:pokemon` régénère [data/pokemon.json](data/pokemon.json) depuis PokeAPI (les 151 premiers par défaut). Pour aller plus loin : `npm run fetch:pokemon -- 1025`. PokeAPI ne donne les habitats que jusqu'à la 3e génération : après, l'habitat est vide (« — »).

## Installation

```
npm install
cp .env.example .env    # puis remplir le token et l'ID de l'appli
npm run build
npm run deploy-commands
npm start               # ou npm run dev pendant le développement
```

Pour le Raspberry : `pm2 start ecosystem.config.cjs`.

Les parties sont gardées en mémoire : un redémarrage du bot les efface.

La suite prévue est dans [TODO.md](TODO.md).
