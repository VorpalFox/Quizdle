// Vide du cache les pages de wiki modifiées depuis qu'on les a téléchargées, pour qu'un fetch les reprenne sans tout
// retélécharger. Usage : npm run refresh:cache [-- <filtre>], puis npm run fetch:weebdle / fetch:anime / fetch:pixeldle.
// Le filtre garde les fichiers dont le chemin le contient (« wikipedia/fr », « fandom/ », « kaminomi »).
//   - Les pages (Fandom du Weebdle et de l'Animedle, wikis du Pixeldle, Wikipédia) dont la dernière révision est plus
//     récente que la dernière vérif, celles créées depuis (gardées vides) et celles supprimées depuis.
//   - La liste des persos d'un wiki du Pixeldle (sa catégorie) et les recherches d'un wiki Fandom, si des pages y ont
//     été créées depuis : un perso ajouté au wiki (Sundered) ou une page qui manquait.
// La date de la dernière vérif de chaque fichier est gardée dans .cache/refresh.json ; la 1re fois, c'est la création du
// fichier (large : une page vue au début et modifiée avant la fin du fetch est reprise aussi, pas un souci).
// AniList, MAL et Wikidata ne disent pas ce qui a changé : supprimer leur dossier pour les reprendre.
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { sleep } from './anilist.js'
import { request } from './pixeldleEnrich.js'

const TITLES_PER_REQUEST = 50
const DELAY_MS = 500

type Pages = Record<string, string | null>
// La dernière révision de chaque page demandée (null : la page n'existe pas), par le titre demandé
type Revisions = Map<string, string | null>

const root = new URL('../.cache/', import.meta.url)
const refreshFile = new URL('refresh.json', root)

// Les pages du cache à reprendre : modifiées depuis, créées depuis (le cache n'en avait rien) ou supprimées depuis
function staleTitles(cache: Pages, revisions: Revisions, since: Date): string[] {
  return Object.keys(cache).filter(title => {
    if (!revisions.has(title))
      return false
    const timestamp = revisions.get(title)!
    if (timestamp === null)
      return cache[title] !== null
    return cache[title] === null || new Date(timestamp) > since
  })
}

// La dernière révision de ces pages, en suivant les redirections, par lots de 50
async function lastRevisions(api: string, titles: string[]): Promise<Revisions> {
  const revisions: Revisions = new Map()
  for (let i = 0; i < titles.length; i += TITLES_PER_REQUEST) {
    const batch = titles.slice(i, i + TITLES_PER_REQUEST)
    const data = await request(api, { action: 'query', prop: 'revisions', rvprop: 'timestamp', redirects: '1', titles: batch.join('|') })
    if (!data)
      return revisions
    const renamed = new Map<string, string>([...data.query?.normalized ?? [], ...data.query?.redirects ?? []].map(({ from, to }: { from: string, to: string }) => [from, to]))
    const pages = new Map<string, string | null>((data.query?.pages ?? []).map((page: any) => [page.title, page.revisions?.[0]?.timestamp ?? null]))
    for (const title of batch) {
      let current = title
      for (let hops = 0; renamed.has(current) && hops < 3; hops++)
        current = renamed.get(current)!
      // Un titre invalide n'est pas dans la réponse : on n'y touche pas
      if (pages.has(current))
        revisions.set(title, pages.get(current)!)
    }
    await sleep(DELAY_MS)
  }
  return revisions
}

// Des pages créées sur le wiki depuis (articles seulement)
async function hasNewPages(api: string, since: Date): Promise<boolean> {
  const data = await request(api, { action: 'query', list: 'recentchanges', rctype: 'new', rcnamespace: '0', rcend: since.toISOString(), rclimit: '1' })
  await sleep(DELAY_MS)
  return (data?.query?.recentchanges ?? []).length > 0
}

// Les fichiers du cache et l'API de leur wiki
interface CacheFile {
  path: string
  api: string
  kind: 'pages' | 'list'
}

// Fandom (Weebdle, Animedle) : pages-<wiki>, full-<wiki>, search-<wiki>, le wiki d'après wikis.json
async function fandomFiles(): Promise<CacheFile[]> {
  const wikis = JSON.parse(await readFile(new URL('fandom/wikis.json', root), 'utf8').catch(() => '{}')) as Record<string, string | null>
  const apis = new Map(Object.values(wikis).filter(wiki => wiki !== null).map(wiki => {
    const [host, language] = wiki.split('/')
    return [wiki.replace('/', '-'), `https://${host}.fandom.com${language ? `/${language}` : ''}/api.php`]
  }))
  const names = await readdir(new URL('fandom/', root)).catch(() => [])
  return names.flatMap(name => {
    const match = name.match(/^(pages|full|search)-(.+)\.json$/)
    const api = match ? apis.get(match[2]!) : undefined
    return match && api ? [{ path: `fandom/${name}`, api, kind: match[1] === 'search' ? 'list' as const : 'pages' as const }] : []
  })
}

// Pixeldle : pages/<api>.json, categories/<api>.json (la liste), categories/<api>.full.json, categories/<api>.<catégorie>.json
async function pixeldleFiles(): Promise<CacheFile[]> {
  const wikis = JSON.parse(await readFile(new URL('pixeldle/wikis.json', root), 'utf8').catch(() => '{}')) as Record<string, unknown>
  const apis = [...Object.keys(wikis), 'https://en.wikipedia.org/w/api.php', 'https://fr.wikipedia.org/w/api.php']
  const bases = new Map(apis.map(api => [api.replace(/^https?:\/\//, '').replace(/[^a-z0-9.-]+/gi, '_'), api]))
  const files: CacheFile[] = []
  for (const folder of ['pages', 'categories']) {
    for (const name of await readdir(new URL(`pixeldle/${folder}/`, root)).catch(() => [])) {
      const base = name.match(/^(.+?api\.php)\./)?.[1]
      const api = base ? bases.get(base) : undefined
      if (!api)
        continue
      const kind = folder === 'pages' || name.endsWith('.full.json') ? 'pages' : 'list'
      files.push({ path: `pixeldle/${folder}/${name}`, api, kind })
    }
  }
  return files
}

const wikipediaFiles = (): CacheFile[] => ['en', 'fr'].map(language => ({ path: `wikipedia/${language}.json`, api: `https://${language}.wikipedia.org/w/api.php`, kind: 'pages' }))

const checked = JSON.parse(await readFile(refreshFile, 'utf8').catch(() => '{}')) as Record<string, string>
const filter = process.argv[2] ?? ''
const files = [...await fandomFiles(), ...await pixeldleFiles(), ...wikipediaFiles()].filter(file => file.path.includes(filter))
let removedPages = 0
let removedLists = 0
for (const [index, file] of files.entries()) {
  const url = new URL(file.path, root)
  const info = await stat(url).catch(() => null)
  if (!info)
    continue
  const started = new Date()
  const since = checked[file.path] ? new Date(checked[file.path]!) : info.birthtime
  process.stdout.write(`\r${index + 1}/${files.length} ${file.path}`.padEnd(90))
  if (file.kind === 'list') {
    // Toute la liste à reprendre : le fetch la refait au complet
    if (await hasNewPages(file.api, since)) {
      await writeFile(url, file.path.startsWith('fandom/') ? '{}' : 'null')
      removedLists++
      console.log(`\n  ${file.path} : nouvelles pages, liste à reprendre`)
    }
  }
  else {
    const cache = JSON.parse(await readFile(url, 'utf8')) as Pages
    const stale = staleTitles(cache, await lastRevisions(file.api, Object.keys(cache)), since)
    if (stale.length > 0) {
      // Relu juste avant d'écrire : un fetch a pu l'enrichir pendant ce temps
      const fresh = JSON.parse(await readFile(url, 'utf8')) as Pages
      for (const title of stale)
        delete fresh[title]
      await writeFile(url, JSON.stringify(fresh))
      removedPages += stale.length
      console.log(`\n  ${file.path} : ${stale.length} pages à reprendre (${stale.slice(0, 5).join(', ')}${stale.length > 5 ? '…' : ''})`)
    }
  }
  checked[file.path] = started.toISOString()
  await writeFile(refreshFile, JSON.stringify(checked, null, 2))
}
console.log(`\n${removedPages} pages et ${removedLists} listes retirées du cache : relancer les fetch pour les reprendre`)
