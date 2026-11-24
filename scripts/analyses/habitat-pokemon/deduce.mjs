// Déduit l'habitat des lieux de capture et compare au vrai habitat (3 premières générations)
import { readFileSync } from 'node:fs'
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const TYPES = Object.fromEntries(JSON.parse(readFileSync(process.argv[4], 'utf8')).map(p => [p.id, p.attributes.types]))
const TUNING = { routeWeight: Number(process.env.ROUTE ?? 1), seaShare: Number(process.env.SEA ?? 2), mountainFirst: process.env.MT === '1', typeFallback: process.env.TYPE === '1' }
// Un starter (aucun lieu de capture) : selon son 1er type
const TYPE_HABITAT = { Plante: 'grassland', Feu: 'grassland', Eau: 'waters-edge', Insecte: 'forest', Roche: 'mountain', Sol: 'rough-terrain', Spectre: 'cave' }

const OLD_GAMES = new Set(['red', 'blue', 'yellow', 'gold', 'silver', 'crystal', 'ruby', 'sapphire', 'emerald', 'firered', 'leafgreen', 'colosseum', 'xd'])
const WATER_METHODS = /rod|surf|water|seaweed|feebas|bubbling|wailmer|squirt/
const IGNORED_METHODS = /gift|trade|static|snag|max-raid|dynamax|colosseum|pokemon-channel|island-scan|pokeflute|devon-scope|roaming|only-one/
// Routes marines connues (Kanto 19-21, Johto 40-41, Hoenn 105-109 et 122-134, Sinnoh 220/223/226/230, Unys 17-18...)
const SEA_ROUTES = /^(kanto-(sea-)?route-(19|20|21)|johto-route-(40|41)|hoenn-route-(10[5-9]|12[2-9]|13[0-4])|sinnoh-route-(220|223|226|230)|unova-route-(17|18))\b/

// Dans l'ordre : le 1er qui correspond gagne (« mt-moon » est une grotte avant d'être une montagne)
const AREA_RULES = [
  ['cave', /cave|cavern|tunnel|chamber|ruins?\b|\bwell\b|\bmine\b|hole|chasm|lair|mt-moon|victory-road|granite|meteor-falls|seafoam|grotto|underground|wayward|catacomb|maze|dragons?-den|abyssal|cellar|basement/],
  ['urban', /city|town|village|tower|mansion|building|house|\blab\b|power-plant|sewer|museum|ship|ss-anne|game-corner|hq|station|gym|cemetery|castle|chateau|hotel|resort|center|trash|hideout|factory|dump|restaurant|mart/],
  ['sea', /sea\b|sea-|beach|\bbay\b|ocean|shoal|lagoon|pacifidlog|cianwood|whirl-islands|coast|undersea|seafloor|harbor|port/],
  ['waters-edge', /lake|river|pond|falls|marsh|swamp|wetlands|brooklet|riverbank|spring|canal|waterfall/],
  ['forest', /forest|woods|grove|jungle|wood\b|orchard|honey/],
  ['rough-terrain', /desert|canyon|badlands|wasteland|volcan|crater|rocky|rugged|rough|quarry|dusty|scorched|cinnabar|fiery|pyrite|stony|stark/],
  ['mountain', /\bmt\b|mt-|mount|mountain|peak|summit|slope|\bhill|cliff|coronet|snow|frost|\bice|icefall|glacier|pillar|spear|plateau/],
  ['grassland', /route|field|meadow|plains|safari|grass|ranch|garden|park|flower|lowlands|pasture|prairie|savanna|wilds|wild-area|outskirts|path/],
]

const MOUNTAIN_FIRST = /mt-|mount|mine|mountain|iron-island|rock-tunnel|victory-road/

function habitatOf(encounter) {
  const { area, method } = encounter
  if (IGNORED_METHODS.test(method))
    return null
  if (WATER_METHODS.test(method))
    return SEA_ROUTES.test(area) || AREA_RULES[2][1].test(area) ? 'sea' : 'waters-edge'
  if (method === 'rock-smash')
    return 'rough-terrain'
  if (/headbutt|honey-tree/.test(method))
    return 'forest'
  if (SEA_ROUTES.test(area))
    return 'sea'
  if (TUNING.mountainFirst && MOUNTAIN_FIRST.test(area))
    return 'mountain'
  return AREA_RULES.find(([, pattern]) => pattern.test(area))?.[0] ?? null
}

function votes(id, onlyRecent) {
  const counts = new Map()
  const seen = new Set()
  for (const encounter of data[id].encounters) {
    if (onlyRecent && OLD_GAMES.has(encounter.version))
      continue
    const habitat = habitatOf(encounter)
    const key = `${encounter.area}|${habitat}`
    if (!habitat || seen.has(key))
      continue
    seen.add(key)
    const weight = habitat === 'grassland' && /route/.test(encounter.area) ? TUNING.routeWeight : 1
    counts.set(habitat, (counts.get(habitat) ?? 0) + weight)
  }
  // Créature d'eau : marine dès qu'une part suffisante de ses lieux aquatiques est en mer
  const sea = counts.get('sea') ?? 0, edge = counts.get('waters-edge') ?? 0
  if (sea > 0 && sea / (sea + edge) >= TUNING.seaShare) {
    counts.set('sea', sea + edge)
    counts.delete('waters-edge')
  }
  return counts
}

const best = counts => [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

// Le vote le plus fréquent ; sans lieu, celui de la pré-évolution ; sinon (ou légendaire) Rare
function deduce(id, options) {
  let counts = votes(id, options.onlyRecent)
  if (options.family) {
    // Toute la famille vote ensemble : les évolutions se trouvent souvent ailleurs que la forme de base
    for (let parent = data[id].evolvesFrom; parent && data[parent]; parent = data[parent].evolvesFrom)
      for (const [habitat, count] of votes(parent, options.onlyRecent))
        counts.set(habitat, (counts.get(habitat) ?? 0) + count * options.family)
  }
  const found = best(counts)
  if (found)
    return found
  if (data[data[id].evolvesFrom])
    return deduce(data[id].evolvesFrom, options)
  return TUNING.typeFallback && !data[id].legendary ? TYPE_HABITAT[TYPES[id]?.[0]] ?? 'grassland' : 'rare'
}

for (const [label, options] of [
  ['Tous les jeux', { onlyRecent: false }],
  ['Tous les jeux + famille', { onlyRecent: false, family: 1 }],
  ['Jeux 4G et après', { onlyRecent: true }],
  ['Jeux 4G et après + famille', { onlyRecent: true, family: 1 }],
]) {
  const ids = Object.keys(data)
  const ok = ids.filter(id => deduce(id, options) === data[id].habitat).length
  console.log(`${label} : ${ok}/${ids.length} (${Math.round(ok / ids.length * 100)} %)`)
  if (process.argv[3] === label) {
    const confusion = new Map()
    for (const id of ids) {
      const found = deduce(id, options)
      if (found !== data[id].habitat) {
        const key = `${data[id].habitat} → ${found}`
        confusion.set(key, [...confusion.get(key) ?? [], data[id].name])
      }
    }
    for (const [key, names] of [...confusion].sort((a, b) => b[1].length - a[1].length))
      console.log(`  ${names.length} ${key} : ${names.slice(0, 8).join(', ')}`)
  }
}

// Catégories fusionnées : Terre ferme, Relief (grotte + montagne), Eau, Ville, Rare
const MERGED = { 'grassland': 'Terre', 'forest': 'Terre', 'rough-terrain': 'Terre', 'mountain': 'Relief', 'cave': 'Relief', 'sea': 'Eau', 'waters-edge': 'Eau', 'urban': 'Ville', 'rare': 'Rare' }
if (process.env.MERGED === '1') {
  const ids = Object.keys(data)
  const ok = ids.filter(id => MERGED[deduce(id, { onlyRecent: true })] === MERGED[data[id].habitat]).length
  console.log(`Fusionné (jeux 4G et après) : ${ok}/${ids.length} (${Math.round(ok / ids.length * 100)} %)`)
}

// Test ciblé : une plage d'ids, avec un filtre de jeux
if (process.env.RANGE) {
  const [from, to] = process.env.RANGE.split('-').map(Number)
  const GEN3 = new Set(['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen', 'colosseum', 'xd'])
  const filters = {
    'Tous les jeux (1G → 9G)': () => true,
    'Jeux de la 3G seulement': v => GEN3.has(v),
    'Jeux de la 4G et après': v => !OLD_GAMES.has(v),
  }
  const ids = Object.keys(data).filter(id => id >= from && id <= to)
  for (const [label, keep] of Object.entries(filters)) {
    const saved = Object.fromEntries(ids.map(id => [id, data[id].encounters]))
    for (const id of Object.keys(data))
      data[id].encountersAll ??= data[id].encounters
    for (const id of Object.keys(data))
      data[id].encounters = data[id].encountersAll.filter(e => keep(e.version))
    const ok = ids.filter(id => deduce(id, {}) === data[id].habitat).length
    const merged = ids.filter(id => MERGED[deduce(id, {})] === MERGED[data[id].habitat]).length
    const withPlaces = ids.filter(id => data[id].encounters.length > 0).length
    console.log(`${label} : ${ok}/${ids.length} justes (${Math.round(ok / ids.length * 100)} %), fusionné ${Math.round(merged / ids.length * 100)} %, ${withPlaces} avec au moins un lieu`)
  }
}

// Détail d'un Pokémon : ses votes et l'habitat déduit
if (process.env.SHOW) {
  const id = process.env.SHOW
  for (const e of data[id].encounters) data[id].encountersAll ??= data[id].encounters
  data[id].encounters = data[id].encountersAll.filter(e => !OLD_GAMES.has(e.version))
  console.log(data[id].name, '— vrai habitat :', data[id].habitat, '— déduit :', deduce(id, {}))
  console.log('Votes :', Object.fromEntries([...votes(id, false)].sort((a, b) => b[1] - a[1])))
  const byHabitat = new Map()
  for (const e of data[id].encounters) {
    const h = habitatOf(e)
    if (h) byHabitat.set(h, new Set([...byHabitat.get(h) ?? [], e.area.replace(/-area$/, '')]))
  }
  for (const [h, areas] of byHabitat) console.log(`  ${h} : ${[...areas].slice(0, 10).join(', ')}${areas.size > 10 ? ` (+${areas.size - 10})` : ''}`)
}

// Plusieurs habitats quand les votes sont serrés : on garde ceux qui ont au moins `ratio` × les votes du 1er (3 au plus)
function deduceMany(id, ratio) {
  const counts = votes(id, true)
  if (counts.size === 0)
    return [deduce(id, { onlyRecent: true })]
  const sorted = [...counts].sort((a, b) => b[1] - a[1])
  return sorted.filter(([, n], i) => i === 0 || n >= sorted[0][1] * ratio).slice(0, 3).map(([h]) => h)
}

if (process.env.MANY === '1') {
  const ids = Object.keys(data)
  console.log('| Seuil (part des votes du 1er) | Le vrai habitat est dans la liste | 1 habitat | 2 | 3 | Moyenne |')
  console.log('|---|---|---|---|---|---|')
  for (const ratio of [1.01, 0.75, 0.5, 0.33, 0.25]) {
    const lists = ids.map(id => deduceMany(id, ratio))
    const hit = ids.filter((id, i) => lists[i].includes(data[id].habitat)).length
    const sizes = [1, 2, 3].map(n => lists.filter(l => l.length === n).length)
    const label = ratio > 1 ? 'Un seul (le 1er)' : `${Math.round(ratio * 100)} %`
    console.log(`| ${label} | ${Math.round(hit / ids.length * 100)} % | ${sizes[0]} | ${sizes[1]} | ${sizes[2]} | ${(lists.reduce((a, l) => a + l.length, 0) / ids.length).toFixed(1)} |`)
  }
}

// Familles d'évolution : tous les membres votent ensemble
if (process.env.FAMILY === '1') {
  const root = id => { let r = id; while (data[r].evolvesFrom && data[data[r].evolvesFrom]) r = String(data[r].evolvesFrom); return r }
  const families = new Map()
  for (const id of Object.keys(data)) families.set(root(id), [...families.get(root(id)) ?? [], id])
  const ids = Object.keys(data)
  for (const ratio of [1.01, 0.5]) {
    let hit = 0, total = 0
    for (const members of families.values()) {
      const counts = new Map()
      for (const id of members)
        for (const [h, n] of votes(id, true)) counts.set(h, (counts.get(h) ?? 0) + n)
      const sorted = [...counts].sort((a, b) => b[1] - a[1])
      const list = sorted.length === 0 ? [deduce(members[0], { onlyRecent: true })] : sorted.filter(([, n], i) => i === 0 || n >= sorted[0][1] * ratio).slice(0, 3).map(([h]) => h)
      for (const id of members) { total++; if (list.includes(data[id].habitat)) hit++ }
    }
    console.log(`Famille, ${ratio > 1 ? 'un seul habitat' : 'seuil 50 %'} : ${hit}/${total} (${Math.round(hit / total * 100)} %)`)
  }
}
