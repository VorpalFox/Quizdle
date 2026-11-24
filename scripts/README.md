# Scripts : génération des données

Le bot ne fait aucune requête réseau : il lit `data/`. Ces scripts remplissent `data/` depuis les API (AniList, PokeAPI, Wikidata, Fandom, Wikipédia), puis les fichiers générés sont commités. Ils tournent avec `tsx` et ne font pas partie du build du bot.

Les choix faits (sources, règles, cas particuliers, pistes abandonnées, ce qui reste à faire) sont expliqués en commentaire en tête de chaque script.

## Les sujets

| Sujet | Commande | Source | Script | Liste de départ |
|---|---|---|---|---|
| Pokédle | `npm run fetch:pokemon` | PokeAPI | [fetchPokemon.ts](fetchPokemon.ts) | les 905 premiers Pokémon (jusqu'à la 8e génération) |
| Animedle | `npm run fetch:anime` | AniList, Wikidata, Fandom, Wikipédia | [fetchAnime.ts](fetchAnime.ts) | les 200 personnages les plus en favoris sur AniList |
| Weebdle | `npm run fetch:weebdle` | AniList, Wikidata, Fandom, Wikipédia | [fetchWeebdle.ts](fetchWeebdle.ts) | les animes de [data/recommendations.json](../data/recommendations.json) |
| Pixeldle | `npm run fetch:pixeldle` | Wikidata, wikis des franchises, Wikipédia | [fetchPixeldle.ts](fetchPixeldle.ts) | les franchises de [data/pixeldle-franchises.json](../data/pixeldle-franchises.json) |

La liste du Weebdle est recopiée à la main du salon #conseil-en-anime : `npm run dump:recos` ([dumpRecommendations.ts](dumpRecommendations.ts)) écrit tous ses messages dans `.cache/discord/recos.txt` pour la revérifier.

## Les étapes

Les scripts suivent tous à peu près le même chemin :

1. **Récupérer** les personnages de la liste de départ.
2. **Attribuer** chaque personnage à un seul anime ou une seule franchise, puis **choisir** 4 à 20 personnages par anime ou franchise (Weebdle, Pixeldle).
3. **Compléter** les indices que la source principale n'a pas. Chaque source ne remplit que ce qui est resté vide, dans l'ordre :
   - Animedle et Weebdle : AniList (champ, sinon description), [wikidata.ts](wikidata.ts) (par l'ID AniList), [fandom.ts](fandom.ts) (l'infobox, puis les cheveux décrits dans le texte), [wikipedia.ts](wikipedia.ts) (l'infobox, FR puis EN).
   - Pixeldle : [pixeldleWikidata.ts](pixeldleWikidata.ts), puis le wiki de chaque franchise ([pixeldleWikis.ts](pixeldleWikis.ts) le trouve, [pixeldleEnrich.ts](pixeldleEnrich.ts) lit l'infobox, [pixeldleWikiCharacters.ts](pixeldleWikiCharacters.ts) ajoute des personnages quand Wikidata en a trop peu), puis Wikipédia en dernier recours.
   - Pokédle : l'habitat officiel s'arrête à la 3e génération. Après, il est déduit des lieux de capture ([pokemonHabitat.ts](pokemonHabitat.ts)).
4. **Traduire** les valeurs vers de courtes listes en français, pour que les indices se comparent : [translate.ts](translate.ts) (occupations de l'Animedle et du Weebdle), [pixeldleTranslate.ts](pixeldleTranslate.ts) (tout le Pixeldle).
5. **Appliquer les corrections à la main** (`data/<sujet>-manual.json`, voir plus bas).
6. **Écrire** `data/<sujet>.json` et un récap dans `.cache/<sujet>/` : ce qui manque, ce qui est deviné et à relire, les valeurs pas traduites.

Le code partagé : [anilist.ts](anilist.ts) (Animedle et Weebdle), [wikiText.ts](wikiText.ts) (cheveux dans le texte, pages d'homonymie, âge des infobox : Weebdle et Pixeldle).

## Le cache

Les réponses des API sont gardées dans `.cache/` (hors git) : un script interrompu reprend où il en était, et une relance ne refait aucune requête. La 1re fois, compter de quelques minutes à une vingtaine. Pour rafraîchir une source, supprimer son dossier (`.cache/weebdle/`, `.cache/fandom/`...).

## Mettre à jour les données

1. Lancer le script du sujet.
2. Lire le récap dans `.cache/<sujet>/`.
3. Corriger : une règle ou une traduction générique dans le script, un cas isolé dans `data/<sujet>-manual.json`.
4. Relancer, c'est immédiat grâce au cache, puis commiter `data/`.

## Corrections à la main

Ne pas modifier `data/<sujet>.json` : les scripts le réécrivent. Les corrections vont dans `data/<sujet>-manual.json`, à la main ou avec `/quizdebug` (voir *Debug* dans le [README](../README.md#debug)). Elles sont appliquées à chaque génération et au démarrage du bot :

```json
{
 "exclude": ["307811"],
 "edit": { "27": { "_nom": "Killua Zoldyck", "gender": "Homme", "hair": { "plus": ["Blancs"], "moins": ["Bruns"] } } },
 "add": [{ "id": "manuel-1", "name": "Nom", "attributes": { "gender": "Homme", "...": "..." } }]
}
```

- `exclude` : retire un personnage. `edit` : corrige des champs ou des attributs (les clés en `_` sont des notes). Un attribut à plusieurs valeurs prend les valeurs à ajouter (`plus`) et à retirer (`moins`), sans toucher aux autres : les tags ajoutés par les scripts (Monde réel, l'occupation tirée de l'arme...) restent, et une vraie valeur ajoutée remplace « Inconnu » (ou « Aucune », « N/A », « Au choix »). Les autres attributs sont remplacés. Les corrections passent avant les enrichissements des scripts, qui en profitent, puis encore une fois à la fin, pour avoir le dernier mot. `add` : un personnage absent de la source.
- Pixeldle seulement : `wikis` (réglages de la recherche de personnages dans le wiki d'une franchise) et `defaults` (valeurs des attributs vides d'une franchise, avant `edit`).

Le détail est dans [src/subjects/manual.ts](../src/subjects/manual.ts).

## Tests et analyses

- [test/](test/) : les tests des scripts (lecture des infobox, traductions, déduction de l'habitat...), lancés avec ceux du bot par `npm test`.
- [analyses/](analyses/) : des études ponctuelles qui ont servi à choisir des règles, gardées pour les reprendre. Elles ne servent ni au bot ni à la génération. Pour l'instant : [habitat-pokemon](analyses/habitat-pokemon/README.md), qui a permis de choisir et de mesurer la déduction de l'habitat.
