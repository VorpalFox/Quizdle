// Réussite de chaque correspondance « lieu / méthode → habitat », sur les jeux de la 4G et après
import { readFileSync } from 'node:fs'
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const OLD_GAMES = new Set(['red', 'blue', 'yellow', 'gold', 'silver', 'crystal', 'ruby', 'sapphire', 'emerald', 'firered', 'leafgreen', 'colosseum', 'xd'])
const FR = { 'grassland': 'Prairie', 'forest': 'Forêt', 'rough-terrain': 'Terrain accidenté', 'mountain': 'Montagne', 'cave': 'Grotte', 'sea': 'Mer', 'waters-edge': 'Bord de l\'eau', 'urban': 'Ville', 'rare': 'Rare' }

// [libellé, test (aire, méthode), habitat] : le 1er qui correspond gagne
const RULES = [
  ['Méthode ignorée (don, échange, raid, fixe…)', (a, m) => /gift|trade|static|snag|max-raid|dynamax|colosseum|pokemon-channel|island-scan|pokeflute|devon-scope|roaming|only-one/.test(m), null],
  ['Pêche / surf dans un lieu marin (route marine, mer, plage, îles…)', (a, m) => /rod|surf|water|seaweed|feebas|bubbling/.test(m) && /sea\b|sea-|beach|\bbay\b|ocean|shoal|lagoon|pacifidlog|cianwood|whirl-islands|coast|undersea|harbor|port|hoenn-route-(10[5-9]|12[2-9]|13[0-4])|sinnoh-route-(220|223|226|230)/.test(a), 'sea'],
  ['Pêche / surf ailleurs (lac, rivière, route, ville…)', (a, m) => /rod|surf|water|seaweed|feebas|bubbling/.test(m), 'waters-edge'],
  ['Éclate-Roc', (a, m) => m === 'rock-smash', 'rough-terrain'],
  ['Coup d\'Boule / arbre à miel', (a, m) => /headbutt|honey-tree/.test(m), 'forest'],
  ['Mont / mine / tunnel de montagne (mt-, mount, mine, Route Victoire…)', a => /\bmt-|mount|mine\b|mountain|iron-island|rock-tunnel|victory-road/.test(a), 'mountain'],
  ['Grotte (cave, tunnel, ruines, puits, gouffre…)', a => /cave|cavern|tunnel|chamber|ruins?\b|\bwell\b|hole|chasm|lair|granite|meteor-falls|seafoam|grotto|underground|wayward|maze|cellar|basement/.test(a), 'cave'],
  ['Ville / bâtiment (city, town, tour, manoir, centrale, égouts…)', a => /city|town|village|tower|mansion|building|house|\blab\b|power-plant|sewer|museum|ship|hq|station|gym|cemetery|castle|chateau|hotel|resort|center|trash|hideout|factory|dump/.test(a), 'urban'],
  ['Mer / plage (à pied)', a => /sea\b|sea-|beach|\bbay\b|ocean|shoal|lagoon|coast/.test(a), 'sea'],
  ['Lac / rivière / marais (à pied)', a => /lake|river|pond|falls|marsh|swamp|wetlands|brooklet|spring|waterfall/.test(a), 'waters-edge'],
  ['Forêt / bois / jungle', a => /forest|woods|grove|jungle|wood\b|orchard/.test(a), 'forest'],
  ['Désert / canyon / volcan / rocaille', a => /desert|canyon|badlands|wasteland|volcan|crater|rocky|rugged|rough|quarry|dusty|scorched|cinnabar|fiery|pyrite|stony|stark/.test(a), 'rough-terrain'],
  ['Sommet / pente / neige / glace', a => /peak|summit|slope|\bhill|cliff|coronet|snow|frost|\bice|icefall|glacier|pillar|spear|plateau/.test(a), 'mountain'],
  ['Route (route-XX)', a => /route/.test(a), 'grassland'],
  ['Champ / prairie / parc / safari / jardin', a => /field|meadow|plains|safari|grass|ranch|garden|park|flower|lowlands|pasture|wilds|outskirts|path/.test(a), 'grassland'],
]

const stats = RULES.map(([label, , habitat]) => ({ label, habitat, pokemon: 0, ok: 0, truth: new Map() }))
const unmatched = new Map()
for (const p of Object.values(data)) {
  const hit = new Set()
  for (const e of p.encounters) {
    if (OLD_GAMES.has(e.version))
      continue
    const index = RULES.findIndex(([, test]) => test(e.area, e.method))
    if (index < 0)
      unmatched.set(e.area, (unmatched.get(e.area) ?? 0) + 1)
    else
      hit.add(index)
  }
  for (const index of hit) {
    const s = stats[index]
    s.pokemon++
    if (p.habitat === s.habitat)
      s.ok++
    s.truth.set(p.habitat, (s.truth.get(p.habitat) ?? 0) + 1)
  }
}

console.log('| Correspondance | → Habitat | Pokémon touchés | Réussite | Habitats réels de ces Pokémon |')
console.log('|---|---|---|---|---|')
for (const s of stats) {
  const truth = [...s.truth].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([h, n]) => `${FR[h]} ${Math.round(n / s.pokemon * 100)} %`).join(', ')
  console.log(`| ${s.label} | ${s.habitat ? FR[s.habitat] : '—'} | ${s.pokemon} | ${s.habitat ? Math.round(s.ok / s.pokemon * 100) + ' %' : '—'} | ${truth} |`)
}
console.log(`\nLieux sans correspondance : ${unmatched.size} (ex : ${[...unmatched].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([a]) => a).join(', ')})`)
