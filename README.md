# Quizdle

Bot Discord de quiz façon -dle (Pokédle, et d'autres sujets à venir), tous sur le même bot : on doit trouver un élément mystère, et chaque proposition donne un indice par attribut. Une partie par salon, et tout le salon joue ensemble.

## Utilisation

- `/quiz start subject:<sujet>` : lance le quiz du jour dans le salon. La réponse est la même pour tout le monde ce jour-là et change à minuit (heure de Paris). Une partie par jour, par salon et par sujet.
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

Le bot ne fait aucune requête réseau : les données sont dans `data/`, générées une fois à la main par les scripts. Le tirage du jour se fait au démarrage s'il n'y en a pas pour aujourd'hui, puis à minuit, sans retomber sur une ancienne cible avant d'avoir fait le tour. Le tirage et les parties sont sauvegardés dans `state/games.json` (hors git) : ils survivent à un redémarrage.

### Debug

`/quizdebug reset` refait le tirage du jour et efface toutes les parties. Elle n'est enregistrée que sur le serveur de test (`DISCORD_GUILD_ID`), cachée aux non-admins, et seul `DISCORD_OWNER_ID` peut la lancer. Sans `DISCORD_GUILD_ID`, `deploy-commands` enregistre `/quiz` en global, sans la commande de debug. À retirer avant la v1.

La suite prévue est dans [TODO.md](TODO.md).
