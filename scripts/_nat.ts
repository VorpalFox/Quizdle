// Analyse jetable : les champs d'infobox des franchises sans nationalité
import { readdirSync, readFileSync } from 'node:fs'
import { infobox } from './pixeldleEnrich.js'

const wikis = readFileSync('.cache/pixeldle/pixeldle-wikis.md', 'utf8').split('\n')
const data = JSON.parse(readFileSync('data/pixeldle.json', 'utf8'))
const files = readdirSync('.cache/pixeldle/pages')
const franchises = process.argv.slice(2)
for (const fr of franchises) {
  const line = wikis.find(l => l.startsWith(`| ${fr} |`)) ?? ''
  const id = line.split('|')[3]?.trim().split(' ')[0] ?? ''
  const file = files.find(f => f.startsWith(`${id}.`) || f.startsWith(`${id}_`))
  if (!file) {
    console.log(fr, '— pas de cache', id)
    continue
  }
  const pages = JSON.parse(readFileSync(`.cache/pixeldle/pages/${file}`, 'utf8'))
  const names = data.filter((e: any) => e.attributes.franchise === fr).flatMap((e: any) => [e.name, ...e.aliases])
  const counts: Record<string, number> = {}
  const samples: Record<string, string> = {}
  for (const n of names) {
    const t = pages[n]
    if (typeof t !== 'string')
      continue
    for (const [k, v] of Object.entries(infobox(t) ?? {})) {
      counts[k] = (counts[k] ?? 0) + 1
      samples[k] ??= String(v).replace(/\s+/g, ' ').slice(0, 30)
    }
  }
  console.log(`${fr} (${file}) : ${Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k, c]) => `${k}:${c}「${samples[k]}」`).join(' | ')}`)
}
