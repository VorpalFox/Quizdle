// L'habitat des Pokémon de la 4e à la 8e génération, déduit de leurs lieux de capture (PokeAPI).
// L'habitat officiel n'existe que dans Rouge Feu / Vert Feuille, donc jusqu'à la 3e génération.
// Mesuré sur les 386 premiers (lieux des jeux de la 4G et après, famille entière) : le vrai habitat est
// dans la liste déduite 62 % du temps. C'est approximatif : à relire si un Pokémon semble mal classé.

export interface Encounter {
  area: string
  method: string
}

// Ce qui ne dit rien du milieu : dons, échanges, raids, Pokémon fixes...
const IGNORED_METHODS = /gift|trade|static|snag|max-raid|dynamax|colosseum|pokemon-channel|island-scan|pokeflute|devon-scope|roaming|only-one/
const WATER_METHODS = /rod|surf|water|seaweed|feebas|bubbling|wailmer|squirt/
// Routes marines (Hoenn 105-109 et 122-134, Sinnoh 220/223/226/230) et lieux marins
const SEA_AREAS = /sea\b|sea-|beach|\bbay\b|ocean|shoal|lagoon|pacifidlog|cianwood|whirl-islands|coast|undersea|harbor|port|hoenn-route-(10[5-9]|12[2-9]|13[0-4])|sinnoh-route-(220|223|226|230)/
// Les monts et les mines passent avant les grottes : le Mont Sélénite est classé Montagne par Rouge Feu
const MOUNTAIN_FIRST = /\bmt-|mount|mine\b|mountain|iron-island|rock-tunnel|victory-road/

// Dans l'ordre : le 1er qui correspond gagne
const AREA_RULES: [RegExp, string][] = [
  [/cave|cavern|tunnel|chamber|ruins?\b|\bwell\b|hole|chasm|lair|granite|meteor-falls|seafoam|grotto|underground|wayward|maze|cellar|basement/, 'cave'],
  [/city|town|village|tower|mansion|building|house|\blab\b|power-plant|sewer|museum|ship|hq|station|gym|cemetery|castle|chateau|hotel|resort|center|trash|hideout|factory|dump/, 'urban'],
  [SEA_AREAS, 'sea'],
  [/lake|river|pond|falls|marsh|swamp|wetlands|brooklet|spring|waterfall|axews-eye/, 'waters-edge'],
  [/forest|woods|grove|jungle|wood\b|orchard|sanctuary|shrine/, 'forest'],
  [/desert|canyon|badlands|wasteland|volcan|crater|rocky|rugged|rough|quarry|dusty|scorched|cinnabar|fiery|pyrite|stony|stark|challenge-road/, 'rough-terrain'],
  [/peak|summit|slope|\bhill|cliff|coronet|snow|frost|\bice|icefall|glacier|pillar|spear|plateau/, 'mountain'],
  // Les routes et les plaines, dont la Zone Sauvage de Galar (giants-cap, giants-seat, rolling-fields...)
  [/route|field|meadow|plains|safari|grass|ranch|garden|park|flower|lowlands|pasture|wilds|outskirts|path|giants-/, 'grassland'],
]

// Un starter ou un Pokémon sans lieu de capture : selon son 1er type
const TYPE_HABITATS: Record<string, string> = {
  grass: 'grassland', fire: 'grassland', water: 'waters-edge', bug: 'forest', rock: 'mountain', ground: 'rough-terrain', ghost: 'cave',
}

// Un habitat est gardé s'il a au moins cette part des votes du 1er, et on en garde 3 au plus
const MIN_SHARE_OF_FIRST = 0.5
const MAX_HABITATS = 3
// Une créature d'eau est marine dès que ce quart de ses lieux aquatiques est en mer
const MIN_SEA_SHARE = 0.25

// L'habitat que suggère un lieu de capture (clés PokeAPI : grassland, cave...), null s'il ne dit rien
export function encounterHabitat({ area, method }: Encounter): string | null {
  if (IGNORED_METHODS.test(method))
    return null
  if (WATER_METHODS.test(method))
    return SEA_AREAS.test(area) ? 'sea' : 'waters-edge'
  if (method === 'rock-smash')
    return 'mountain'
  if (/headbutt|honey-tree/.test(method))
    return 'forest'
  if (MOUNTAIN_FIRST.test(area))
    return 'mountain'
  return AREA_RULES.find(([pattern]) => pattern.test(area))?.[1] ?? null
}

// Une voix par lieu et par habitat (un lieu cité dans 5 jeux ne compte qu'une fois)
export function habitatVotes(encounters: Encounter[]): Map<string, number> {
  const votes = new Map<string, number>()
  const seen = new Set<string>()
  for (const encounter of encounters) {
    const habitat = encounterHabitat(encounter)
    const key = `${encounter.area}|${habitat}`
    if (!habitat || seen.has(key))
      continue
    seen.add(key)
    votes.set(habitat, (votes.get(habitat) ?? 0) + 1)
  }
  const sea = votes.get('sea') ?? 0
  const edge = votes.get('waters-edge') ?? 0
  if (sea > 0 && sea / (sea + edge) >= MIN_SEA_SHARE) {
    votes.set('sea', sea + edge)
    votes.delete('waters-edge')
  }
  return votes
}

// Les habitats d'une famille d'évolution, à partir des lieux de tous ses membres.
// Sans aucun lieu : Rare pour un légendaire, sinon selon le type.
export function deduceHabitats(encounters: Encounter[], legendary: boolean, firstType: string): string[] {
  const sorted = [...habitatVotes(encounters)].sort((a, b) => b[1] - a[1])
  if (sorted.length === 0)
    return [legendary ? 'rare' : TYPE_HABITATS[firstType] ?? 'grassland']
  return sorted
    .filter(([, count], index) => index === 0 || count >= sorted[0]![1] * MIN_SHARE_OF_FIRST)
    .slice(0, MAX_HABITATS)
    .map(([habitat]) => habitat)
}
