# TODO : données du Weebdle

Le Weebdle (`/quiz weebdle`) fait deviner un personnage tiré des animes conseillés sur le serveur. Le sujet est déjà branché ([src/subjects/weebdle/index.ts](src/subjects/weebdle/index.ts)), mais [data/weebdle.json](data/weebdle.json) ne contient qu'un personnage factice. Il faut le remplir avec les vrais personnages.

## Point de départ

- [data/recommendations.json](data/recommendations.json) : les 138 animes de la liste, avec leur `anilistId`, le titre anglais (`title`), le romaji, le format et l'année.
- [scripts/fetchAnime.ts](scripts/fetchAnime.ts) : le script de l'Animedle. Il fait déjà presque tout (requêtes AniList, âge, taille extraite de la description, noms acceptés, traductions des genres et des sources). Le nouveau script `scripts/fetchWeebdle.ts` (`npm run fetch:weebdle`) peut s'en inspirer, ou partager ses fonctions.
- Comme pour les autres sujets, le bot ne fait aucune requête : le script génère `data/weebdle.json` une fois, et on le commite.

## Attributs

Ce sont ceux de l'Animedle (`characterAttributes` dans [src/subjects/anime/index.ts](src/subjects/anime/index.ts)) : sexe, âge, taille, anime, genres, studio, année, source.

C'est une proposition : si la recherche montre que d'autres attributs sont plus pertinents ou mieux renseignés, on peut les changer. Dans ce cas, le Weebdle aura ses propres attributs au lieu de partager ceux de l'Animedle.

Différence avec l'Animedle : l'attribut **Anime** est l'anime **de la liste** auquel le personnage est attribué (voir plus bas), pas sa 1re série. Genres, studio, année et source viennent de cet anime.

## Récupération

En deux passes, pour ne jamais avoir à retirer puis compléter des entrées après coup.

### 1. Tout récupérer

Pour chaque anime de la liste : tous ses personnages, avec leur rôle (`MAIN` ou `SUPPORTING`), leurs favoris (la popularité) et leurs infos (sexe, âge, description pour la taille, noms, image). AniList limite à 30 requêtes par minute : prévoir des pauses et la reprise en cas d'erreur 429.

### 2. Attribuer chaque personnage à un seul anime

Un personnage peut apparaître dans plusieurs animes de la liste (Index et Railgun, Fate/Zero et Unlimited Blade Works, KonoSuba et le spin-off sur Megumin...). Il n'est gardé qu'une fois :

1. il revient à l'anime où il est **principal** ;
2. s'il est principal dans plusieurs (Touma dans Index et Railgun), c'est l'anime **sorti en premier** qui le garde ;
3. s'il n'est principal nulle part, c'est aussi l'anime sorti en premier.

### 3. Choisir 4 à 20 personnages par anime

Parmi les personnages attribués à l'anime à l'étape 2. On priorise les principaux, puis les secondaires. Les « au sort » utilisent un tirage **reproductible** (graine fixe par anime, par exemple son id AniList) : relancer le script redonne les mêmes personnages.

- **20 personnages ou moins :** on les prend tous, même s'il leur manque des infos (on complétera à la main).
- **Plus de 20 personnages :** on écarte d'abord ceux qui ont trop peu d'infos (par exemple ni âge ni taille), sauf s'il en faut pour arriver à 20. Puis :
  - **moins de 10 principaux :** tous les principaux, puis les places restantes en secondaires, moitié par popularité, moitié au sort ;
  - **10 principaux ou plus :** les 10 principaux les plus populaires, puis jusqu'à 6 de plus (16 au maximum) moitié par popularité, moitié au sort. Les places restantes vont aux secondaires, de la même façon ;
  - **moins de 8 places pour les secondaires :** uniquement par popularité.
- **Moins de 4 personnages :** on prend tout ce qu'il y a, et on le signale dans le récap du script.

Ne pas hésiter à garder des personnages qui paraissent très secondaires : une commande pour en retirer en cours de jeu est prévue (voir plus bas).

## Récap à la fin du script

Pour vérifier les données d'un coup d'œil :

- nombre de personnages par anime (et ceux sous 4) ;
- personnages sans âge, sans taille, sans sexe : la liste à compléter à la main ;
- personnages attribués à un autre anime que celui où on les attendait (doublons résolus).

## Plus tard (une fois les données là)

- **Noms ambigus :** avec 1 000 à 2 000 personnages, plus de prénoms partagés et plus de mots courants reconnus comme des noms dans la discussion. Pistes : afficher l'anime entre parenthèses dans l'autocomplétion de `/guess`, et un message qui demande de préciser quand un nom écrit dans le salon correspond à plusieurs personnages.
- **Retirer un personnage trop inconnu en cours de partie :** une commande (par exemple `/quizdebug remove <nom>`) qui l'ajoute à une liste d'exclusion versionnée (par exemple `data/weebdle-excluded.json`), respectée par le script de récupération. Si la partie du jour portait sur lui, nouveau tirage.

## Fin

Une fois les données en place : mettre à jour la section « Données Weebdle » du README, puis supprimer ce fichier.
