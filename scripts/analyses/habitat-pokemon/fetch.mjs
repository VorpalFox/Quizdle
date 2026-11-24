// Télécharge les lieux de capture et l'espèce (évolution, habitat) des 386 premiers Pokémon
import { writeFileSync } from 'node:fs'
const out = process.argv[2]
const get = url => fetch(url).then(r => { if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json() })
const data = {}
const ids = Array.from({ length: 386 }, (_, i) => i + 1)
for (let i = 0; i < ids.length; i += 10) {
  await Promise.all(ids.slice(i, i + 10).map(async id => {
    const [encounters, species] = await Promise.all([get(`https://pokeapi.co/api/v2/pokemon/${id}/encounters`), get(`https://pokeapi.co/api/v2/pokemon-species/${id}`)])
    data[id] = {
      name: species.names.find(n => n.language.name === 'fr')?.name,
      habitat: species.habitat?.name ?? null,
      legendary: species.is_legendary || species.is_mythical,
      evolvesFrom: species.evolves_from_species ? Number(species.evolves_from_species.url.split('/').at(-2)) : null,
      encounters: encounters.flatMap(e => e.version_details.flatMap(v => v.encounter_details.map(d => ({ area: e.location_area.name, version: v.version.name, method: d.method.name })))),
    }
  }))
  process.stdout.write(`\r${Math.min(i + 10, 386)}/386`)
}
writeFileSync(out, JSON.stringify(data))
console.log()
