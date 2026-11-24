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
  test/       tests du moteur et du bot
data/         les données de chaque sujet (JSON) et leurs corrections à la main
scripts/      génération des données (voir scripts/README.md), avec ses tests dans scripts/test/
```

Le bot ne passe que par le moteur, qui ne connaît que l'interface `Subject` ([src/engine/types.ts](src/engine/types.ts)).

**Ajouter un sujet** : créer `data/<sujet>.json` (des entrées `{ id, name, aliases?, image?, attributes }`), puis `src/subjects/<sujet>/index.ts` avec ses attributs (`exact`, `set` : juste en partie s'il y a une valeur en commun, `number` : ⬆️ / ⬇️), l'ajouter dans [src/subjects/registry.ts](src/subjects/registry.ts) et relancer `npm run deploy-commands`. L'`id` du sujet devient sa commande (`/quiz <id>`).

## Données

Les données sont générées par les scripts de [scripts/](scripts/), puis commitées : sources, étapes, cache, récaps et corrections à la main (`data/<sujet>-manual.json`) sont expliqués dans [scripts/README.md](scripts/README.md).

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

Tests : `npm test`. Type-check : `npm run typecheck`. Sur le Raspberry : `npm run build`, puis `pm2 start ecosystem.config.cjs`.

### Fonctionnement

Le bot ne fait aucune requête réseau : tout est dans `data/`. Le tirage du jour se fait au démarrage s'il manque, puis à minuit, jamais deux fois de suite la même réponse. Seul le tirage est sauvegardé (`state/daily.json`, hors git) : un redémarrage efface les parties, et le salon peut relancer celle du jour.

### Debug

Dans le salon `DISCORD_DEBUG_CHANNEL_ID` :

- `/quizdebug reset` : refait le tirage du jour et efface toutes les parties (sur tous les serveurs).
- `/quizdebug remove subject:<sujet> name:<personnage>` : retire un personnage pour de bon (`exclude`, voir [Corrections à la main](scripts/README.md#corrections-à-la-main)). Si c'était la réponse du jour, nouveau tirage pour les parties suivantes.
- `/quizdebug edit subject:<sujet> name:<personnage> attribute:<attribut> value:<valeur>` : change un attribut (`edit`), tout de suite, parties en cours comprises. Plusieurs valeurs : « Blancs, Noirs ». Vide : « - ». Le bot signale une valeur que personne d'autre n'a, pour garder la même écriture.

Sur le Raspberry, ces corrections changent les fichiers de `data/` : penser à les commiter depuis le Raspberry pour ne pas les perdre au prochain `git pull`. Pour cacher `/quizdebug` des autres salons : *Paramètres du serveur* > *Intégrations* > le bot > `/quizdebug`.
