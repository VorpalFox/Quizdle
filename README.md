# Quizdle

Bot Discord de quiz façon -dle (Pokédle, Animedle, Weebdle, Pixeldle), tous sur le même bot : on doit trouver un élément mystère, et chaque proposition donne un indice par attribut. Une partie par salon, et tout le salon joue ensemble.

## Utilisation

- `/quiz pokedle`, `/quiz animedle`, `/quiz weebdle` ou `/quiz pixeldle` : lance le quiz du jour dans le salon (un Pokémon, un personnage d'anime populaire, un personnage des animes conseillés sur le serveur, ou un personnage de jeu vidéo). La réponse est la même pour tout le monde ce jour-là et change à minuit (heure de Paris). Une partie par jour, par salon et par sujet.
- Écrire un nom directement dans le salon pendant une partie : c'est une proposition. Les messages qui ne sont pas un nom du quiz sont ignorés, on peut donc discuter normalement. Les accents et la casse sont ignorés, le nom anglais marche aussi, et une faute de frappe est tolérée si le mot tapé fait au moins 4 lettres (« Roocool » → Roucool, « Ratattac » → Rattatac), sauf si deux noms collent.
- `/guess name:<nom>` : pareil, mais avec l'autocomplétion pendant la frappe (sans les noms déjà proposés). Pratique pour « Nidoran♀ » ou « M. Mime ».
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
3. L'ajouter dans [src/subjects/registry.ts](src/subjects/registry.ts), puis relancer `npm run deploy-commands`. L'`id` du sujet devient sa commande (`/quiz <id>`, ex : `pokedle`) : en minuscules, sans accent, et ni `board` ni `giveup`.

### Données Pokémon

`npm run fetch:pokemon` régénère [data/pokemon.json](data/pokemon.json) depuis PokeAPI (les 151 premiers par défaut). Pour aller plus loin : `npm run fetch:pokemon -- 1025`. PokeAPI ne donne les habitats que jusqu'à la 3e génération : après, l'habitat est vide (« — »).

### Données Animedle

`npm run fetch:anime` régénère [data/anime.json](data/anime.json) depuis [AniList](https://anilist.co) : les 200 personnages les plus mis en favoris (`npm run fetch:anime -- 300` pour en prendre plus). Ça prend environ 30 s, AniList limitant le nombre de requêtes par minute.

- **Anime** : la 1re série TV où le personnage apparaît, titre anglais sinon romaji, sans « Season 2 » ni « (2011) ». Genres, studio, année et source viennent de cet anime.
- **Âge** : le 1er nombre donné par AniList (« 17-18 » → 17). Absent pour environ 15 % des personnages.
- **Taille** : extraite de la description AniList (« Height: 170 cm »). Absente pour environ 25 % des personnages.
- **Noms acceptés** : le nom complet dans les deux ordres, les variantes qui contiennent son nom (« Monkey D. Luffy »), et le prénom ou le nom seul s'il n'appartient qu'à un personnage (« Luffy » oui, « Elric » non). Pas les surnoms (« Master », « Zero »...), qui seraient pris pour des propositions dans la discussion.

### Données Weebdle

Les personnages des animes conseillés sur le serveur, avec les mêmes indices que l'Animedle. La liste des animes est dans [data/recommendations.json](data/recommendations.json). `npm run fetch:weebdle` régénère [data/weebdle.json](data/weebdle.json) depuis AniList ([scripts/fetchWeebdle.ts](scripts/fetchWeebdle.ts)).

- **Récupération** : tous les personnages de chaque anime de la liste. Les réponses sont gardées dans `.cache/weebdle/` (hors git) : si le script s'arrête, le relancer reprend où il en était, et une relance complète ne refait aucune requête. Pour retélécharger, supprimer ce dossier. Compter une vingtaine de minutes la 1re fois.
- **Un personnage, un anime** : un personnage présent dans plusieurs animes de la liste (Index et Railgun, Fate/Zero et UBW...) revient à l'anime où il est principal, et s'il l'est dans plusieurs, ou nulle part, à celui sorti en premier.
- **4 à 20 personnages par anime** : tous s'il y en a 20 ou moins. Au-delà, on écarte ceux qui n'ont ni âge ni taille (sauf s'il en faut pour arriver à 20), puis on prend les principaux (les 10 plus populaires, et jusqu'à 6 de plus) et on complète avec des secondaires, moitié par popularité, moitié au sort. Le tirage a une graine fixe (l'id AniList de l'anime) : relancer le script redonne les mêmes personnages. Les figurants ne servent qu'à compléter un anime qui a moins de 4 personnages.
- **Anime** : l'anime de la liste auquel le personnage est attribué (son titre dans `recommendations.json`, sans « (TV) » ni « (2011) »). Genres, studio, année et source viennent de cet anime. Âge, taille et noms acceptés comme pour l'Animedle.
- **Récap** : à la fin, le script affiche et écrit dans `.cache/weebdle/weebdle-recap.md` le nombre de personnages par anime, ceux sans âge, sans taille ou sans sexe (à compléter à la main), les personnages présents dans plusieurs animes et les noms partagés par plusieurs personnages.

Attention : relancer le script réécrit `data/weebdle.json`, et donc efface les corrections faites à la main.

### Données Pixeldle

Les personnages de jeu vidéo, tirés de [Wikidata](https://www.wikidata.org) : sexe, espèce, nationalité, occupation, couleur des cheveux, et les infos de leur 1er jeu (franchise, développeur, genres, année). La liste des franchises de départ est dans [data/pixeldle-franchises.json](data/pixeldle-franchises.json). Pour l'instant, [data/pixeldle.json](data/pixeldle.json) ne contient qu'un personnage factice : la récupération des vraies données est décrite dans [TODO-Pixeldle.md](TODO-Pixeldle.md).

## Installation

### Appli Discord

1. Sur le [Discord Developer Portal](https://discord.com/developers/applications) : *New Application*.
2. *Bot* > *Reset Token* : c'est le `DISCORD_TOKEN`. Sur la même page, activer *Message Content Intent* (pour lire les noms écrits dans le salon). Intent privilégié : au-delà de 100 serveurs, Discord demande une validation.
3. *OAuth2* > *URL Generator* : cocher les scopes `bot` et `applications.commands`, puis les permissions *View Channels*, *Send Messages*, *Embed Links* et *Read Message History*. Ouvrir l'URL générée pour inviter le bot sur le serveur.

### Lancer le bot

```
npm install
cp .env.example .env    # puis remplir .env (pas .env.example, qui est commité)
npm run build
npm run deploy-commands # à relancer quand les commandes ou la liste des sujets changent
npm start               # ou npm run dev pendant le développement (relance à chaque modif)
```

Variables du `.env` :

- `DISCORD_TOKEN` : le token du bot (secret).
- `DISCORD_CLIENT_ID` : *General Information* > *Application ID*.
- `DISCORD_GUILD_ID` : optionnel, l'ID du serveur de test (mode développeur de Discord, puis clic droit sur le serveur > *Copier l'identifiant*). Les commandes y apparaissent tout de suite, avec `/quizdebug`. Sans lui, `/quiz` est enregistrée en global.
- `DISCORD_OWNER_ID` : ton ID Discord, le seul compte qui peut lancer `/quizdebug`.

Dans VS Code, la config de lancement *Bot Discord* ([.vscode/launch.json](.vscode/launch.json)) démarre le bot avec le débogueur.

Tests : `npm test`. Type-check : `npm run typecheck`.

Pour le Raspberry : `npm run build`, puis `pm2 start ecosystem.config.cjs`.

### Fonctionnement

Le bot ne fait aucune requête réseau : les données sont dans `data/`, générées une fois à la main par les scripts. Le tirage du jour se fait au démarrage s'il n'y en a pas pour aujourd'hui, puis à minuit, jamais deux fois de suite la même réponse. Seul le tirage est sauvegardé, dans `state/daily.json` (hors git) : le jour et la réponse du jour de chaque sujet. Les parties ne sont gardées qu'en mémoire : un redémarrage les efface, et le salon peut relancer la partie du jour (même réponse).

### Debug

`/quizdebug reset` refait le tirage du jour et efface toutes les parties. Elle n'est enregistrée que sur le serveur de test (`DISCORD_GUILD_ID`), cachée aux non-admins, et seul `DISCORD_OWNER_ID` peut la lancer. Sans `DISCORD_GUILD_ID`, `deploy-commands` enregistre `/quiz` et `/guess` en global, sans la commande de debug.
