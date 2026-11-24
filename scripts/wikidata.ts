// Complète le sexe, les cheveux, l'occupation et l'espèce qu'AniList n'a pas donnés, avec Wikidata : beaucoup de personnages
// y ont leur ID AniList (propriété P11736), donc pas de recherche par nom. Une requête par propriété, puis les noms
// des valeurs (FR, sinon EN). Réponses gardées dans .cache/wikidata/ (hors git) : supprimer le dossier pour les rafraîchir.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { AttributeValue, Entry } from '../src/engine/types.js'
import { hairColors, sleep } from './anilist.js'

const SPARQL = 'https://query.wikidata.org/sparql'
const API = 'https://www.wikidata.org/w/api.php'
const USER_AGENT = 'quizdle-data/1.0'
const IDS_PER_REQUEST = 50
const DELAY_MS = 500

// Propriété Wikidata → attribut : P21 sexe, P1884 couleur des cheveux, P106 occupation
const PROPERTIES = { gender: 'P21', hair: 'P1884', occupation: 'P106' } as const
type Key = keyof typeof PROPERTIES

const GENDERS: Record<string, string> = { masculin: 'Homme', mâle: 'Homme', male: 'Homme', féminin: 'Femme', femelle: 'Femme', female: 'Femme' }

const cacheFile = new URL('../.cache/wikidata/characters.json', import.meta.url)

// id AniList → attribut → noms des valeurs (« cheveux noirs », « lycéen ou lycéenne »...)
type Characters = Record<string, Partial<Record<Key, string[]>>>

async function sparql(query: string): Promise<{ anilist: string, value: string }[]> {
  const response = await fetch(`${SPARQL}?query=${encodeURIComponent(query)}`, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' } })
  if (!response.ok)
    throw new Error(`Wikidata SPARQL : ${response.status} ${(await response.text()).slice(0, 200)}`)
  const json = await response.json() as { results: { bindings: { anilist: { value: string }, value: { value: string } }[] } }
  return json.results.bindings.map(binding => ({ anilist: binding.anilist.value, value: binding.value.value.split('/').pop()! }))
}

const MAX_ATTEMPTS = 5

// Une requête à l'API, avec reprise quand Wikidata nous freine (une page d'erreur à la place du JSON)
async function getJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    const text = await response.text()
    if (response.ok && text.startsWith('{'))
      return JSON.parse(text)
    if (attempt === MAX_ATTEMPTS)
      throw new Error(`Wikidata : ${response.status} ${text.slice(0, 200)}`)
    const wait = 15_000 * attempt
    process.stdout.write(`\n  Wikidata nous freine, nouvel essai dans ${wait / 1000} s\n`)
    await sleep(wait)
  }
}

// Le nom FR (sinon EN) de chaque élément Wikidata, par lots de 50
async function labels(ids: string[]): Promise<Map<string, string>> {
  const found = new Map<string, string>()
  for (let i = 0; i < ids.length; i += IDS_PER_REQUEST) {
    const url = `${API}?action=wbgetentities&props=labels&languages=fr|en&format=json&ids=${ids.slice(i, i + IDS_PER_REQUEST).join('|')}`
    const json = await getJson(url) as { entities?: Record<string, { labels?: Record<string, { value: string }> }> }
    for (const [id, entity] of Object.entries(json.entities ?? {})) {
      const label = entity.labels?.fr?.value ?? entity.labels?.en?.value
      if (label)
        found.set(id, label)
    }
    await sleep(DELAY_MS)
  }
  return found
}

async function fetchCharacters(): Promise<Characters> {
  const cached = await readFile(cacheFile, 'utf8').catch(() => null)
  if (cached)
    return JSON.parse(cached) as Characters
  console.log('Wikidata : récupération des personnages qui ont un ID AniList')
  const rows = new Map<Key, { anilist: string, value: string }[]>()
  for (const [key, property] of Object.entries(PROPERTIES) as [Key, string][])
    rows.set(key, await sparql(`SELECT ?anilist ?value WHERE { ?item wdt:P11736 ?anilist ; wdt:${property} ?value }`))
  // « valeur inconnue » n'est pas un élément : on ne garde que les Q123
  const ids = [...new Set([...rows.values()].flat().map(row => row.value).filter(id => /^Q\d+$/.test(id)))]
  const names = await labels(ids)
  const characters: Characters = {}
  for (const [key, list] of rows) {
    for (const { anilist, value } of list) {
      const name = names.get(value)
      if (name)
        ((characters[anilist] ??= {})[key] ??= []).push(name)
    }
  }
  await mkdir(new URL('./', cacheFile), { recursive: true })
  await writeFile(cacheFile, JSON.stringify(characters))
  return characters
}

// L'espèce (P31, « nature de l'élément ») : seulement les classes qui sont des espèces de fiction (« être humain de
// fiction », « Saiyan »), pas « personnage d'anime ». Gardée à part (.cache/wikidata/species.json) : le cache des autres
// propriétés reste valable. Noms bruts, traduits à la fin (translateSpeciesEntries).
const FICTIONAL_SPECIES = 'Q21192438'
const speciesFile = new URL('../.cache/wikidata/species.json', import.meta.url)

async function fetchSpecies(): Promise<Record<string, string[]>> {
  const cached = await readFile(speciesFile, 'utf8').catch(() => null)
  if (cached)
    return JSON.parse(cached) as Record<string, string[]>
  console.log('Wikidata : récupération des espèces des personnages qui ont un ID AniList')
  const rows = await sparql(`SELECT ?anilist ?value WHERE { ?item wdt:P11736 ?anilist ; wdt:P31 ?value . ?value wdt:P31/wdt:P279* wd:${FICTIONAL_SPECIES} }`)
  const names = await labels([...new Set(rows.map(row => row.value).filter(id => /^Q\d+$/.test(id)))])
  const species: Record<string, string[]> = {}
  for (const { anilist, value } of rows) {
    const name = names.get(value)
    if (name && !(species[anilist] ??= []).includes(name))
      species[anilist]!.push(name)
  }
  await mkdir(new URL('./', speciesFile), { recursive: true })
  await writeFile(speciesFile, JSON.stringify(species))
  return species
}

// --- Valeurs Wikidata → nos valeurs ---

export function wikidataGender(names: string[]): string | null {
  return names.map(name => GENDERS[name.toLowerCase()]).find(Boolean) ?? null
}

export function wikidataHair(names: string[]): string[] | null {
  const colors = [...new Set(names.flatMap(hairColors))]
  return colors.length > 0 ? colors : null
}

// « lycéen ou lycéenne » → Lycéen, « pratiquant ou pratiquante d'arts martiaux » → Pratiquant d'arts martiaux,
// « ninja de fiction » → Ninja. Traduites ensuite comme les autres (translate.ts).
export function wikidataOccupation(names: string[]): string[] | null {
  const list = names
    .map(name => name.replace(/^(\S+)\s+ou\s+\S+/i, '$1').replace(/\s+(de fiction|fictif|fictive)$/i, '').trim())
    .filter(Boolean)
    .map(name => name[0]!.toUpperCase() + name.slice(1))
  return list.length > 0 ? [...new Set(list)] : null
}

const isEmpty = (value: AttributeValue | undefined) => value === null || value === undefined

// Remplit les champs vides (sexe, cheveux, occupation, espèce) avec Wikidata. Renvoie les entrées complétées et le détail.
export async function completeFromWikidata(entries: Entry[]): Promise<{ entries: Entry[], filled: string[] }> {
  const characters = await fetchCharacters()
  const allSpecies = await fetchSpecies()
  const filled: string[] = []
  const completed = entries.map(entry => {
    const found = characters[entry.id] ?? {}
    if (!characters[entry.id] && !allSpecies[entry.id])
      return entry
    const values: Record<Key | 'species', AttributeValue> = {
      gender: wikidataGender(found.gender ?? []),
      hair: wikidataHair(found.hair ?? []),
      occupation: wikidataOccupation(found.occupation ?? []),
      species: allSpecies[entry.id] ?? null,
    }
    const added = Object.fromEntries(Object.entries(values).filter(([key, value]) => isEmpty(entry.attributes[key]) && !isEmpty(value)))
    if (Object.keys(added).length === 0)
      return entry
    filled.push(`${entry.name} : ${Object.entries(added).map(([key, value]) => `${key} ${JSON.stringify(value)}`).join(', ')}`)
    return { ...entry, attributes: { ...entry.attributes, ...added } }
  })
  return { entries: completed, filled }
}
