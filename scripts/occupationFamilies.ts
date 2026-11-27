// Les familles d'occupations, communes à l'Animedle, au Weebdle (translate.ts) et au Pixeldle (pixeldleTranslate.ts) :
// chacun garde ses propres synonymes, mais les familles sont les mêmes partout

// Les grandes familles, ajoutées à la valeur précise qui garde son info en plus (Épéiste + Combattant) : deux persos
// qui se battent se croisent en jaune même avec des armes différentes. Combattant, c'est le corps à corps ; Tireur, à
// distance (arme à feu, arc) : un tireur et un épéiste ne se croisent pas (validé avec FX)
export const OCCUPATION_FAMILIES: Record<string, readonly string[]> = {
  // Combat
  'Swordsman': ['Fighter'], 'Samurai': ['Fighter'], 'Ninja': ['Fighter'], 'Knight': ['Fighter'], 'Archer': ['Shooter'],
  'Marksman': ['Shooter'], 'Sniper': ['Shooter'], 'Lancer': ['Fighter'], 'Mercenary': ['Fighter'], 'Martial artist': ['Fighter'],
  'Wrestler': ['Fighter', 'Athlete'], 'Bounty hunter': ['Fighter'], 'Nanny': ['Servant'], 'Bartender': ['Waiter'],
  // Soldat à part : un militaire n'est pas forcément un combattant, l'indice n'est pas le même (validé avec FX)
  'Officer': ['Soldier'], 'Survey Corps': ['Soldier'], 'Scout': ['Soldier'],
  'Demon Slayer': ['Monster hunter', 'Fighter'], 'Demon hunter': ['Monster hunter', 'Fighter'],
  'Vampire hunter': ['Monster hunter', 'Fighter'], 'Exorcist': ['Monster hunter', 'Mage'],
  'Superhero': ['Hero', 'Fighter'],
  // Crime
  'Assassin': ['Criminal', 'Fighter'], 'Serial killer': ['Criminal'], 'Mobster': ['Criminal'], 'Thug': ['Criminal'],
  'Thief': ['Criminal'], 'Pirate': ['Criminal'], 'Terrorist': ['Criminal'],
  // Magie, religion
  'Magical girl': ['Mage'], 'Onmyouji': ['Mage'], 'Curse user': ['Mage'], 'Miko': ['Cleric'], 'Oracle': ['Cleric'],
  // Pouvoir
  'Royalty': ['Noble', 'Leader'], 'President': ['Leader'], 'Manager': ['Leader'], 'Captain': ['Leader'],
  'Principal': ['Teacher', 'Leader'], 'Student council president': ['Student', 'Leader'],
  'Company president': ['Businessperson', 'Leader'],
  // Sciences, santé
  'Surgeon': ['Doctor'], 'Psychiatrist': ['Doctor'], 'Engineer': ['Scientist'], 'Inventor': ['Scientist'],
  'Archaeologist': ['Scientist'], 'Oceanographer': ['Scientist'], 'Astronomer': ['Scientist'], 'Alchemist': ['Scientist'],
  // Arts, spectacle
  'Singer': ['Musician', 'Artist'], 'Musician': ['Artist'], 'Idol': ['Singer', 'Celebrity', 'Artist'],
  'Actor': ['Celebrity', 'Artist'], 'Model': ['Celebrity', 'Artist'], 'YouTuber': ['Celebrity'], 'Voice actor': ['Artist'],
  'Mangaka': ['Artist'], 'Writer': ['Artist'], 'Cosplayer': ['Artist'], 'Tailor': ['Artisan'],
  // Métiers, sport
  'Blacksmith': ['Artisan'], 'Florist': ['Artisan'], 'Cook': ['Artisan'], 'Odd jobs': ['Employee'], 'Volleyball player': ['Athlete'],
}

// La famille ajoutée après chaque valeur précise, sans doublon
export const withFamilies = (values: readonly string[]) => [...new Set([...values, ...values.flatMap(value => OCCUPATION_FAMILIES[value] ?? [])])]
