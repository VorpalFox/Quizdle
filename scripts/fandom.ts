// Complète le sexe, les cheveux et l'occupation avec l'infobox des wikis Fandom (un wiki par anime, très fourni,
// même pour les personnages secondaires). Chaque wiki a l'API MediaWiki : <wiki>.fandom.com/api.php.
// 1. Le wiki de chaque anime : la table WIKIS, sinon deviné à partir du titre (vérifié : le wiki doit exister)
// 2. La page de chaque personnage : le lien direct de Wikidata (P6262) s'il existe, sinon son nom (les deux ordres,
//    sans voyelles longues) et ses alias, 50 titres par requête
// 3. Les champs de l'infobox : hair / Hair Color, occupation, gender, age... Une page d'homonymie : ses liens suivis.
// 4. Les cheveux que l'infobox ne donne pas : dans le texte de la page entière (section Appearance d'abord)
// Réponses gardées dans .cache/fandom/ (hors git) : supprimer le dossier pour tout retélécharger.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { normalize } from '../src/engine/search.js'
import type { AttributeValue, Entry } from '../src/engine/types.js'
import { heightCm, sleep, splitOccupations, weaponList } from './anilist.js'
import { introRoles, introText, MAX_INTRO_SENTENCES } from './intro.js'
import { exactSpecies, translateOccupation } from './translate.js'
import { cleanValue, pageTitles, wikiGender, wikiHair, type WikiTarget } from './wikipedia.js'
import { disambiguationLinks, infoboxAge, textHair } from './wikiText.js'

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
  [normalize('Kaguya-sama: Love is War')]: ['kaguyasama-wa-kokurasetai'],
  [normalize('That Time I Got Reincarnated as a Slime')]: ['tensura'],
  [normalize('Puella Magi Madoka Magica')]: ['madoka', 'puellamagimadokamagica'],
  [normalize('JoJo\'s Bizarre Adventure')]: ['jojo'],
  [normalize('JoJo\'s Bizarre Adventure (TV)')]: ['jojo'],
  [normalize('Fate/stay night')]: ['typemoon'],
  [normalize('Fate/stay night: Unlimited Blade Works')]: ['typemoon'],
  [normalize('Fate/Zero')]: ['typemoon'],
  [normalize('Toradora!')]: ['tora-dora'],
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
  [normalize('Paradise Kiss')]: ['parakiss'],
  [normalize('Rascal Does Not Dream of Bunny Girl Senpai')]: ['aobuta', 'seishun-buta-yarou'],
  [normalize('Revolutionary Girl Utena')]: ['utena', 'revolutionarygirlutena'],
  [normalize('Trapped in a Dating Sim: The World of Otome Games Is Tough for Mobs')]: ['mobuseka'],
  [normalize('Tsubasa RESERVoir CHRoNiCLE')]: ['tsubasa', 'clamp'],
  [normalize('Uncle from Another World')]: ['isekai-ojisan', 'uncle-from-another-world'],
  [normalize('Vivy -Fluorite Eye\'s Song-')]: ['vivy', 'vivy-fluorite-eyes-song'],
  [normalize('BNA')]: ['brand-new-animal'],
  [normalize('Battle Game in 5 Seconds')]: ['battle-in-5-seconds-after-meeting'],
  [normalize('Chivalry of a Failed Knight')]: ['rakudai-kishi'],
  [normalize('The Unwanted Undead Adventurer')]: ['the-unwanted-immortal-adventurer'],
  [normalize('The Witch and the Beast')]: ['witchandthebeast'],
  [normalize('I\'m the Villainess, So I\'m Taming the Final Boss')]: ['im-the-villainess-so-im-taming-the-final-boss', 'akuyaku-reijou'],
  [normalize('Smoking Behind the Supermarket with You')]: ['yanisuu'],
  // Le wiki de Satoshi Kon : tous ses films, donc les persos de Paprika aussi
  [normalize('Paprika')]: ['satoshikon'],
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
  [normalize('Monster')]: ['obluda'],
  // Wiki en français seulement : <wiki>/<langue>
  [normalize('Assassination Classroom')]: ['assassination-classroom/fr'],
  [normalize('86 EIGHTY-SIX')]: ['86-eighty-six', 'eighty-six'],
  [normalize('Land of the Lustrous')]: ['houseki-no-kuni'],
  [normalize('The Promised Neverland')]: ['yakusokunoneverland'],
  [normalize('Rent-a-Girlfriend')]: ['kanojo-okarishimasu'],
  [normalize('Your lie in April')]: ['shigatsu-wa-kimi-no-uso'],
  [normalize('Cyberpunk: Edgerunners')]: ['cyberpunk'],
  [normalize('Toilet-bound Hanako-kun')]: ['hanako-kun'],
  [normalize('The Legend of Luoxiaohei')]: ['the-legend-of-luo-xiaohei', 'luoxiaohei'],
  [normalize('Serial Experiments Lain')]: ['lain'],
  [normalize('NANA')]: ['nana-anime', 'nana'],
  [normalize('Komi Can’t Communicate')]: ['komi-san', 'komisan'],
  [normalize('Love, Chunibyo & Other Delusions')]: ['chunibyo'],
  [normalize('The Seven Deadly Sins')]: ['nanatsu-no-taizai'],
  [normalize('GTO: Great Teacher Onizuka')]: ['gto', 'great-teacher-onizuka'],
  [normalize('DAN DA DAN')]: ['dandadan'],
  [normalize('Solo Leveling')]: ['solo-leveling', 'sololeveling'],
  [normalize('Black Lagoon')]: ['blacklagoon'],
}

// Les champs de l'infobox, selon les wikis (anglais, et français pour les wikis en /fr)
const FIELDS = {
  gender: ['gender', 'sex', 'sexe', 'genre'],
  // Dans l'ordre : le métier actuel d'abord, l'ancien (« previous occupation ») en dernier recours
  occupation: ['occupation', 'current occupation', 'occupations', 'occupation(s)', 'profession', 'professions', 'profession(s)', 'job', 'jobs', 'job(s)',
    'métier', 'activité', 'fonction', 'unioccupation', 'hsoccupation', 'position', 'previous occupation', 'former occupation', 'f. occupation'],
  hair: ['hair', 'hair color', 'hair colour', 'haircolor', 'hair_color', 'hair colors', 'cheveux', 'couleur de cheveux', 'couleur des cheveux'],
  age: ['age', 'âge', 'ages'],
  // L'espèce brute, traduite à la fin (translateSpeciesEntries) ; la taille en cm (Weebdle seulement)
  // classification : DARLING in the FRANXX, Index ; type : Fate (« Servant, Human, Magus »), ailleurs souvent autre chose
  // (le type de Nen à Hunter x Hunter), mis de côté comme tout ce qui n'est pas une espèce connue
  species: ['species', 'race', 'races', 'species/race', 'espèce', 'classification', 'kind', 'type'],
  height: ['height', 'heights', 'taille'],
  // L'arme rejoint l'occupation à la fin (finishOccupations)
  weapon: ['weapon', 'weapons', 'weapon(s)', 'armament', 'armaments', 'arme', 'armes', 'equipment', 'equipment/s'],
  // Les titres (« Red King », « The Black Swordsman ») : ajoutés à l'occupation à la fin aussi, ceux qu'on sait traduire
  titles: ['titles', 'title(s)', 'epithet', 'epithets'],
  // Mort : « Aucune » comme occupation s'il n'en a pas d'autre (finishOccupations). Jamais affiché tel quel : un spoil.
  deceased: ['status', 'vital status'],
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
  // « assassination-classroom/fr » : le wiki en français est sous fandom.com/fr
  const [host, language] = wiki.split('/')
  const url = `https://${host}.fandom.com${language ? `/${language}` : ''}/api.php?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`
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

// Pas de page au nom du perso : la recherche du wiki, quand AniList et le wiki ne l'appellent pas pareil (« Pyoran »
// → « Pioran », « Kansatsu-sha » → « The Beholder » sur le wiki de To Your Eternity). Sans les sous-pages (« Pioran/Plot »)
// ni les épisodes ou chapitres ; le résultat ne compte que s'il a une infobox de perso (voir completeFromFandom).
const SEARCH_RESULTS = 3
async function searchTitles(wiki: string, names: string[]): Promise<Record<string, string[]>> {
  const name = `search-${wiki.replace('/', '-')}`
  const cache = await readJson<Record<string, string[]>>(name, {})
  const missing = [...new Set(names)].filter(query => !(query in cache))
  for (const query of missing) {
    const data = await api(wiki, { action: 'query', list: 'search', srsearch: query, srlimit: String(SEARCH_RESULTS) })
    cache[query] = (data?.query?.search ?? []).map(({ title }: { title: string }) => title).filter((title: string) => !title.includes('/') && !NOT_THE_ANIME.test(title))
    await writeJson(name, cache)
    await sleep(DELAY_MS)
  }
  return cache
}

// Le titre trouvé par la recherche est bien ce perso : chaque mot de son nom AniList s'y retrouve, à une faute de
// transcription près (« Pyoran » / « Pioran », « Barazaki » / « Baragasaki », « Ayanokouji » / « Ayanokōji »).
// Écarte les autres persos qui partagent un mot (« Ling Wang Ma », sa mère, n'est pas « Wang Ling »).
export function sameName(name: string, title: string): boolean {
  const words = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/ou/g, 'o').replace(/uu/g, 'u').replace(/ii/g, 'i').replace(/['’.]/g, '').split(/[^a-z0-9]+/).filter(Boolean)
  const titleWords = words(title)
  const candidates = [...titleWords, titleWords.join('')]
  return words(name).every(word => candidates.some(candidate => distance(word, candidate) <= (word.length >= 5 ? 2 : word.length >= 3 ? 1 : 0)))
}

// Distance d'édition, une inversion de deux lettres comptant pour une (« Zhou » / « Zhuo »)
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1)
    }
  }
  return d[a.length]![b.length]!
}

type Pages = Record<string, string | null>

// Le début (section 0) de ces pages, en suivant les redirections, depuis le cache ou par lots de 50
async function fetchPages(wiki: string, titles: string[]): Promise<Pages> {
  const cache = await readJson<Pages>(`pages-${wiki.replace('/', '-')}`, {})
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
    await writeJson(`pages-${wiki.replace('/', '-')}`, cache)
    await sleep(DELAY_MS)
  }
  return cache
}

// La page entière (pour les cheveux décrits dans le texte), depuis le cache ou par lots de 50
const MAX_FULL_LENGTH = 60_000
async function fetchFullPages(wiki: string, titles: string[]): Promise<Pages> {
  const name = `full-${wiki.replace('/', '-')}`
  const cache = await readJson<Pages>(name, {})
  const missing = [...new Set(titles)].filter(title => !(title in cache))
  for (let i = 0; i < missing.length; i += TITLES_PER_REQUEST) {
    const batch = missing.slice(i, i + TITLES_PER_REQUEST)
    const data = await api(wiki, { action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: batch.join('|') })
    const renamed = new Map<string, string>([...data?.query?.normalized ?? [], ...data?.query?.redirects ?? []].map(({ from, to }: { from: string, to: string }) => [from, to]))
    const pages = new Map<string, string | null>((data?.query?.pages ?? []).map((page: any) => [page.title, page.revisions?.[0]?.slots?.main?.content ?? null]))
    for (const title of batch) {
      let current = title
      for (let hops = 0; renamed.has(current) && hops < 3; hops++)
        current = renamed.get(current)!
      cache[title] = pages.get(current)?.slice(0, MAX_FULL_LENGTH) ?? null
    }
    await writeJson(name, cache)
    await sleep(DELAY_MS)
  }
  return cache
}

// Les liens d'une page d'homonymie à ne pas suivre : pas le personnage de l'anime (film, jeu, chanson, épisode…)
const NOT_THE_ANIME = /film|movie|novel|book|card|item|weapon|location|game|song|episode|chapter|arc|album|disambiguation/i
const DISAMBIGUATION = /\{\{\s*disambig|may (?:also )?refer to/i

// --- 3. L'infobox ---

// Les champs du 1er modèle de la page qui ressemble à une infobox de personnage : {{Character Infobox, {{Infobox character...,
// mais aussi les noms maison ({{Human| sur le wiki de Death Note}}), reconnus à leurs champs (gender, occupation...)
export function fandomInfobox(wikitext: string): Record<string, string> | null {
  // Sans les <nowiki> : leur « ]] » fermerait le modèle trop tôt (Wang Ling, wiki d'Immortal King)
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>|<ref[\s\S]*?<\/ref>/gi, '').replace(/<nowiki>[\s\S]*?<\/nowiki>/gi, '')
  for (const match of text.matchAll(/\{\{\s*[^|{}\n]+/g)) {
    const fields = templateFields(text, match.index!)
    if (INFOBOX_FIELDS.some(name => fields[name]))
      return fields
  }
  return null
}
// Pas la taille : les onglets en haut de page ({{Tabs|height = 35px|tab1 = Overview}}) ont aussi un champ « height »
// Ni les champs d'espèce trop courants dans d'autres modèles ({{Quote|type = …}})
const NOT_INFOBOX_ONLY = new Set(['type', 'kind', 'classification'])
const INFOBOX_FIELDS: readonly string[] = Object.entries(FIELDS).flatMap(([key, names]) => key === 'height' ? [] : names.filter(name => !NOT_INFOBOX_ONLY.has(name)))

// Les champs « | clé = valeur » d'un modèle, en ne coupant que sur les « | » de son 1er niveau
export function templateFields(text: string, start: number): Record<string, string> {
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
    const key = part.slice(0, equal).trim().toLowerCase().replace(/_/g, ' ')
    const raw = part.slice(equal + 1)
    const value = cleanValue(UNHIDDEN_FIELDS.has(key) ? unhide(raw) : raw)
    if (value)
      fields[key] = value
  }
  return fields
}

// Le contenu des spoilers repliés ({{Hidden|Webcomic Spoiler|…}}, {{Hide|…}}) est lu pour l'occupation, l'arme, les
// titres et l'espèce : un indice vaut mieux qu'un spoil évité (Sonic : « Legendary Demon Blade »). Seule la mort n'est
// jamais dite : le statut reste sans ses spoilers, comme l'affiliation (Satoru chez les Neo Heroes).
const UNHIDDEN_FIELDS = new Set([...FIELDS.occupation, ...FIELDS.weapon, ...FIELDS.titles, ...FIELDS.species].map(name => name.replace(/_/g, ' ')))
const HIDDEN = /\{\{\s*(?:hidden|hide)\s*\|/gi

// {{Hidden|titre|contenu}} → contenu, {{Hide|contenu}} → contenu
export function unhide(text: string): string {
  let result = ''
  let last = 0
  for (const match of text.matchAll(HIDDEN)) {
    if (match.index! < last)
      continue
    // Les arguments du modèle, coupés sur les « | » de son 1er niveau, jusqu'à son « }} »
    const args = ['']
    let depth = 1
    let i = match.index! + match[0].length
    for (; i < text.length && depth > 0; i++) {
      const pair = text.slice(i, i + 2)
      if (pair === '{{' || pair === '[[') {
        depth++
        args[args.length - 1] += pair
        i++
      } else if (pair === '}}' || pair === ']]') {
        depth--
        if (depth > 0)
          args[args.length - 1] += pair
        i++
      } else if (text[i] === '|' && depth === 1) {
        args.push('')
      } else {
        args[args.length - 1] += text[i]
      }
    }
    result += text.slice(last, match.index) + args[args.length - 1]
    last = i
  }
  return result + text.slice(last)
}

const field = (fields: Record<string, string>, names: readonly string[]) =>
  names.map(name => fields[name.replace(/_/g, ' ')]).find(value => value !== undefined) ?? null

const rawList = (value: string | null) => value ? [value] : null

export function fandomValues(fields: Record<string, string>): Record<Key, AttributeValue> {
  return {
    gender: wikiGender(field(fields, FIELDS.gender)),
    occupation: splitOccupations(field(fields, FIELDS.occupation) ?? ''),
    hair: wikiHair(field(fields, FIELDS.hair)),
    age: infoboxAge(field(fields, FIELDS.age)),
    species: rawList(field(fields, FIELDS.species)),
    height: heightCm(field(fields, FIELDS.height)),
    weapon: weaponList(field(fields, FIELDS.weapon)),
    titles: titleOccupations(field(fields, FIELDS.titles)),
    deceased: isDeceased(field(fields, FIELDS.deceased)) ? DECEASED : null,
  }
}

// Mort sans ambiguïté : « Deceased », « Killed in action », mais pas « Alive (resurrected) », « Active, Deceased »
// ni « Deceased (vampire), Unknown (demon) » (selon la version ou la saison)
export const DECEASED = 'deceased'
const isDeceased = (status: string | null) =>
  Boolean(status && /\b(?:deceased|dead|killed|died)\b/i.test(status) && !/\b(?:alive|living|active|resurrect\w*|reincarnated|revived|unknown)\b/i.test(status))

// L'affiliation, quand l'infobox n'a pas d'occupation (« Student (formerly) » sur le wiki de Gleipnir) : seulement un
// rôle simple qu'on sait traduire. Pas les organisations (« Demon Slayer Corps » pour Nezuko, un démon), les
// possessifs (« Souichirou Kuzuki's Servant ») ni les noms propres (« Prince Bojji » pour Gigan, son serviteur).
const AFFILIATION_FIELDS = ['affiliation', 'affiliations', 'current affiliation']
const NOT_A_ROLE = /'s\b|’s\b|\b(?:corps|army|military|force|forces|federation|kingdom|empire|family|group|shop|association|guild|academy|school|order|organization|agency|club|society|team|party|clan|house|church|government|council|division|squad|unit|company|tribe|faction|alliance|union|league)\b/i
const PROPER_NAME = /^\S+\s+[A-Z]/
export function affiliationOccupations(value: string | null): string[] | null {
  const roles = (value ?? '').split(/\s*(?:,|;|\n|<br\s*\/?>)\s*/).map(item => item.replace(/\s*\([^)]*\)/g, '').trim())
    .filter(item => item && !NOT_A_ROLE.test(item) && !PROPER_NAME.test(item))
  return titleOccupations(roles.join(', ') || null)
}

// L'école de l'infobox, quand elle n'a pas d'occupation (Ryota Suzui : « school = Hyakkaou Private Academy ») : élève.
// Pas une ancienne école (« (formerly) », « graduated »). Ni « class » (« 1-D », mais aussi « Warrior », « S-Class »), ni
// « grade » (« A+ », « Grade 1 »), ni « year » : trop d'autres sens.
const SCHOOL_FIELDS = ['school', 'schools', 'école']
const FORMER_SCHOOL = /\b(?:former(?:ly)?|graduated?|alumn\w*|dropped out|expelled)\b/i
export function schoolOccupations(value: string | null): string[] | null {
  return value && !FORMER_SCHOOL.test(value) ? titleOccupations('Student') : null
}

// Les titres traduits en occupations. Un titre qu'on ne sait pas traduire (« Symbol of Evil ») est laissé de côté,
// pas gardé en anglais : ce sont des surnoms, pas des métiers à corriger.
function titleOccupations(value: string | null): string[] | null {
  const found = (splitOccupations(value ?? '') ?? []).map(title => translateOccupation(title.replace(/[«»"]/g, '').trim())).filter((name): name is string => Boolean(name))
  return found.length > 0 ? [...new Set(found)] : null
}

// --- L'introduction ---

const MAX_INTRO_OCCUPATIONS = 2

// Sans occupation dans l'infobox : ce que dit l'introduction de la page (« Tatsumi is a young swordsman » → Épéiste),
// comme au Pixeldle. Chaque rôle est traduit tout de suite, en retirant les adjectifs de tête s'il le faut (« young
// swordsman » → « swordsman ») : un rôle intraduisible est laissé de côté, pas gardé en anglais. Moins sûr que
// l'infobox, donc listé dans le récap pour relecture. Certains wikis rangent l'intro dans l'infobox (« |intro= » sur
// celui de Classroom of the Elite) : retirée avec elle par introText, on la prend dans le champ.
export function introOccupations(wikitext: string): { roles: string[], occupation: string[] } {
  const roles = introRoles(fandomInfobox(wikitext)?.intro ?? introText(wikitext))
  const occupation = roles.flatMap(role => {
    const words = role.split(/\s+/)
    for (let start = 0; start < words.length; start++) {
      const french = translateOccupation(words.slice(start).join(' '))
      if (french !== undefined)
        return french ? [french] : []
    }
    return []
  })
  return { roles, occupation: [...new Set(occupation)].slice(0, MAX_INTRO_OCCUPATIONS) }
}

// L'espèce dite par l'introduction, quand l'infobox n'en a pas : « Aqua is a goddess who… » → goddess, « a young elf
// girl » → elf. Le dernier mot du rôle (sans « girl », « man »…), puis les deux derniers, et seulement un nom d'espèce
// exact : « a Demon Slayer » n'est pas un démon. Ce qu'il devient compte aussi (« she later became a vampire ») : un
// indice vaut mieux qu'un spoil évité. Pas ce qu'il fait semblant d'être (« disguised as a human »). Rendu en anglais,
// traduit à la fin comme les autres (translateSpeciesEntries).
const NOT_THE_START = /\b(?:disguised|disguises|posing|poses|pretends?|pretending|believed|thought to be|claims?|mistaken)\b/i
const GENERIC_NOUN = /\s+(?:girl|boy|man|men|woman|women|child|children|kid|teen|teenager|lady|maiden|youth|being|creature|person|individual|female|male|princess|prince|king|queen|lord|knight|warrior|hybrid)$/i
const SPECIES_ROLE = /\b(?:is|was|became|becomes|turned into|turns into)\s+(?:(?:a|an|the|one of the|also)\s+)+([^.;:,()"]+)/i
const END_OF_SPECIES = /\s(?:who|that|which|whose|in|from|for|with|at|on|to|by|of|and|but|named|known|living|born)\b.*$/i
export function introSpecies(wikitext: string): string | null {
  const intro = fandomInfobox(wikitext)?.intro ?? introText(wikitext)
  for (const sentence of intro.split(/(?<=[.!?])\s+/).slice(0, MAX_INTRO_SENTENCES)) {
    if (NOT_THE_START.test(sentence))
      continue
    let role = SPECIES_ROLE.exec(sentence)?.[1]?.replace(END_OF_SPECIES, '').trim()
    if (!role)
      continue
    for (let previous = ''; previous !== role;) {
      previous = role
      role = role.replace(GENERIC_NOUN, '')
    }
    const words = role.split(/\s+/)
    for (const length of [1, 2]) {
      const head = words.slice(-length).join(' ')
      if (words.length >= length && exactSpecies(head))
        return head
    }
  }
  return null
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
    const firstPages = await fetchPages(wiki, characters.flatMap(({ titles }) => titles))
    // Pas d'infobox, mais une page d'homonymie (« Rem ») : ses liens « Rem (…) », ceux qui citent l'anime d'abord
    for (const character of characters) {
      if (character.titles.some(title => firstPages[title] && fandomInfobox(firstPages[title]!)))
        continue
      const prefer = (qualifier: string) => character.target.animeTitles.some(title => title && normalize(qualifier).includes(normalize(title)))
      character.titles = [...character.titles, ...character.titles.flatMap(title => firstPages[title] ? disambiguationLinks(firstPages[title]!, title, prefer, NOT_THE_ANIME) : [])]
    }
    let pages = await fetchPages(wiki, characters.flatMap(({ titles }) => titles))
    // Aucune page à son nom : les résultats de la recherche du wiki
    const lost = characters.filter(({ titles }) => !titles.some(title => pages[title]))
    const results = lost.length > 0 ? await searchTitles(wiki, lost.map(({ target }) => target.entry.name)) : {}
    // Le 1er résultat seulement (plus bas, c'est souvent un autre perso qui le cite), et s'il porte bien son nom
    const searched = new Map(lost.map(({ target }) => [target, (results[target.entry.name] ?? []).slice(0, 1).filter(title => sameName(target.entry.name, title))]))
    if (lost.length > 0)
      pages = { ...pages, ...await fetchPages(wiki, [...searched.values()].flat()) }
    // La page de chaque personnage : la 1re qui a une infobox, sinon la 1re page à son nom qui n'est pas une page
    // d'homonymie (infobox dans un modèle maison, {{Saten Ruiko}} sur le wiki de Railgun) : son texte sert encore
    // pour l'occupation de l'intro et les cheveux. Un résultat de recherche ne compte qu'avec une infobox de perso.
    const found = characters.flatMap(({ target, titles }) => {
      const title = [...titles, ...searched.get(target) ?? []].find(title => pages[title] && fandomInfobox(pages[title]!))
      if (title)
        return [{ target, title, values: fandomValues(fandomInfobox(pages[title]!)!) }]
      const bare = titles.find(title => pages[title] && !DISAMBIGUATION.test(pages[title]!))
      return bare ? [{ target, title: bare, values: fandomValues({}) }] : []
    })
    // Les cheveux que l'infobox ne donne pas : cherchés dans le texte de la page entière (section Appearance d'abord)
    const hairless = found.filter(({ target, values }) => isEmpty(target.entry.attributes.hair) && isEmpty(values.hair))
    const full = hairless.length > 0 ? await fetchFullPages(wiki, hairless.map(({ title }) => title)) : {}
    const textHairs = new Map(hairless.flatMap(({ target, title }) => {
      const hair = full[title] ? textHair(full[title]!) : null
      return hair ? [[target, hair] as const] : []
    }))
    for (const { target, title, values } of found) {
      const added: Record<string, AttributeValue> = Object.fromEntries(Object.entries(values).filter(([key, value]) => isEmpty(target.entry.attributes[key]) && !isEmpty(value)))
      const hair = textHairs.get(target)
      if (hair)
        added.hair = hair.colors
      // Sans occupation : le rôle de l'affiliation de l'infobox (« Student (formerly) ») et ce que dit l'introduction,
      // les deux ensemble (Shuichi Kagaya : élève et tueur), et élève s'il a une école
      const jobless = isEmpty(target.entry.attributes.occupation) && isEmpty(values.occupation)
      const infobox = fandomInfobox(pages[title]!) ?? {}
      const affiliation = jobless ? affiliationOccupations(field(infobox, AFFILIATION_FIELDS)) : null
      const intro = jobless ? introOccupations(pages[title]!) : null
      const school = jobless ? schoolOccupations(field(infobox, SCHOOL_FIELDS)) : null
      const jobs = [...new Set([...affiliation ?? [], ...intro?.occupation ?? [], ...school ?? []])]
      if (jobs.length > 0)
        added.occupation = jobs
      // Sans espèce : celle que dit l'introduction (« Aqua is a goddess »)
      const species = isEmpty(target.entry.attributes.species) && isEmpty(values.species) ? introSpecies(pages[title]!) : null
      if (species)
        added.species = [species]
      if (Object.keys(added).length === 0)
        continue
      completed.set(target.entry, { ...target.entry, attributes: { ...target.entry.attributes, ...added } })
      const page = target.name.full === title ? '' : `, page « ${title} »`
      filled.push(`${target.entry.name} (${wiki}${page}) : ${Object.entries(added).map(([key, value]) => `${key} ${JSON.stringify(value)}`).join(', ')}${hair ? ` (cheveux du texte : « ${hair.excerpt} »)` : ''}${affiliation ? ' (occupation de l\'affiliation)' : ''}${school ? ' (élève : école de l\'infobox)' : ''}${species ? ' (espèce de l\'intro)' : ''}${intro?.occupation.length ? ` (occupation de l'intro : « ${intro.roles.join(' | ')} »)` : ''}`)
    }
  }
  console.log()
  return { entries: targets.map(({ entry }) => completed.get(entry) ?? entry), filled, noWiki: [...noWiki] }
}
