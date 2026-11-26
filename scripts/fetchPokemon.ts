// Génère data/pokemon.json depuis PokeAPI. Usage : npm run fetch:pokemon -- [dernier n° de Pokédex, 905 par défaut : jusqu'à la 8e génération]
// L'habitat officiel n'existe que jusqu'à la 3e génération. De la 4e à la 8e, il est repris de la famille d'évolution
// si elle a un membre plus ancien, sinon déduit des lieux de capture (voir pokemonHabitat.ts). Les groupes d'œufs existent pour tous.
import { writeFile } from 'node:fs/promises'
import { deduceHabitats, type Encounter } from './pokemonHabitat.js'

const API = 'https://pokeapi.co/api/v2'
const lastId = Number(process.argv[2] ?? 905)
// PokeAPI n'a aucun lieu de capture pour la 9e génération : pas d'habitat possible au-delà
const MAX_ID = 905
if (lastId > MAX_ID)
  throw new Error(`Au plus ${MAX_ID} (fin de la 8e génération) : au-delà, PokeAPI n'a ni habitat ni lieu de capture`)
const CONCURRENCY = 10

const TYPES: Record<string, string> = {
  normal: 'Normal', fire: 'Fire', water: 'Water', grass: 'Grass', electric: 'Electric', ice: 'Ice',
  fighting: 'Fighting', poison: 'Poison', ground: 'Ground', flying: 'Flying', psychic: 'Psychic', bug: 'Bug',
  rock: 'Rock', ghost: 'Ghost', dragon: 'Dragon', dark: 'Dark', steel: 'Steel', fairy: 'Fairy',
}
const HABITATS: Record<string, string> = {
  'cave': 'Cave', 'forest': 'Forest', 'grassland': 'Grassland', 'mountain': 'Mountain', 'rare': 'Rare',
  'rough-terrain': 'Rough terrain', 'sea': 'Sea', 'urban': 'Urban', 'waters-edge': "Water's edge",
}
// Noms officiels anglais (ceux de PokeAPI). « Undiscovered » est un vrai groupe (les légendaires), pas une case vide
const EGG_GROUPS: Record<string, string> = {
  'monster': 'Monster', 'water1': 'Water 1', 'bug': 'Bug', 'flying': 'Flying', 'ground': 'Field',
  'fairy': 'Fairy', 'plant': 'Grass', 'humanshape': 'Human-Like', 'water3': 'Water 3', 'mineral': 'Mineral',
  'indeterminate': 'Amorphous', 'water2': 'Water 2', 'ditto': 'Ditto', 'dragon': 'Dragon', 'no-eggs': 'Undiscovered',
}
const COLORS: Record<string, string> = {
  black: 'Black', blue: 'Blue', brown: 'Brown', gray: 'Grey', green: 'Green',
  pink: 'Pink', purple: 'Purple', red: 'Red', white: 'White', yellow: 'Yellow',
}
const GENERATIONS = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix']

interface ChainLink { species: { name: string }, evolves_to: ChainLink[] }

const cache = new Map<string, Promise<any>>()
function get(url: string): Promise<any> {
  if (!cache.has(url))
    cache.set(url, fetch(url).then(response => {
      if (!response.ok)
        throw new Error(`${response.status} sur ${url}`)
      return response.json()
    }))
  return cache.get(url)!
}

const speciesId = (url: string) => Number(url.split('/').at(-2))

// Les espèces d'une famille d'évolution (leur URL)
function familyUrls(link: ChainLink & { species: { url: string } }): string[] {
  return [link.species.url, ...link.evolves_to.flatMap(next => familyUrls(next as ChainLink & { species: { url: string } }))]
}

// L'habitat officiel d'un membre de la famille (une évolution a toujours celui de sa pré-évolution, vérifié
// sur les 3 premières générations), sinon celui déduit des lieux de capture de toute la famille
async function familyHabitats(chain: any, species: any, pokemon: any): Promise<string[]> {
  const members = await Promise.all(familyUrls(chain.chain).filter(url => speciesId(url) <= MAX_ID).map(get))
  const official = members.find(member => member.habitat)
  if (official)
    return [HABITATS[official.habitat.name] ?? official.habitat.name]
  const encounters: Encounter[] = (await Promise.all(members.map(member => get(`${API}/pokemon/${member.id}/encounters`))))
    .flat()
    .flatMap((place: any) => place.version_details.flatMap((version: any) => version.encounter_details.map((detail: any) => ({ area: place.location_area.name, method: detail.method.name }))))
  const firstType = [...pokemon.types].sort((a: any, b: any) => a.slot - b.slot)[0].type.name
  return deduceHabitats(encounters, species.is_legendary || species.is_mythical, firstType).map(habitat => HABITATS[habitat] ?? habitat)
}

function stageIn(link: ChainLink, species: string, depth = 1): number | null {
  if (link.species.name === species)
    return depth
  for (const next of link.evolves_to) {
    const found = stageIn(next, species, depth + 1)
    if (found)
      return found
  }
  return null
}

async function fetchOne(id: number) {
  const pokemon = await get(`${API}/pokemon/${id}`)
  const species = await get(pokemon.species.url)
  const chain = await get(species.evolution_chain.url)
  const frName = species.names.find((name: any) => name.language.name === 'fr')?.name ?? species.name
  return {
    id: String(id),
    name: frName,
    aliases: [species.name],
    image: pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default,
    attributes: {
      types: [...pokemon.types].sort((a: any, b: any) => a.slot - b.slot).map((t: any) => TYPES[t.type.name] ?? t.type.name),
      habitat: species.habitat ? [HABITATS[species.habitat.name] ?? species.habitat.name] : await familyHabitats(chain, species, pokemon),
      eggGroups: species.egg_groups.map((group: any) => EGG_GROUPS[group.name] ?? group.name),
      color: COLORS[species.color.name] ?? species.color.name,
      stage: stageIn(chain.chain, species.name),
      height: pokemon.height / 10,
      weight: pokemon.weight / 10,
      generation: GENERATIONS.indexOf(species.generation.name.replace('generation-', '')) + 1,
    },
  }
}

const ids = Array.from({ length: lastId }, (_, i) => i + 1)
const results: Awaited<ReturnType<typeof fetchOne>>[] = []
for (let i = 0; i < ids.length; i += CONCURRENCY) {
  results.push(...await Promise.all(ids.slice(i, i + CONCURRENCY).map(fetchOne)))
  process.stdout.write(`\r${results.length}/${ids.length}`)
}

await writeFile(new URL('../data/pokemon.json', import.meta.url), `${JSON.stringify(results, null, 1)}\n`)
console.log(`\n${results.length} Pokémon écrits dans data/pokemon.json`)
