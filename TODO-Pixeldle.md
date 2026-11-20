# TODO : données du Pixeldle

Le Pixeldle (`/quiz pixeldle`) fait deviner un personnage de jeu vidéo. Le sujet est déjà branché ([src/subjects/pixeldle/index.ts](src/subjects/pixeldle/index.ts)), mais [data/pixeldle.json](data/pixeldle.json) ne contient qu'un personnage factice. Il faut le remplir avec les vrais personnages.

Le TODO du Weebdle ([TODO-Weebdle.md](TODO-Weebdle.md)) suit la même logique : s'y référer en cas de doute, les règles ci-dessous en sont adaptées.

## Point de départ

- [data/pixeldle-franchises.json](data/pixeldle-franchises.json) : les 175 franchises du quiz.
  - `source: "top100"` : les 100 franchises les plus connues pour leurs personnages, choisies à la main.
  - `source: "steam"` : 75 franchises tirées de la bibliothèque Steam de FX, avec `steamGames` (ses jeux de la franchise).
  - `wikidataId` : la série ou la franchise sur Wikidata, ou le jeu quand il n'y a pas de série. 15 sont `null` (Sonic, Halo, Mass Effect, Tomb Raider, Assassin's Creed...) : Wikidata n'a que des doublons presque vides, ou le nom exact ne donne rien. À retrouver en début de traitement.
- [scripts/fetchAnime.ts](scripts/fetchAnime.ts) : le script de l'Animedle, à prendre comme modèle (structure, noms acceptés, récap). Le nouveau script : `scripts/fetchPixeldle.ts` (`npm run fetch:pixeldle`).
- Source : [Wikidata](https://www.wikidata.org), gratuit et sans clé. Requêtes SPARQL sur `https://query.wikidata.org/sparql` (une grosse requête vaut mieux que beaucoup de petites : l'API `w/api.php` limite vite). Toujours envoyer un `User-Agent` générique (ex : `quizdle-data/1.0`).
- Comme pour les autres sujets, le bot ne fait aucune requête : le script génère `data/pixeldle.json` une fois, et on le commite.

## Attributs

Choisis après un sondage de Wikidata (voir plus bas) : 5 sur le personnage, 4 sur son 1er jeu. Définis dans [src/subjects/pixeldle/index.ts](src/subjects/pixeldle/index.ts). Si l'un d'eux s'avère trop peu rempli une fois les données là, on l'enlève.

| Clé | Indice | Type | Source Wikidata | Rempli* | Remarque |
|---|---|---|---|---|---|
| `gender` | Sexe | exact | P21 | 35 % | Homme / Femme / Autre / Au choix (avatar personnalisable). Beaucoup à compléter à la main |
| `species` | Espèce | exact | P31 du personnage | ~98 % | À ramener à une petite liste : Humain, Animal, Robot / IA, Alien, Monstre, Créature, Divinité... Wikidata mélange vraies espèces (Hylien, Koopa) et catégories (« personnage de jeu vidéo », « personnage de Mario ») : ignorer les catégories |
| `nationality` | Nationalité | exact | P27 | 12 % | Pays réel ou monde de fiction (États-Unis, Hyrule, Royaume Champignon). Garder la plus spécifique (Mario : Royaume Champignon plutôt qu'États-Unis) |
| `occupation` | Occupation | set | P106 | 17 % | Valeurs très éclatées (plombier, épéiste, ingénieur, chasseur de monstre) : à regrouper en une vingtaine de métiers simples |
| `hair` | Cheveux | set | P1884 | 5 % | « cheveux bruns » → Bruns. « Chauve » pour les crânes rasés (Kratos), « — » pour les créatures sans cheveux |
| `franchise` | Franchise | exact | celle du fichier de franchises | 100 % | Le titre de [data/pixeldle-franchises.json](data/pixeldle-franchises.json) |
| `developer` | Développeur | exact | P178 du 1er jeu | 90 % | Garder un seul studio, le principal (Donkey Kong : Nintendo, pas ses 3 entrées) |
| `genres` | Genres | set | P136 du 1er jeu | 91 % | À ramener à une quinzaine de genres simples en français (Plates-formes, RPG, Action-aventure, Combat, FPS, TPS, Horreur, Survie, Stratégie...) |
| `year` | 1re apparition | number | P577 du 1er jeu | 95 % | 1er jeu : P4584 (1re apparition, 35 % des personnages), sinon le plus ancien des jeux où il apparaît (P1441 / P674) |

\* Sur 1 421 personnages et 191 jeux de 16 franchises (Mario, Zelda, Final Fantasy, Street Fighter, Resident Evil, The Witcher, Persona, Dark Souls, Fallout, Undertale, Control, Dead Space, Life Is Strange, Subnautica, BioShock, Portal), sondage du 19/11/2026.

### Ce qu'a montré le sondage

- **Les infos de jeu sont bien remplies, pas celles des personnages** : date, développeur, genre, plateforme et pays d'origine sont au-dessus de 88 % sur les jeux. Sur les personnages, seule P31 l'est ; nationalité, occupation et cheveux seront surtout à compléter à la main.
- **« Présent dans l'œuvre » (P1441) ramène aussi des non-personnages** : sur Mario, Zelda et Final Fantasy, 130 niveaux, 93 lieux, des objets, des pays. Ne garder que les éléments dont P31 est (une sous-classe de) personnage de fiction (Q95074), ou une espèce de fiction.
- **Les petits jeux n'ont souvent aucun personnage** (Firewatch, SOMA : 0 ; Dead Space : 4) : ils passeront par `data/pixeldle-manual.json`.
- **Le nombre de jeux reliés est incomplet** (Link n'est relié qu'à 1 jeu par P1441) : ne pas s'en servir seul pour décider qui est « principal ».
- **Les requêtes SPARQL lourdes expirent** (502, timeout) : récupérer d'abord les jeux d'une série (`?jeu wdt:P179 <série>`), puis leurs personnages avec `VALUES ?jeu { ... }`, franchise par franchise, plutôt qu'une union avec `BIND`. L'API `w/api.php` limite après quelques requêtes.
- **Écartés** : plateforme (portages tous listés, origine difficile à déduire), éditeur (redondant avec le développeur), pays d'origine du jeu, PEGI, mode de jeu, compositeur, lieu de l'action, rôle (héros / méchant, 5 % rempli), créateur, nombre de jeux, popularité. Pays d'origine (88 %) et PEGI (48 %, en ⬆️⬇️) sont les meilleurs remplaçants si un attribut est retiré.

Noms : le nom français s'il existe (label `fr`), sinon l'anglais. Noms acceptés (`aliases`) : l'autre langue, les alias Wikidata qui contiennent son nom, et le prénom ou le nom seul s'il n'appartient qu'à un personnage. Pas les surnoms trop courants (même règle que l'Animedle). Image : P18 si présente (souvent absente pour les personnages sous copyright, ce n'est pas grave).

## Le fichier écrit à la main

`data/pixeldle-manual.json`, à créer. Le script le **fusionne** avec ce qu'il récupère :

- il ajoute des personnages que Wikidata n'a pas (les avatars, voir plus bas, et les oublis) ;
- il complète ou corrige des champs d'un personnage récupéré (même `id`) : un âge, une espèce, un nom mal traduit ;
- il est versionné, et le script ne l'écrase jamais.

Pour un personnage ajouté à la main, on renseigne ce qui concerne le personnage (nom, alias, sexe, espèce, nationalité, occupation, cheveux, franchise, et son 1er jeu) : le script calcule le reste à partir du jeu (développeur, genres, année).

## Récupération

En deux passes, pour ne jamais avoir à retirer puis compléter des entrées après coup.

### 1. Tout récupérer

Pour chaque franchise : tous ses personnages, avec leurs infos et leur popularité (nombre de Wikipédias qui ont une page sur eux, `wikibase:sitelinks`). Pistes pour les trouver :

- personnages dont la franchise est la nôtre (P8345) ;
- personnages présents dans un jeu de la série (P1441, « présent dans l'œuvre ») ;
- personnages listés sur les jeux de la série (P674, « personnages ») ;
- jeux de la série : P179 (« fait partie de la série »).

Les créatures comptent comme des personnages : les Pals de Palworld, les dinos d'ARK, les Léviathans de Subnautica... Exception : **Pokémon**, pour ne pas refaire le Pokédle. Garder les humains (Red, Sacha, Professeur Chen...) et seulement quelques Pokémon emblématiques (Pikachu, Mewtwo).

Personnages venus d'autres médias (BD, livres, films) : acceptés seulement pour les franchises qui en sont faites (Batman: Arkham, Hogwarts Legacy, Alice: Madness Returns, Nancy Drew, Warhammer, Call of Cthulhu, The Witcher). Ailleurs, un personnage invité (Mickey dans Kingdom Hearts, les invités de Smash) n'est pas un personnage de la franchise.

### 2. Attribuer chaque personnage à une seule franchise

Un personnage peut apparaître dans plusieurs franchises de la liste (Mario dans Donkey Kong, Wario dans Super Mario, les invités de crossovers...). Il n'est gardé qu'une fois :

1. il revient à la franchise où il a fait sa **1re apparition** (P4584) ;
2. si on ne sait pas, à celle où il est **principal** (protagoniste, ou présent dans le plus de jeux de la série) ;
3. sinon, à la franchise **sortie en premier**.

### 3. Choisir 4 à 20 personnages par franchise

Parmi les personnages attribués à la franchise à l'étape 2. Même règle que le Weebdle. Wikidata n'a pas de rôle « principal / secondaire » : est **principal** un personnage protagoniste, jouable, ou présent dans au moins la moitié des jeux de la série. Les autres sont **secondaires**. La **popularité** est le nombre de Wikipédias. Les « au sort » utilisent un tirage **reproductible** (graine fixe par franchise, par exemple son `wikidataId` ou son titre) : relancer le script redonne les mêmes personnages.

- **20 personnages ou moins :** on les prend tous, même s'il leur manque des infos (on complétera à la main).
- **Plus de 20 personnages :** on écarte d'abord ceux qui ont trop peu d'infos (par exemple ni sexe ni espèce), sauf s'il en faut pour arriver à 20. Puis :
  - **moins de 10 principaux :** tous les principaux, puis les places restantes en secondaires, moitié par popularité, moitié au sort ;
  - **10 principaux ou plus :** les 10 principaux les plus populaires, puis jusqu'à 6 de plus (16 au maximum) moitié par popularité, moitié au sort. Les places restantes vont aux secondaires, de la même façon ;
  - **moins de 8 places pour les secondaires :** uniquement par popularité.
- **Moins de 4 personnages :** on prend tout ce qu'il y a, et on le signale dans le récap. Exception admise pour les jeux de survie ou de gestion : un avatar et quelques créatures suffisent.

Ne pas hésiter à garder des personnages qui paraissent très secondaires : une commande pour en retirer en cours de jeu est prévue (voir plus bas).

### 4. Avatars (protagonistes muets ou personnalisables)

Sur le modèle de Smash Bros. (le Héros de Dragon Quest, Steve de Minecraft, le Villageois d'Animal Crossing) :

1. **Par défaut**, chaque franchise a un avatar dans `data/pixeldle-manual.json`.
2. **On le retire** si le protagoniste est un **personnage défini**, avec un nom et une apparence imposés : Geralt, Lara Croft, Henry (Kingdom Come), Isaac Clarke (Dead Space)...
3. **On le garde** si le protagoniste est muet ou personnalisable, même si le jeu a d'autres personnages : Skyrim, Elden Ring, Dark Souls, Fallout 4, Baldur's Gate 3, Satisfactory...
4. **Cas limite :** un protagoniste personnalisable mais nommé par le jeu (Shepard dans Mass Effect, V dans Cyberpunk 2077) est un vrai personnage, pas un avatar.
5. **Nom :** son nom officiel s'il en a un (le Dovahkiin, le Sans-éclat, l'Élu mort-vivant, Tav, le Survivant unique, le Pionnier, le Voyageur), sinon le nom du jeu (« le héros de Rust »), avec le nom du jeu en alias dans tous les cas. Sexe « Au choix » s'il est personnalisable, espèce selon le jeu.
6. **Un avatar au maximum par franchise.**

Point de départ pour les jeux de survie de la liste Steam :

| Jeu | Avatar | Créatures et autres personnages possibles |
|---|---|---|
| Satisfactory | le Pionnier | ADA, Lizard Doggo |
| No Man's Sky | le Voyageur | Nada, Polo, Artemis, l'Atlas |
| ARK | le Survivant | les dinos emblématiques (Rex, Raptor...), Helena, Rockwell |
| Rust | le Survivant (« le héros de Rust ») | les scientifiques |
| Astroneer | l'Astroneer | |
| Hunt: Showdown | le Chasseur | les boss (le Boucher, l'Araignée, Scrapbeak...) |
| Icarus | le Prospecteur | |
| The Planet Crafter | à trouver | |
| Spore | la Créature | Steve |
| Genesis Alpha One | le Capitaine | |

## Récap à la fin du script

Pour vérifier les données d'un coup d'œil :

- nombre de personnages par franchise (et celles sous 4) ;
- franchises sans `wikidataId` ou sans aucun personnage trouvé ;
- **avatars gardés**, à relire (un jeu de niche mal renseigné peut en avoir un à tort) ;
- personnages sans sexe, sans espèce, sans année : la liste à compléter dans `data/pixeldle-manual.json` ;
- personnages attribués à une autre franchise que celle où on les attendait (doublons résolus).

## Plus tard (une fois les données là)

- **Noms ambigus :** avec un millier de personnages, plus de prénoms partagés et plus de mots courants reconnus comme des noms dans la discussion. Pistes : afficher la franchise entre parenthèses dans l'autocomplétion de `/guess`, et un message qui demande de préciser quand un nom écrit dans le salon correspond à plusieurs personnages.
- **Retirer un personnage trop inconnu en cours de partie :** une commande (par exemple `/quizdebug remove <nom>`) qui l'ajoute à une liste d'exclusion versionnée, respectée par le script. Si la partie du jour portait sur lui, nouveau tirage. Même commande que pour le Weebdle si elle existe déjà.

## Fin

Une fois les données en place : mettre à jour la section « Données Pixeldle » du README, puis supprimer ce fichier.
