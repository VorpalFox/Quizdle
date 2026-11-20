// Génère data/pokemon.json depuis PokeAPI. Usage : npm run fetch:pokemon -- [dernier n° de Pokédex, 386 par défaut : jusqu'à la 3e génération]
// Les habitats n'existent dans PokeAPI que jusqu'à la 3e génération (au-delà : null).
import { writeFile } from 'node:fs/promises'

const API = 'https://pokeapi.co/api/v2'
const lastId = Number(process.argv[2] ?? 386)
const CONCURRENCY = 10

const TYPES: Record<string, string> = {
  normal: 'Normal', fire: 'Feu', water: 'Eau', grass: 'Plante', electric: 'Électrik', ice: 'Glace',
  fighting: 'Combat', poison: 'Poison', ground: 'Sol', flying: 'Vol', psychic: 'Psy', bug: 'Insecte',
  rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon', dark: 'Ténèbres', steel: 'Acier', fairy: 'Fée',
}
const HABITATS: Record<string, string> = {
  'cave': 'Grotte', 'forest': 'Forêt', 'grassland': 'Prairie', 'mountain': 'Montagne', 'rare': 'Rare',
  'rough-terrain': 'Terrain accidenté', 'sea': 'Mer', 'urban': 'Ville', 'waters-edge': "Bord de l'eau",
}
const COLORS: Record<string, string> = {
  black: 'Noir', blue: 'Bleu', brown: 'Marron', gray: 'Gris', green: 'Vert',
  pink: 'Rose', purple: 'Violet', red: 'Rouge', white: 'Blanc', yellow: 'Jaune',
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
      habitat: species.habitat ? HABITATS[species.habitat.name] ?? species.habitat.name : null,
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
