# TODO : MR de Fx/Pixeldle vers main

La MR n'est pas encore créée : `gh` n'est pas installé sur le PC (`winget install GitHub.cli`, puis `gh auth login`), ou la créer à la main sur https://github.com/VorpalFox/Quizdle/compare/main...Fx/Pixeldle?expand=1 avec le titre et la description ci-dessous.

## Avant de merger / déployer

- Sur le Raspberry : ajouter `DISCORD_DEBUG_CHANNEL_ID=322112141991739393` dans le `.env` (remplace `DISCORD_OWNER_ID`, qui ne sert plus). Sans ça, `/quizdebug` est refusé partout.
- `npm run build`, puis `npm run deploy-commands` (nouveaux sujets de `/quiz`, et `/quizdebug` n'est plus réservé aux admins), puis relancer le bot.
- Optionnel : cacher `/quizdebug` hors du salon de debug (Paramètres du serveur > Intégrations > le bot > `/quizdebug`).

## Titre

Animedle, Weebdle, Pokédle jusqu'à la 8e génération

## Description

Ajoute deux nouveaux quiz jouables (**Animedle** et **Weebdle**), étend le **Pokédle** jusqu'à la 8e génération, et prépare le **Pixeldle** (sujet factice pour l'instant).

### Animedle
- Les 200 personnages d'anime les plus mis en favoris sur AniList (`npm run fetch:anime`).
- Indices : sexe, âge, occupation, cheveux, univers (la 1re série de la franchise : JoJo plutôt que Diamond is Unbreakable), genres, année, studio.

### Weebdle
- Les personnages des animes conseillés sur le serveur (`data/recommendations.json`, 120 animes, 2 187 personnages), mêmes indices (`npm run fetch:weebdle`).
- 4 à 20 personnages par anime, tirage reproductible, chaque personnage attribué à un seul anime.
- Liste nettoyée : animes retirés à la demande, Blue Exorcist remis à la place de Twin Star Exorcists.

### Compléter ce qu'AniList ne donne pas
- Dans l'ordre : description AniList, **Wikidata** (lien par l'ID AniList), **wikis Fandom** (infobox du wiki de l'anime), **Wikipédia** (infobox FR puis EN). Au Weebdle, l'occupation passe de 20 % à 60 % de personnages renseignés, les cheveux de 3 % à 40 %.
- Occupations traduites en français : dictionnaire puis règles par mot-clé (`scripts/translate.ts`).
- Corrections à la main : `data/anime-manual.json` et `data/weebdle-manual.json`, ou `/quizdebug remove` et `/quizdebug edit` depuis Discord.

### Pokédle
- Jusqu'à la 8e génération (905 Pokémon), avec un indice **groupes d'œufs**.
- Habitat officiel jusqu'à la 3e génération ; au-delà, repris de la famille d'évolution, sinon déduit des lieux de capture (une liste, approximative : voir `docs/analyses/habitat-pokemon`).

### Jeu
- Indice en partie juste (🟨) : les valeurs en commun avec la réponse sont en gras.
- ❔ quand la réponse n'a pas l'indice (âge inconnu…), au lieu de 🟥.
- `/quizdebug` réservé au salon `DISCORD_DEBUG_CHANNEL_ID` plutôt qu'au compte du propriétaire.

### Avant de déployer
- `.env` : `DISCORD_DEBUG_CHANNEL_ID` remplace `DISCORD_OWNER_ID`.
- `npm run build`, `npm run deploy-commands`, puis relancer le bot.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Une fois la MR créée et mergée : supprimer ce fichier.
