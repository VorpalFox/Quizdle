# Quizdle

Bot Discord de quiz façon -dle (Pokédle, Animedle, Weebdle, Pixeldle), tous sur le même bot : on doit trouver un élément mystère, et chaque proposition donne un indice par attribut. Une partie par salon, et tout le salon joue ensemble.

## Utilisation

- `/quiz pokedle`, `/quiz animedle`, `/quiz weebdle` ou `/quiz pixeldle` : lance le quiz du jour dans le salon (un Pokémon, un personnage d'anime populaire, un personnage des animes conseillés sur le serveur, ou un personnage de jeu vidéo). La réponse est la même pour tout le monde ce jour-là et change à minuit (heure de Paris). Une partie par jour, par salon et par sujet.
- Écrire un nom directement dans le salon pendant une partie : c'est une proposition. Les messages qui ne sont pas un nom du quiz sont ignorés, on peut donc discuter normalement. Les accents et la casse sont ignorés, le nom anglais marche aussi, et une faute de frappe est tolérée si le mot tapé fait au moins 4 lettres (« Roocool » → Roucool, « Ratattac » → Rattatac), sauf si deux noms collent.
- `/guess name:<nom>` : pareil, mais avec l'autocomplétion pendant la frappe (sans les noms déjà proposés). Pratique pour « Nidoran♀ » ou « M. Mime ».
- `/quiz board` : la grille de toutes les propositions, la plus récente en haut.
- `/quiz giveup` : abandonne la partie et donne la réponse.

Indices : 🟩 juste · 🟨 en partie (ex : un type sur deux, les valeurs en commun sont en gras) · 🟥 faux · ⬆️ la réponse est plus grande · ⬇️ la réponse est plus petite · ❔ la réponse n'a pas cette info (âge inconnu, cheveux pas renseignés...), l'indice ne dit rien.

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

`npm run fetch:pokemon` régénère [data/pokemon.json](data/pokemon.json) depuis PokeAPI (les 905 premiers par défaut, jusqu'à la 8e génération : PokeAPI n'a aucun lieu de capture pour la 9e, donc pas d'habitat possible). Pour moins : `npm run fetch:pokemon -- 386`. Indices : types, habitat, groupes d'œufs (noms officiels : Monstrueux, Terrestre, Aquatique 1...), couleur, stade d'évolution, taille, poids, génération. Les groupes d'œufs existent pour tous les Pokémon.

L'habitat officiel n'existe que dans Rouge Feu et Vert Feuille, donc jusqu'à la 3e génération. Au-delà ([scripts/pokemonHabitat.ts](scripts/pokemonHabitat.ts)) :
- si la famille d'évolution a un membre des 3 premières générations, on reprend son habitat (Magnézone → celui de Magnéton) : une évolution a toujours l'habitat de sa pré-évolution ;
- sinon, il est déduit des lieux de capture de toute la famille (route → Prairie, Coup d'Boule → Forêt, pêche en mer → Mer...). Quand les votes sont serrés, il y en a plusieurs (3 au plus) : l'habitat est une liste, comme les types ;
- sans aucun lieu : Rare pour un légendaire, sinon selon le type (les starters).

C'est approximatif : testé sur les 386 premiers, le vrai habitat est dans la liste déduite 62 % du temps.

### Données Animedle

`npm run fetch:anime` régénère [data/anime.json](data/anime.json) depuis [AniList](https://anilist.co) : les 200 personnages les plus mis en favoris (`npm run fetch:anime -- 300` pour en prendre plus). Ça prend environ 30 s, AniList limitant le nombre de requêtes par minute.

- **Univers** : la franchise du personnage. On part de la 1re série TV où il apparaît, on remonte ses préquelles sur AniList, et on garde la série la plus ancienne (TV de préférence) : Jotaro → « JoJo's Bizarre Adventure » plutôt que Diamond is Unbreakable, Vegeta → « Dragon Ball ». Titre anglais sinon romaji, sans « Season 2 » ni « (2011) ». Les relations sont gardées dans `.cache/anime/`. Genres, année et studio viennent de la série où il apparaît, pas de la 1re de l'univers.
- **Âge** : le 1er nombre donné par AniList (« 17-18 » → 17). Absent pour environ 15 % des personnages.
- **Sexe** : celui d'AniList, sinon celui des pronoms de la description (« he », « his » ou « she », « her » : au moins un, et deux fois plus que ceux de l'autre sexe). Testé sur les personnages dont on connaît le sexe : 0,8 % d'erreurs.
- **Occupation** et **cheveux** : AniList n'a pas de champ pour ça. Ils sont tirés de la description quand elle en parle : une ligne « Occupation: Teacher » ou « Hair Color: Black », sinon le texte (« is a young nun » → Nun, « long black hair » → Noirs). L'occupation tirée du texte est moins sûre : à relire. Environ 30 % des personnages de l'Animedle ont une occupation, 4 % des cheveux ; le reste est à compléter à la main.
- **Wikidata** : ce qui manque (sexe, occupation, cheveux) est d'abord pris sur [Wikidata](https://www.wikidata.org) ([scripts/wikidata.ts](scripts/wikidata.ts)). Beaucoup de personnages y ont leur ID AniList : le lien est sûr, sans recherche par nom, et tout arrive en quelques requêtes. Environ 300 personnages complétés au Weebdle, 100 à l'Animedle, surtout pour les cheveux. Gardé dans `.cache/wikidata/`.
- **Fandom** : ensuite, l'infobox du wiki Fandom de l'anime ([scripts/fandom.ts](scripts/fandom.ts)), très fournie même pour les secondaires (`hair`, `occupation`, `gender`...). Le wiki de chaque anime est deviné à partir du titre (`deathnote`, `spy-x-family`...), sauf ceux de la table `WIKIS` (Re:Zero → `rezero`, Fate → `typemoon`...). La page du personnage : le lien direct de Wikidata s'il existe, sinon son nom et ses alias. Les wikis décrivent parfois les cheveux en détail : on garde les 2 premières couleurs citées. Environ 1 100 personnages complétés au Weebdle. Les animes sans wiki trouvé sont listés dans le récap : à ajouter dans `WIKIS`. Gardé dans `.cache/fandom/` : une quinzaine de minutes la 1re fois.
- **Wikipédia** : ce qui manque encore est pris dans l'infobox de la page Wikipédia du personnage, FR d'abord puis EN ([scripts/wikipedia.ts](scripts/wikipedia.ts)). La page doit citer l'anime, sinon c'est un homonyme. Seuls les gros personnages ont une page : une dizaine complétés en plus de Wikidata. Les réponses sont gardées dans `.cache/wikipedia/` : quelques minutes la 1re fois, puis plus aucune requête.
- **Traduction** : à la fin, les occupations en anglais sont traduites avec [scripts/translate.ts](scripts/translate.ts) : un dictionnaire (« Student » → Élève), puis des règles par mot-clé (« leader », « head of », « CEO » → Leader, « Water Hashira » → Pourfendeur de démons, « guitarist » → Musicien, « Member of… » retiré...). Celles qui ne passent nulle part restent telles quelles et sont listées par le script : une règle si c'est générique, sinon une correction du perso dans le fichier `manual`.
- **Noms acceptés** : le nom complet dans les deux ordres, les variantes qui contiennent son nom (« Monkey D. Luffy »), et le prénom ou le nom seul s'il n'appartient qu'à un personnage (« Luffy » oui, « Elric » non). Pas les surnoms (« Master », « Zero »...), qui seraient pris pour des propositions dans la discussion.

### Données Weebdle

Les personnages des animes conseillés sur le serveur, avec les mêmes indices que l'Animedle. La liste des animes est dans [data/recommendations.json](data/recommendations.json), recopiée à la main depuis le salon #conseil-en-anime : pour la revérifier, `npm run dump:recos` écrit tous les messages du salon dans `.cache/discord/recos.txt` (hors git, avec le token du bot). Pour retirer un anime entier, le retirer de cette liste. `npm run fetch:weebdle` régénère [data/weebdle.json](data/weebdle.json) depuis AniList ([scripts/fetchWeebdle.ts](scripts/fetchWeebdle.ts)).

- **Récupération** : tous les personnages de chaque anime de la liste. Les réponses sont gardées dans `.cache/weebdle/` (hors git) : si le script s'arrête, le relancer reprend où il en était, et une relance complète ne refait aucune requête. Pour retélécharger, supprimer ce dossier. Compter une vingtaine de minutes la 1re fois.
- **Un personnage, un anime** : un personnage présent dans plusieurs animes de la liste (Index et Railgun, Fate/Zero et UBW...) revient à l'anime où il est principal, et s'il l'est dans plusieurs, ou nulle part, à celui sorti en premier.
- **4 à 20 personnages par anime** : tous s'il y en a 20 ou moins. Au-delà, on écarte ceux qui n'ont ni âge, ni occupation, ni cheveux (sauf s'il en faut pour arriver à 20), puis on prend les principaux (les 10 plus populaires, et jusqu'à 6 de plus) et on complète avec des secondaires, moitié par popularité, moitié au sort. Le tirage a une graine fixe (l'id AniList de l'anime) : relancer le script redonne les mêmes personnages. Les figurants ne servent qu'à compléter un anime qui a moins de 4 personnages.
- **Anime** : l'anime de la liste auquel le personnage est attribué (son titre dans `recommendations.json`, sans « (TV) » ni « (2011) »). Genres, année et studio viennent de cet anime. Âge, occupation, cheveux, compléments Wikidata, Fandom et Wikipédia, traduction et noms acceptés comme pour l'Animedle.
- **Récap** : à la fin, le script affiche et écrit dans `.cache/weebdle/weebdle-recap.md` le nombre de personnages par anime, ceux complétés par Wikidata, Fandom et Wikipédia, les animes sans wiki Fandom, les occupations pas traduites, ceux sans sexe, sans âge, sans occupation ou sans cheveux (à compléter à la main), les personnages présents dans plusieurs animes et les noms partagés par plusieurs personnages.

### Corrections à la main (Animedle et Weebdle)

Ne pas modifier `data/anime.json` ni `data/weebdle.json` à la main : les scripts les réécrivent. Les corrections vont dans [data/anime-manual.json](data/anime-manual.json) et [data/weebdle-manual.json](data/weebdle-manual.json), à la main ou avec `/quizdebug remove` et `/quizdebug edit` (voir Debug). Les scripts les appliquent à chaque génération sans jamais les modifier, et le bot au démarrage :

```json
{
 "exclude": ["307811"],
 "edit": {
  "27": { "_nom": "Killua Zoldyck", "hair": ["Blancs"], "occupation": ["Assassin"] },
  "45627": { "_nom": "Levi", "age": 30 }
 },
 "add": [
  { "id": "manuel-1", "name": "Nom", "aliases": [], "attributes": { "gender": "Homme", "age": 20, "occupation": null, "hair": ["Roux"], "anime": "...", "genres": ["Action"], "year": 2011, "studio": "..." } }
 ]
}
```

- **`exclude`** : les ids des personnages à retirer. Au Weebdle, sa place revient au suivant du tirage ; à l'Animedle, il n'est pas remplacé.
- **`edit`** : id → champs à remplacer, soit `name`, `aliases` ou `image`, soit un attribut (`gender`, `age`, `occupation`, `hair`, `anime`, `genres`, `year`, `studio`). Les autres champs gardent la valeur d'AniList. Les clés qui commencent par `_` sont ignorées : `_nom` sert juste à s'y retrouver. Au Weebdle, un personnage corrigé est **toujours gardé**, même s'il n'avait pas été tiré : pour ajouter un personnage AniList de la liste, il suffit de le corriger.
- **`add`** : des personnages complets, absents d'AniList.
- **`wikis`** (Pixeldle seulement) : titre de la franchise → réglages de la recherche de personnages dans son wiki (lue si Wikidata a moins de 4 personnages, ou dès que la franchise est réglée ici) : `pages` (pages à lire en plus de la catégorie, prises en premier), `preferred` (pages à prendre d'abord), `limit` (nombre de personnages au plus, 12 par défaut), `category` (catégorie des personnages, si ce n'est pas « Characters »).
- **`defaults`** (Pixeldle seulement) : titre de la franchise → valeurs des attributs restés vides (`{ "species": "Humain" }` pour une franchise réaliste dont le wiki ne donne pas l'espèce). Appliquées avant `edit`, qui corrige les exceptions.
- Les ids sont ceux d'AniList (dans l'URL `anilist.co/character/<id>`, ou dans le récap). Ce qui ne colle pas (id inconnu, attribut mal écrit) est signalé à la fin du script.
- Le tirage du Weebdle est stable : chaque personnage a un rang « au sort » fixe. Retirer ou corriger un personnage ne change que la place concernée, pas le reste de la sélection.


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
- `DISCORD_DEBUG_CHANNEL_ID` : l'ID d'un salon du serveur de test (clic droit sur le salon > *Copier l'identifiant*). `/quizdebug` ne marche que dans ce salon.

Dans VS Code, la config de lancement *Bot Discord* ([.vscode/launch.json](.vscode/launch.json)) démarre le bot avec le débogueur.

Tests : `npm test`. Type-check : `npm run typecheck`.

Pour le Raspberry : `npm run build`, puis `pm2 start ecosystem.config.cjs`.

### Fonctionnement

Le bot ne fait aucune requête réseau : les données sont dans `data/`, générées une fois à la main par les scripts. Le tirage du jour se fait au démarrage s'il n'y en a pas pour aujourd'hui, puis à minuit, jamais deux fois de suite la même réponse. Seul le tirage est sauvegardé, dans `state/daily.json` (hors git) : le jour et la réponse du jour de chaque sujet. Les parties ne sont gardées qu'en mémoire : un redémarrage les efface, et le salon peut relancer la partie du jour (même réponse).

### Debug

- `/quizdebug reset` refait le tirage du jour et efface toutes les parties.
- `/quizdebug remove subject:<Animedle|Weebdle> name:<personnage>` retire un personnage pour de bon : il est ajouté à `exclude` dans le fichier de corrections du sujet, et disparaît tout de suite du quiz. Si c'était la réponse du jour, nouveau tirage pour les parties suivantes (celles en cours gardent leur réponse).
- `/quizdebug edit subject:<...> name:<personnage> attribute:<attribut> value:<valeur>` change ou remplit un attribut : écrit dans `edit`, appliqué tout de suite, parties en cours comprises. Plusieurs valeurs : « Blancs, Noirs ». Vide : « - ». Si personne d'autre n'a cette valeur, le bot le signale et donne les plus courantes (pour écrire « Blancs » comme les autres, pas « blanc »).

L'autocomplétion du nom affiche l'anime entre parenthèses, pour ne pas confondre deux homonymes. Le bot relit les fichiers de corrections au démarrage : une correction survit à un redémarrage. Sur le Raspberry, ces fichiers changent donc dans `data/` : penser à les commiter depuis le Raspberry (ou à les recopier) pour ne pas les perdre au prochain `git pull`.

Les commandes de debug ne sont enregistrées que sur le serveur de test (`DISCORD_GUILD_ID`), et le bot ne les accepte que dans le salon `DISCORD_DEBUG_CHANNEL_ID` : tous ceux qui peuvent écrire dans ce salon peuvent s'en servir (attention, `reset` touche tous les serveurs). La commande reste visible dans les autres salons du serveur, où elle est refusée ; pour la cacher : *Paramètres du serveur* > *Intégrations* > le bot > `/quizdebug`, et ne l'autoriser que dans ce salon. Sans `DISCORD_GUILD_ID`, `deploy-commands` enregistre `/quiz` et `/guess` en global, sans la commande de debug.
