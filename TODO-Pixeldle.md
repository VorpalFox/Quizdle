# TODO : données du Pixeldle

Le Pixeldle (`/quiz pixeldle`) fait deviner un personnage de jeu vidéo. Côté nombre de personnages, c'est terminé (validé avec FX le 23/11/2026). Ce fichier ne garde que ce qu'il reste à faire, et de quoi s'y retrouver.

## Où on en est

`npm run fetch:pixeldle` génère [data/pixeldle.json](data/pixeldle.json) : **2 471 personnages, 172 franchises**. Tout est en cache dans `.cache/pixeldle/` (hors git) : une relance prend 1 à 2 minutes, sauf pour les nouvelles pages de wiki.

Remplissage : sexe 100 %, espèce 100 %, nationalité 43 %, occupation 55 %, cheveux 58 %. Franchise, développeur, genres et année sont à 100 %.

Tests : `npx vitest run`. Types : `npx tsc --noEmit -p .`

### Les récaps (régénérés à chaque passage)

- `.cache/pixeldle/pixeldle-recap.md` : remplissage, franchises sous 4, personnages ajoutés depuis les wikis, années devinées, valeurs par indice, valeurs pas traduites, personnages sans sexe ou sans espèce, invités, noms partagés.
- `.cache/pixeldle/pixeldle-wikis.md` : le ou les wikis de chaque franchise, dans l'ordre où ils sont lus.
- `.cache/pixeldle/pixeldle-enrich.md` : ce que les wikis ont rempli, personnage par personnage, plus une rubrique « À vérifier ».

### Les fichiers

- [scripts/fetchPixeldle.ts](scripts/fetchPixeldle.ts) : le script principal (Wikidata, attribution, tirage, compléments des wikis, récap).
- [scripts/pixeldleWikidata.ts](scripts/pixeldleWikidata.ts) : les requêtes SPARQL.
- [scripts/pixeldleWikis.ts](scripts/pixeldleWikis.ts) : trouve les wikis de chaque franchise (`FANDOM_WIKIS`, `OTHER_WIKIS`, `ALTERNATIVE_FIRST`).
- [scripts/pixeldleEnrich.ts](scripts/pixeldleEnrich.ts) : lit les infobox pour compléter les personnages de Wikidata.
- [scripts/pixeldleWikiCharacters.ts](scripts/pixeldleWikiCharacters.ts) : ajoute des personnages depuis les wikis.
- [scripts/pixeldleTranslate.ts](scripts/pixeldleTranslate.ts) : les tables de traduction (espèce, occupation, genres, développeur, nationalité, sexe), plus `FRANCHISE_DEVELOPERS`.
- [data/pixeldle-franchises.json](data/pixeldle-franchises.json) : les franchises du quiz. `source` : `top100` ou `steam` (la liste de FX). `games` (optionnel) : les jeux que Wikidata ne relie pas à la série (American McGee's Alice).
- [data/pixeldle-manual.json](data/pixeldle-manual.json) : les corrections à la main (format dans le README) : `exclude`, `edit`, `add`, et `wikis` (réglages par franchise : `pages`, `preferred`, `limit`, `category`). Chaque correction a une `_raison`.

## À faire

1. **Sundered** : 0 personnage. FX remplit le wiki, puis on relance le script avec les bons réglages dans `wikis`.
2. **Valeurs à harmoniser** (rubriques « Valeurs : … » du récap) :
   - les doublons d'écriture : faits pour les espèces (Nomaï → Nomai) et les occupations (quasi-synonymes regroupés par `mergeOccupations` : Élève → Étudiant, Chef de clan → Dirigeant, Tueur → Assassin, Guerrier → Combattant, Dieu retiré) ;
   - **nationalité** : fait, tout en anglais (voir les règles). Reste, si les wikis ne suffisent pas, une table `FICTIONAL_PLACES` qui ajoute le lieu plus large (Pallet Town → Kanto) à côté de celui d'origine.
3. **Trous à combler** :
   - **sexe et espèce** : faits. Reste Liza (The World Next Door), à trancher ;
   - **années** : le jeu est cherché dans l'infobox, le modèle {{Games}}, puis l'introduction de la page (aussi pour les personnages de Wikidata sans jeu connu), et l'année, le studio et les genres sont ceux de ce jeu. Restent, dans le récap : 95 personnages des wikis et 99 de Wikidata à l'année du 1er jeu (souvent juste : jeux uniques, personnages du 1er jeu), et 233 années tirées de l'introduction, à relire. Piège connu : un reboot au même titre que le 1er jeu (God of War, Tomb Raider), corrigé à la main.
4. **La notion de « principal »** : peu fiable (voir la rubrique « Personnages par franchise » du récap). Elle ne sert plus qu'au tirage des franchises de plus de 20 personnages.
5. **Noms partagés** (109, listés dans le récap) : le bot les gère déjà (voir plus bas). Il reste les mots courants reconnus comme des noms dans la discussion.
6. **Wikipédia en dernier recours** : prévu au départ pour compléter les champs vides, pas encore fait.
7. **Fin** :
   - relire le jeu en vrai (`/quiz pixeldle`) ;
   - commiter les données et les scripts ;
   - mettre à jour la section « Données Pixeldle » du README (elle dit encore que le fichier ne contient qu'un personnage factice) ;
   - supprimer ce fichier.

## Règles à respecter (décidées avec FX)

### Choix des personnages

- **4 à 20 personnages par franchise.** Moins de 4, c'est accepté pour Green Hell, The Riftbreaker et The World Next Door (2 protagonistes chacun), et pour les jeux qui n'ont que leur avatar : Deep Rock Galactic, Hunt: Showdown, Icarus, Genesis Alpha One, Chants of Sennaar, plus Rust (avatar et Scientifique) et Satisfactory (avatar, ADA et Lizard Doggo).
- **Le protagoniste est toujours là**, qu'il soit un vrai personnage ou un avatar. Sur le modèle de Smash Bros. :
  - un protagoniste muet ou personnalisable est un **avatar**, avec son nom officiel (Dovahkiin, Sans-éclat, Tav…), sinon « Héros de <jeu> ». Le nom du jeu est en alias, et le sexe est « Au choix » s'il est personnalisable ;
  - un protagoniste personnalisable mais nommé par le jeu (Shepard, V) est un vrai personnage ;
  - un avatar au maximum par franchise.
- **Sans protagoniste unique** : jeux à héros multiples (Overwatch, LoL, jeux de combat…), Solasta (personnages de D&D), Age of Empires III (20 héros de la campagne).
- **Lapins crétins** : Rabbid Peach est gardé dans Rayman, pour qu'il y ait au moins un lapin crétin.
- **Dragon Quest** : seul le Héros de DQ III est gardé (un avatar par franchise).
- **Pokémon** : pas de Pokémon (le Pokédle les couvre), seulement des humains. Quatre protagonistes de jeux différents sont gardés d'office : Flora, Aurore, Ludvina et Serena, plus Sacha.
- **Une franchise par licence** : The Forest est retiré au profit de Sons of the Forest.
- **Franchises retirées** : L'Amerzone, The Planet Crafter, Astroneer (aucun personnage), Raving Rabbids (les Lapins crétins vont dans Rayman), The Forest.
- **Invités** : Sally Acorn, Drizzt et Saxton Hale sont retirés ; Clank, Ambessa, Rhonin, Blackhand, Claudia Wolf et Janice Quatlane sont gardés (ils viennent des jeux). Le récap les liste encore : c'est validé.
- **Pages d'un autre personnage** (« À vérifier » de `pixeldle-enrich.md`) : Xehanort, Villager et Talos (Divinité, comme Sigmar) sont validés tels que corrigés ; Bokoblin est retiré.
- **Pas d'invités d'une autre licence**. Un perso né dans un autre média de la même licence est gardé s'il fait ensuite partie intégrante d'un jeu (J.D. Morrison, venu de l'anime DMC). Idem pour les franchises tirées d'un autre média (Batman: Arkham, Hogwarts Legacy, Alice, Nancy Drew, Warhammer, Call of Cthulhu, The Witcher).
- **Pas de groupes ni d'objets** (« Companions », « Necromorphs », Geth, Galarien, Citizen, Epoch, le joueur d'Undertale…), pas de doublons, pas de versions d'un autre média (Netflix, DmC, Reincarnation, anime, film).

### Valeurs

- **Sexe** :
  - « Aucun » pour les robots, objets et entités sans sexe ;
  - « Autre » quand le jeu le laisse inconnu exprès (Frisk, le Traveler) ou quand le wiki dit « they » (No Man's Sky) ;
  - « Au choix » pour un avatar personnalisable.
- **Cheveux** :
  - l'infobox d'abord, sinon le texte de la page entière (section Appearance d'abord, « long blonde hair ») : extraits listés dans le récap, à relire ;
  - « N/A » pour un robot, un animal, une créature sans cheveux (`hairOrNone`), « Chauve » seulement pour un humain vraiment chauve.
- **1re apparition** : « Futur » (`FUTURE_YEAR`) pour un jeu pas encore sorti (Meryl, de Mother 4, un jeu de fans gardé exprès).
- **Espèce** (champ multiple, validé avec FX) :
  - dépliée à la fin par `expandSpecies` : un animal a son espèce plus « Animal » (Renard, Animal), une espèce composée ses deux parts (Demi-elfe → Humain, Elfe ; Talos : Humain, Divinité), une IA est un Robot ;
  - « Inconnu » quand le jeu la cache exprès (Meta Knight, Paimon, Chack) : pas de case vide ;
  - les Forgotlings sont aussi des « Objet » (des objets oubliés qui ont pris vie) ;
  - `defaults` donne « Humain » aux franchises réalistes dont le wiki ne dit pas l'espèce (Life is Strange, Far Cry…), Extraterrestre à Spore, Forgotling à Forgotton Anne ; les exceptions (animaux, IA, dieux, Anne qui est humaine) sont dans `edit` ;
  - « Au choix » pour un avatar dont on choisit la race (Dovahkiin, Tav…) ;
  - D'ni pour les D'ni de Myst, hybrides compris (Gehn, Atrus, ses enfants).
- **Genres** : pas de thèmes (LGBT, science-fiction, post-apo…).
- **Développeurs forcés** (`FRANCHISE_DEVELOPERS`) : Undertale → Toby Fox, Sly Cooper → Sucker Punch, Twelve Minutes → Luis Antonio, Rebel Galaxy → Double Damage Games, Breathedge → RedRuins Softworks.
- **Genres** :
  - les valeurs inconnues de Wikidata ne restent pas brutes : un genre nouveau est ajouté à `GENRE_RULES` (ramené à un des nôtres, gardé, ou retiré) ;
  - **Immersive sim** (`FRANCHISE_GENRES`, sur toute la franchise) : Dishonored, Deus Ex, BioShock, The Elder Scrolls, Fallout. Prey l'a par Wikidata.
- **Nationalité** (champ multiple, validé avec FX) : un max de lieux, de la ville au monde (« Pallet Town, Kanto », « Boston, Massachusetts, États-Unis »), 4 au plus :
  - Wikidata donne ses pays, le 1er wiki y ajoute tous ses champs « pays » et « lieu » (`parsePlaces`) ;
  - **tout en anglais**, comme la majorité des wikis : les tables donnent les noms anglais, et `FRENCH_PLACES` traduit les libellés français de Wikidata (Japon → Japan, Témérie → Temeria) ;
  - un lieu réel garde son nom et reçoit son pays (`CITIES`), ses écritures sont ramenées à une seule (`CITY_NAMES` : NYC → New York) ;
  - un gentilé devient le lieu, et les écritures d'un lieu de fiction sont ramenées à une seule (`PLACE_NAMES`) ;
  - retirés (`NOT_PLACES`, `NOT_PLACE`) : ce qui n'est pas un lieu (âge, mythologie, jeu), et les logements (« Jackie's Garage », une adresse) ;
  - la rubrique « Lieux par franchise » du récap sert à repérer deux écritures du même lieu.
- **Occupations** : le dictionnaire exact `OCCUPATIONS` passe avant les règles. Les rôles dans l'histoire (Antagonist, Ally, Companion), les liens de famille et les dieux sont retirés.

### Comment le script complète depuis les wikis

- Le wiki d'une franchise est lu si Wikidata y a moins de 4 personnages, ou si la franchise a des réglages dans `wikis` du manuel. On complète jusqu'à 12 personnages, ou jusqu'à `limit`.
- **Pages lues**, dans l'ordre :
  - les pages de `pages` (hors de la catégorie) ;
  - celles de `preferred` ;
  - puis la catégorie des personnages, les pages les plus longues d'abord.
- **Catégories essayées** : Characters, NPCs, Personnages, Character, People, ou `category`.
- **Une page est gardée** si on connaît le sexe du personnage : par l'infobox, sinon par les pronoms. Une page de `pages` ou de `preferred` est gardée même sans sexe, à compléter avec `edit`.
- **Un personnage ajouté à la main** (`add`) sans développeur, genres ou année prend ceux du 1er jeu de sa franchise. Il prend une place du tirage, mais ne dispense pas de lire le wiki.
- **Un personnage corrigé** (`edit`) est toujours gardé.
- **Ids** :
  - Wikidata : le QID ;
  - wiki : `wiki-<franchise>-<nom>` ;
  - un `exclude` sur un id laisse sa place au suivant.

### Côté bot (fait)

- **Noms partagés**, pour tous les sujets (`universeKey`) :
  - dans le salon, un nom qui désigne plusieurs personnages n'est pas joué, et le bot liste les homonymes ;
  - `/guess` affiche l'univers des homonymes.
- `/quizdebug remove` et `/quizdebug edit` marchent pour le Pixeldle : ils écrivent dans `data/pixeldle-manual.json`.

## Pistes abandonnées (pour ne pas les recreuser)

- **Les Fandom FR** : presque vides, 0 à 2 contributeurs.
- **Le wiki officiel de LoL** : que du gameplay, le Fandom passe d'abord pour le lore.
- **En dernier recours pour un petit jeu**, Gamicus (wiki de tous les jeux, infobox `{{Character}}`) a servi pour The World Next Door.
