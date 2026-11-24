# Analyse : déduire l'habitat d'un Pokémon de ses lieux de capture

L'habitat officiel (Prairie, Forêt, Grotte, Mer…) n'existe que dans Rouge Feu / Vert Feuille, donc jusqu'à la 3e génération. Pour la 4e à la 8e, le Pokédle le déduit des lieux de capture PokeAPI ([scripts/pokemonHabitat.ts](../../pokemonHabitat.ts)). Ces scripts sont ceux qui ont servi à choisir et mesurer cette déduction, sur les 386 premiers Pokémon (dont on connaît le vrai habitat). Ils ne servent pas au bot : à garder si on veut améliorer les règles.

## Scripts

Les données téléchargées vont où on veut (ici `.cache/habitat/`, hors git) :

```sh
mkdir -p .cache/habitat
node scripts/analyses/habitat-pokemon/fetch.mjs .cache/habitat/data.json        # lieux + espèce des 386 premiers
node scripts/analyses/habitat-pokemon/fetchNew.mjs .cache/habitat/dataNew.json  # pareil pour les 387 à 1025

# Taux de réussite (variantes : tous les jeux / jeux de la 4G et après, avec ou sans la famille)
ROUTE=1 SEA=0.25 MT=1 TYPE=1 node scripts/analyses/habitat-pokemon/deduce.mjs .cache/habitat/data.json - data/pokemon.json
# + MANY=1 : plusieurs habitats quand les votes sont serrés ; FAMILY=1 : toute la famille vote ; SHOW=129 : détail d'un Pokémon
# RANGE=252-386 : une plage d'ids ; 2e argument = nom d'une variante pour afficher ses erreurs

node scripts/analyses/habitat-pokemon/rules.mjs .cache/habitat/data.json        # réussite règle par règle
```

## Résultats (novembre 2026)

- Un seul habitat déduit : **48 %** de justes avec les lieux des jeux de la 4G et après (ce qu'on aurait pour un Pokémon récent), 50 % avec tous les jeux. Pour comparer : toujours « Prairie » 21 %, au hasard 14 %.
- Plusieurs habitats (ceux qui ont au moins la moitié des votes du 1er, 3 au plus) : le vrai est dans la liste **55 %** du temps, **62 %** si toute la famille d'évolution vote ensemble. C'est le réglage retenu.
- Une évolution a **toujours** l'habitat de sa pré-évolution (184 sur 184) : un Pokémon récent dont la famille a un membre des 3 premières générations reprend son habitat officiel.
- Règles fiables : Coup d'Boule → Forêt (89 %), pêche en mer → Mer (74 %). Les noms de lieux, eux, disent peu (une ville ou une grotte contient de tout) : route → Prairie 26 %, ville → Ville 12 %.
- Plafond : l'habitat officiel est une étiquette choisie à la main, pas un résumé des lieux (Roucool : 30 routes et 1 forêt, classé Forêt). Ajouter des lieux n'y change rien.
- Lieux de capture PokeAPI par génération : 4G 71 %, 5G 83 %, 6G 76 %, 7G 69 %, 8G 61 %, **9G 0 %** (d'où l'arrêt à 905).
