# Quizdle

Bot Discord de quiz façon -dle (Pokédle, Animedle, Weebdle, Pixeldle), tous sur le même bot : on doit trouver un élément mystère, et chaque proposition donne un indice par attribut. Une partie par salon, et tout le salon joue ensemble.

## Utilisation

- `/quiz pokedle`, `/quiz animedle`, `/quiz weebdle` ou `/quiz pixeldle` : lance le quiz du jour dans le salon (un Pokémon, un personnage d'anime populaire, un personnage des animes conseillés sur le serveur, ou un personnage de jeu vidéo). La réponse est la même pour tout le monde ce jour-là et change à minuit (heure de Paris).
- Écrire un nom directement dans le salon pendant une partie : c'est une proposition. Les autres messages sont ignorés, on peut discuter normalement. Accents et casse ignorés, nom anglais accepté, une faute de frappe tolérée à partir de 4 lettres. Pour deux personnages du même nom, préciser l'univers entre parenthèses, même un bout : « Sam (The Last of Us) ».
- `/guess name:<nom>` : pareil, avec l'autocomplétion.
- `/quiz board` : la grille de toutes les propositions. `/quiz giveup` : abandonne et donne la réponse.

Indices : 🟩 juste · 🟨 en partie (les valeurs en commun sont en gras) · 🟥 faux · ⬆️ / ⬇️ la réponse est plus grande / plus petite · ❔ la réponse n'a pas cette info.

## Architecture

```
src/
  engine/     moteur générique, sans Discord : comparaison, recherche, partie, tirage
  subjects/   un dossier par sujet (liste des attributs) + registry.ts qui les liste tous
  bot/        couche Discord : commandes, rendu des embeds, interactions
data/         les données de chaque sujet (JSON) et leurs corrections à la main
scripts/      scripts de génération des données
```

Le bot ne passe que par le moteur, qui ne connaît que l'interface `Subject` ([src/engine/types.ts](src/engine/types.ts)).

**Ajouter un sujet** : créer `data/<sujet>.json` (des entrées `{ id, name, aliases?, image?, attributes }`), puis `src/subjects/<sujet>/index.ts` avec ses attributs (`exact`, `set` : juste en partie s'il y a une valeur en commun, `number` : ⬆️ / ⬇️), l'ajouter dans [src/subjects/registry.ts](src/subjects/registry.ts) et relancer `npm run deploy-commands`. L'`id` du sujet devient sa commande (`/quiz <id>`).

## Données

Les données sont générées par des scripts, puis commitées. Les choix faits (sources, règles, cas particuliers) sont expliqués en commentaire en tête de chaque script.

| Sujet | Commande | Source | Script |
|---|---|---|---|
| Pokédle | `npm run fetch:pokemon` | PokeAPI | [fetchPokemon.ts](scripts/fetchPokemon.ts) |
| Animedle | `npm run fetch:anime` | AniList (les 200 personnages les plus en favoris), Wikidata, Fandom, Wikipédia | [fetchAnime.ts](scripts/fetchAnime.ts) |
| Weebdle | `npm run fetch:weebdle` | AniList, pour les animes de [data/recommendations.json](data/recommendations.json) | [fetchWeebdle.ts](scripts/fetchWeebdle.ts) |
| Pixeldle | `npm run fetch:pixeldle` | Wikidata et les wikis des franchises de [data/pixeldle-franchises.json](data/pixeldle-franchises.json) | [fetchPixeldle.ts](scripts/fetchPixeldle.ts) |

Les réponses des API sont gardées dans `.cache/` (hors git) : un script interrompu reprend où il en était, et une relance ne refait aucune requête. La 1re fois, compter de quelques minutes à une vingtaine. Chaque script écrit un récap dans `.cache/<sujet>/` : ce qui manque, ce qui est deviné et à relire, les valeurs pas traduites.

La liste du Weebdle est recopiée à la main du salon #conseil-en-anime (`npm run dump:recos` écrit tous ses messages dans `.cache/discord/recos.txt`).

### Corrections à la main

Ne pas modifier `data/<sujet>.json` : les scripts le réécrivent. Les corrections vont dans `data/<sujet>-manual.json`, à la main ou avec `/quizdebug` (voir Debug), et sont appliquées à chaque génération et au démarrage du bot :

```json
{
 "exclude": ["307811"],
 "edit": { "27": { "_nom": "Killua Zoldyck", "hair": ["Blancs"], "occupation": ["Assassin"] } },
 "add": [{ "id": "manuel-1", "name": "Nom", "attributes": { "gender": "Homme", "...": "..." } }]
}
```

- `exclude` : retire un personnage. `edit` : remplace des champs ou des attributs (les clés en `_` sont des notes). `add` : un personnage absent de la source.
- Pixeldle seulement : `wikis` (réglages de la recherche de personnages dans le wiki d'une franchise) et `defaults` (valeurs des attributs vides d'une franchise, avant `edit`).

Le détail est dans [src/subjects/manual.ts](src/subjects/manual.ts).

## Installation

### Appli Discord

1. Sur le [Discord Developer Portal](https://discord.com/developers/applications) : *New Application*.
2. *Bot* > *Reset Token* : c'est le `DISCORD_TOKEN`. Sur la même page, activer *Message Content Intent* (pour lire les noms écrits dans le salon).
3. *OAuth2* > *URL Generator* : scopes `bot` et `applications.commands`, permissions *View Channels*, *Send Messages*, *Embed Links* et *Read Message History*. Ouvrir l'URL générée pour inviter le bot.

### Lancer le bot

```
npm install
cp .env.example .env    # puis remplir .env (pas .env.example, qui est commité)
npm run build
npm run deploy-commands # à relancer quand les commandes ou la liste des sujets changent
npm start               # ou npm run dev pendant le développement
```

Variables du `.env` :

- `DISCORD_TOKEN` : le token du bot (secret).
- `DISCORD_CLIENT_ID` : *General Information* > *Application ID*.
- `DISCORD_GUILD_ID` : optionnel, l'ID du serveur de test. Les commandes y apparaissent tout de suite, avec `/quizdebug`. Sans lui, `/quiz` et `/guess` sont enregistrées en global, sans `/quizdebug`.
- `DISCORD_DEBUG_CHANNEL_ID` : le salon du serveur de test où `/quizdebug` est accepté.

Tests : `npm test`. Type-check : `npm run typecheck`. Dans VS Code, la config *Bot Discord* lance le bot avec le débogueur. Sur le Raspberry : `npm run build`, puis `pm2 start ecosystem.config.cjs`.

### Fonctionnement

Le bot ne fait aucune requête réseau : tout est dans `data/`. Le tirage du jour se fait au démarrage s'il manque, puis à minuit, jamais deux fois de suite la même réponse. Seul le tirage est sauvegardé (`state/daily.json`, hors git) : un redémarrage efface les parties, et le salon peut relancer celle du jour.

### Debug

Dans le salon `DISCORD_DEBUG_CHANNEL_ID` :

- `/quizdebug reset` : refait le tirage du jour et efface toutes les parties (sur tous les serveurs).
- `/quizdebug remove subject:<sujet> name:<personnage>` : retire un personnage pour de bon (`exclude`). Si c'était la réponse du jour, nouveau tirage pour les parties suivantes.
- `/quizdebug edit subject:<sujet> name:<personnage> attribute:<attribut> value:<valeur>` : change un attribut (`edit`), tout de suite, parties en cours comprises. Plusieurs valeurs : « Blancs, Noirs ». Vide : « - ». Le bot signale une valeur que personne d'autre n'a, pour garder la même écriture.

Sur le Raspberry, ces corrections changent les fichiers de `data/` : penser à les commiter depuis le Raspberry pour ne pas les perdre au prochain `git pull`. Pour cacher `/quizdebug` des autres salons : *Paramètres du serveur* > *Intégrations* > le bot > `/quizdebug`.
