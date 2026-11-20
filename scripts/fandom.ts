// Complète le sexe, les cheveux et l'occupation avec l'infobox des wikis Fandom (un wiki par anime, très fourni,
// même pour les personnages secondaires). Chaque wiki a l'API MediaWiki : <wiki>.fandom.com/api.php.
// 1. Le wiki de chaque anime : la table WIKIS, sinon deviné à partir du titre (vérifié : le wiki doit exister)
// 2. La page de chaque personnage : le lien direct de Wikidata (P6262) s'il existe, sinon son nom (les deux ordres,
//    sans voyelles longues) et ses alias, 50 titres par requête
// 3. Les champs de l'infobox : hair / Hair Color, occupation, gender...
// Réponses gardées dans .cache/fandom/ (hors git) : supprimer le dossier pour tout retélécharger.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'
import type { AttributeValue, Entry } from '../src/engine/types.js'
import { sleep, splitOccupations } from './anilist.js'
import { cleanValue, pageTitles, wikiGender, wikiHair, type WikiTarget } from './wikipedia.js'

const USER_AGENT = 'quizdle-data/1.0'
const TITLES_PER_REQUEST = 50
const DELAY_MS = 500
const MAX_ATTEMPTS = 5
const MAX_CACHED_LENGTH = 20_000

// Les wikis qu'on ne devine pas à partir du titre (clé : titre normalisé de l'anime). Plusieurs : essayés dans l'ordre.
// null : pas de wiki utilisable.
const WIKIS: Record<string, string[] | null> = {
  [normalize('A Certain Scientific Railgun')]: ['toarumajutsunoindex'],
  [normalize('A Certain Magical Index')]: ['toarumajutsunoindex'],
  [normalize('Re:ZERO -Starting Life in Another World-')]: ['rezero'],
  [normalize('Kaguya-sama: Love is War')]: ['kaguyasama'],
  [normalize('That Time I Got Reincarnated as a Slime')]: ['tensura'],
  [normalize('Puella Magi Madoka Magica')]: ['madoka', 'puellamagimadokamagica'],
  [normalize('JoJo\'s Bizarre Adventure')]: ['jojo'],
  [normalize('JoJo\'s Bizarre Adventure (TV)')]: ['jojo'],
  [normalize('Fate/stay night')]: ['typemoon'],
  [normalize('Fate/stay night: Unlimited Blade Works')]: ['typemoon'],
  [normalize('Fate/Zero')]: ['typemoon'],
  [normalize('Toradora!')]: ['toradora'],
  [normalize('The Apothecary Diaries')]: ['kusuriya'],
  [normalize('The Rising of the Shield Hero')]: ['shield-hero', 'tate-no-yuusha-no-nariagari', 'the-rising-of-the-shield-hero'],
  [normalize('Danganronpa 3: The End of Hope’s Peak High School - Future Arc')]: ['danganronpa'],
  [normalize('Classroom of the Elite')]: ['you-zitsu', 'classroom-of-the-elite'],
  [normalize('Darwin\'s Game')]: ['darwins-game', 'darwinsgame'],
  [normalize('Devilman Crybaby')]: ['devilman'],
  [normalize('Grimgar of Fantasy and Ash')]: ['grimgar'],
  [normalize('Hellsing Ultimate')]: ['hellsing'],
  [normalize('Is It Wrong to Try to Pick Up Girls in a Dungeon?')]: ['danmachi'],
  [normalize('Mekakucity Actors')]: ['kagerou-project', 'kagerouproject'],
  [normalize('Ouran High School Host Club')]: ['ouran', 'ouranhighschoolhostclub'],
  [normalize('Paradise Kiss')]: ['paradisekiss', 'paradise-kiss'],
  [normalize('Rascal Does Not Dream of Bunny Girl Senpai')]: ['aobuta', 'seishun-buta-yarou'],
  [normalize('Revolutionary Girl Utena')]: ['utena', 'revolutionarygirlutena'],
  [normalize('Trapped in a Dating Sim: The World of Otome Games Is Tough for Mobs')]: ['mobuseka'],
  [normalize('Tsubasa RESERVoir CHRoNiCLE')]: ['tsubasa', 'clamp'],
  [normalize('Uncle from Another World')]: ['isekai-ojisan', 'uncle-from-another-world'],
  [normalize('Vivy -Fluorite Eye\'s Song-')]: ['vivy', 'vivy-fluorite-eyes-song'],
  [normalize('BNA')]: ['brand-new-animal'],
  [normalize('Battle Game in 5 Seconds')]: ['battle-game-in-5-seconds', 'battlegamein5seconds'],
  [normalize('Chivalry of a Failed Knight')]: ['rakudai-kishi'],
  [normalize('The Unwanted Undead Adventurer')]: ['nozomanu-fushi-no-boukensha', 'the-unwanted-undead-adventurer'],
  [normalize('The Witch and the Beast')]: ['the-witch-and-the-beast', 'majo-to-yajuu'],
  [normalize('I\'m the Villainess, So I\'m Taming the Final Boss')]: ['im-the-villainess-so-im-taming-the-final-boss', 'akuyaku-reijou'],
  [normalize('Smoking Behind the Supermarket with You')]: null,
  [normalize('Paprika')]: null,
  // Animedle
  [normalize('Attack on Titan')]: ['attackontitan', 'shingekinokyojin'],
  [normalize('Mob Psycho 100')]: ['mob-psycho-100', 'mobpsycho100'],
  [normalize('Frieren: Beyond Journey’s End')]: ['frieren'],
  [normalize('Fullmetal Alchemist')]: ['fma', 'fullmetalalchemist'],
  [normalize('Demon Slayer: Kimetsu no Yaiba')]: ['kimetsu-no-yaiba', 'demonslayer'],
  [normalize('My Dress-Up Darling')]: ['sono-bisque-doll-wa-koi-wo-suru', 'my-dress-up-darling'],
  [normalize('My Hero Academia')]: ['bokunoheroacademia', 'myheroacademia'],
  [normalize('KONOSUBA -God\'s blessing on this wonderful world!')]: ['konosuba'],
  [normalize('Bungo Stray Dogs')]: ['bungostraydogs'],
  [normalize('The Quintessential Quintuplets')]: ['5hanayome', 'gotoubun-no-hanayome'],
  [normalize('Dr. STONE')]: ['dr-stone', 'drstone'],
  [normalize('One-Punch Man')]: ['onepunchman'],
  [normalize('Neon Genesis Evangelion')]: ['evangelion'],
  [normalize('Bakemonogatari')]: ['bakemonogatari1', 'monogatari'],
  [normalize('HAIKYU!!')]: ['haikyuu'],
  [normalize('My Teen Romantic Comedy SNAFU')]: ['oregairu', 'yahari-ore-no-seishun-love-comedy-wa-machigatteiru'],
  [normalize('OSHI NO KO')]: ['oshi-no-ko', 'oshinoko'],
  [normalize('A Silent Voice')]: ['koenokatachi', 'a-silent-voice'],
  [normalize('Mushoku Tensei: Jobless Reincarnation')]: ['mushokutensei'],
  [normalize('Monster')]: ['monster-anime', 'naokiurasawasmonster'],
  [normalize('86 EIGHTY-SIX')]: ['86-eighty-six', 'eighty-six'],
  [normalize('Land of the Lustrous')]: ['houseki-no-kuni'],
  [normalize('The Promised Neverland')]: ['yakusokunoneverland'],
  [normalize('Rent-a-Girlfriend')]: ['kanojo-okarishimasu'],
  [normalize('Your lie in April')]: ['shigatsu-wa-kimi-no-uso'],
  [normalize('Cyberpunk: Edgerunners')]: ['cyberpunk'],
  [normalize('Toilet-bound Hanako-kun')]: ['jibaku-shounen-hanako-kun'],
  [normalize('The Legend of Luoxiaohei')]: ['the-legend-of-luo-xiaohei', 'luoxiaohei'],
  [normalize('Serial Experiments Lain')]: ['lain'],
  [normalize('NANA')]: ['nana-anime', 'nana'],
  [normalize('Komi Can’t Communicate')]: ['komi-san', 'komisan'],
  [normalize('Love, Chunibyo & Other Delusions')]: ['chuunibyou'],
  [normalize('The Seven Deadly Sins')]: ['nanatsu-no-taizai'],
  [normalize('GTO: Great Teacher Onizuka')]: ['gto', 'great-teacher-onizuka'],
  [normalize('DAN DA DAN')]: ['dandadan'],
  [normalize('Solo Leveling')]: ['solo-leveling', 'sololeveling'],
  [normalize('Black Lagoon')]: ['blacklagoon'],
}

// Les champs de l'infobox, selon les wikis
const FIELDS = {
  gender: ['gender', 'sex'],
  occupation: ['occupation', 'occupations', 'occupation(s)', 'profession', 'professions', 'job'],
  hair: ['hair', 'hair color', 'hair colour', 'haircolor', 'hair_color', 'hair colors'],
} as const
type Key = keyof typeof FIELDS

const cacheDir = new URL('../.cache/fandom/', import.meta.url)
const cacheFile = (name: string) => new URL(`${name}.json`, cacheDir)

async function readJson<T>(name: string, fallback: T): Promise<T> {
  const text = await readFile(cacheFile(name), 'utf8').catch(() => null)
  return text ? JSON.parse(text) as T : fallback
}

const writeJson = (name: string, value: unknown) => writeFile(cacheFile(name), JSON.stringify(value))

// Une requête à l'API d'un wiki, avec reprise quand Fandom nous freine. null : le wiki n'existe pas.
async function api(wiki: string, params: Record<string, string>): Promise<any | null> {
  const url = `https://${wiki}.fandom.com/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, redirect: 'manual' }).catch(() => null)
    // Un wiki qui n'existe pas : redirection vers la page « pas trouvé », ou nom de domaine inconnu
    if (!response || (response.status >= 300 && response.status < 400) || response.status === 404)
      return null
    const text = await response.text()
    if (response.ok && text.startsWith('{'))
      return JSON.parse(text)
    if (attempt === MAX_ATTEMPTS)
      throw new Error(`Fandom ${wiki} : ${response.status} ${text.slice(0, 200)}`)
    const wait = 15_000 * attempt
    process.stdout.write(`\n  Fandom (${wiki}) nous freine, nouvel essai dans ${wait / 1000} s\n`)
    await sleep(wait)
  }
}

// --- 1. Le wiki de chaque anime ---

// « Fullmetal Alchemist: Brotherhood » → fullmetal-alchemist-brotherhood, fullmetalalchemistbrotherhood, fullmetal-alchemist...
function guesses(titles: string[]): string[] {
  const slug = (text: string) => text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const short = (text: string) => text.split(/[:!?\-–]| season| the movie/i)[0]!
  return [...new Set(titles.filter(Boolean).flatMap(title => [title, short(title)]).map(slug)
    .flatMap(name => [name, name.replace(/-/g, '')]).filter(name => name.length >= 3 && name.length <= 50))]
}

async function findWiki(anime: string, titles: string[], wikis: Record<string, string | null>): Promise<string | null> {
  const key = normalize(anime)
  if (key in wikis)
    return wikis[key]!
  const listed = WIKIS[key]
  const candidates = listed === null ? [] : listed ?? guesses([anime, ...titles])
  let found: string | null = null
  for (const candidate of candidates) {
    const info = await api(candidate, { action: 'query', meta: 'siteinfo' })
    if (info?.query?.general) {
      found = candidate
      break
    }
  }
  wikis[key] = found
  await writeJson('wikis', wikis)
  return found
}

// --- 2. Les pages des personnages ---

// Le lien direct de Wikidata vers l'article Fandom (« naruto:Gaara »), par id AniList
async function wikidataArticles(): Promise<Record<string, string>> {
  const cached = await readJson<Record<string, string> | null>('wikidata-articles', null)
  if (cached)
    return cached
  const query = 'SELECT ?anilist ?article WHERE { ?item wdt:P11736 ?anilist ; wdt:P6262 ?article }'
  const response = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' } })
  const json = await response.json() as { results: { bindings: { anilist: { value: string }, article: { value: string } }[] } }
  const articles = Object.fromEntries(json.results.bindings.map(binding => [binding.anilist.value, binding.article.value]))
  await writeJson('wikidata-articles', articles)
  return articles
}

// Les titres à essayer : le lien Wikidata, puis le nom et les alias en lettres latines
function characterTitles(target: WikiTarget, article: string | undefined): string[] {
  const aliases = (target.entry.aliases ?? []).filter(alias => /[a-z]/i.test(alias) && alias.length >= 3)
  return [...new Set([...(article ? [article.replace(/_/g, ' ')] : []), ...pageTitles(target.name), ...aliases])]
    .filter(title => !/[#<>[\]{}|]/.test(title))
}

type Pages = Record<string, string | null>

// Le début (section 0) de ces pages, en suivant les redirections, depuis le cache ou par lots de 50
async function fetchPages(wiki: string, titles: string[]): Promise<Pages> {
  const cache = await readJson<Pages>(`pages-${wiki}`, {})
  const missing = [...new Set(titles)].filter(title => !(title in cache))
  for (let i = 0; i < missing.length; i += TITLES_PER_REQUEST) {
    const batch = missing.slice(i, i + TITLES_PER_REQUEST)
    const data = await api(wiki, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', rvsection: '0', redirects: '1', titles: batch.join('|') })
    const renamed = new Map<string, string>([...data?.query?.normalized ?? [], ...data?.query?.redirects ?? []].map(({ from, to }: { from: string, to: string }) => [from, to]))
    const pages = new Map<string, string | null>((data?.query?.pages ?? []).map((page: any) => [page.title, page.revisions?.[0]?.slots?.main?.content ?? null]))
    for (const title of batch) {
      let current = title
      for (let hops = 0; renamed.has(current) && hops < 3; hops++)
        current = renamed.get(current)!
      cache[title] = pages.get(current)?.slice(0, MAX_CACHED_LENGTH) ?? null
    }
    await writeJson(`pages-${wiki}`, cache)
    await sleep(DELAY_MS)
  }
  return cache
}

// --- 3. L'infobox ---

// Les champs du 1er modèle de la page qui ressemble à une infobox de personnage ({{Character Infobox, {{Infobox character...})
export function fandomInfobox(wikitext: string): Record<string, string> | null {
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '')
  for (const match of text.matchAll(/\{\{\s*[^|{}\n]*(?:infobox|character|char\b|person)[^|{}\n]*/gi)) {
    const fields = templateFields(text, match.index!)
    if (Object.values(FIELDS).flat().some(name => fields[name]))
      return fields
  }
  return null
}

// Les champs « | clé = valeur » d'un modèle, en ne coupant que sur les « | » de son 1er niveau
function templateFields(text: string, start: number): Record<string, string> {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (let i = start; i < text.length; i++) {
    const pair = text.slice(i, i + 2)
    if (pair === '{{' || pair === '[[') {
      depth++
      current += pair
      i++
    } else if (pair === '}}' || pair === ']]') {
      depth--
      if (depth === 0) {
        parts.push(current)
        break
      }
      current += pair
      i++
    } else if (text[i] === '|' && depth === 1) {
      parts.push(current)
      current = ''
    } else {
      current += text[i]
    }
  }
  const fields: Record<string, string> = {}
  for (const part of parts.slice(1)) {
    const equal = part.indexOf('=')
    if (equal < 0)
      continue
    const value = cleanValue(part.slice(equal + 1))
    if (value)
      fields[part.slice(0, equal).trim().toLowerCase().replace(/_/g, ' ')] = value
  }
  return fields
}

const field = (fields: Record<string, string>, names: readonly string[]) =>
  names.map(name => fields[name.replace(/_/g, ' ')]).find(value => value !== undefined) ?? null

export function fandomValues(fields: Record<string, string>): Record<Key, AttributeValue> {
  return {
    gender: wikiGender(field(fields, FIELDS.gender)),
    occupation: splitOccupations(field(fields, FIELDS.occupation) ?? ''),
    hair: wikiHair(field(fields, FIELDS.hair)),
  }
}

// --- Complément ---

const isEmpty = (value: AttributeValue | undefined) => value === null || value === undefined

// Remplit les champs vides avec Fandom. Renvoie les entrées complétées, le détail, et les animes sans wiki.
export async function completeFromFandom(targets: WikiTarget[]): Promise<{ entries: Entry[], filled: string[], noWiki: string[] }> {
  await mkdir(cacheDir, { recursive: true })
  const wikis = await readJson<Record<string, string | null>>('wikis', {})
  const articles = await wikidataArticles()
  const incomplete = targets.filter(({ entry }) => Object.keys(FIELDS).some(key => isEmpty(entry.attributes[key])))

  // Les personnages de chaque wiki, avec les titres à essayer
  const byWiki = new Map<string, { target: WikiTarget, titles: string[] }[]>()
  const noWiki = new Set<string>()
  for (const target of incomplete) {
    const article = articles[target.entry.id]
    const anime = String(target.entry.attributes.anime ?? '')
    // Le lien Wikidata donne le wiki et la page ; sinon le wiki de l'anime
    const wiki = article?.split(':')[0] ?? await findWiki(anime, target.animeTitles, wikis)
    if (!wiki) {
      noWiki.add(anime)
      continue
    }
    const titles = characterTitles(target, article?.split(':').slice(1).join(':'))
    byWiki.set(wiki, [...byWiki.get(wiki) ?? [], { target, titles }])
  }

  const filled: string[] = []
  const completed = new Map<Entry, Entry>()
  let done = 0
  for (const [wiki, characters] of byWiki) {
    process.stdout.write(`\rFandom : ${++done}/${byWiki.size} wikis (${wiki})`.padEnd(70))
    const pages = await fetchPages(wiki, characters.flatMap(({ titles }) => titles))
    for (const { target, titles } of characters) {
      const fields = titles.map(title => pages[title]).filter((page): page is string => Boolean(page)).map(fandomInfobox).find(Boolean)
      if (!fields)
        continue
      const added = Object.fromEntries(Object.entries(fandomValues(fields)).filter(([key, value]) => isEmpty(target.entry.attributes[key]) && !isEmpty(value)))
      if (Object.keys(added).length === 0)
        continue
      completed.set(target.entry, { ...target.entry, attributes: { ...target.entry.attributes, ...added } })
      filled.push(`${target.entry.name} (${wiki}) : ${Object.entries(added).map(([key, value]) => `${key} ${JSON.stringify(value)}`).join(', ')}`)
    }
  }
  console.log()
  return { entries: targets.map(({ entry }) => completed.get(entry) ?? entry), filled, noWiki: [...noWiki] }
}
