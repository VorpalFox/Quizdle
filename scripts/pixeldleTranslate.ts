// Tables de traduction du Pixeldle : les noms bruts de Wikidata (« être humain de fiction », « Nintendo Entertainment
// Analysis and Development », « jeu de plateforme en 3D ») ramenés à de courtes listes, pour que les indices se comparent.
// Chaque fonction renvoie la valeur traduite, null si ce n'est pas une valeur à garder (on la retire), undefined si on
// ne sait pas la traduire (gardée telle quelle et listée dans le récap : à ajouter ici).

const key = (value: string) => value.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim()

// Le 1er motif qui correspond. Les cas précis d'abord.
const firstRule = (rules: [RegExp, string | null][], value: string) => rules.find(([pattern]) => pattern.test(value))?.[1]

// --- Sexe ---

// « Aucun » pour un robot, un objet ou une entité, « Autre » quand le jeu le laisse inconnu exprès (Frisk) ou que le
// wiki dit « they », « Player's choice » pour un avatar personnalisable.

// Ce que wikidataGender (masculin, féminin...) ne reconnaît pas
const GENDERS: Record<string, string | null> = {
  'genre déterminé par le joueur': "Player's choice", 'femme trans': 'Female', 'homme trans': 'Male',
  'agenre': 'Other', 'intersexuation': 'Other', 'non-binaire': 'Other',
  'sexe non divulgué dans œuvre': null, 'sexe inconnu': null, 'sexe ou genre non divulgué': null,
  'intersex': 'Other', 'non-binary': 'Other', 'nonbinary': 'Other', 'ambiguous': 'Other', 'hermaphrodite': 'Other',
  // Sans sexe : robots, objets, entités
  'genderless': 'Genderless', 'asexual': 'Genderless', 'asexué': 'Genderless', 'sans genre': 'Genderless', 'n/a': 'Genderless', 'unknown': null, 'varies': "Player's choice", 'variable': "Player's choice",
  'yes': null,
}

// « Male (3) Female (4) », « Left 4 Dead, Male, Left 4 Dead 2, Male or Female » : plusieurs versions, on ne tranche pas
const BOTH_SEXES = /\bmale\b.*\bfemale\b|\bfemale\b.*\bmale\b/

export function translateGender(names: string[]): string | null | undefined {
  const gender = (name: string) => key(name) in GENDERS ? GENDERS[key(name)] : BOTH_SEXES.test(key(name)) ? null : undefined
  const found = names.map(gender).find(value => value !== undefined)
  return found === undefined && names.length > 0 ? undefined : found ?? null
}

// --- Espèce ---

// Champ multiple, jamais vide. « defaults » du manuel donne « Humain » aux franchises réalistes dont le wiki ne dit pas
// l'espèce, « edit » corrige les exceptions. « Inconnu » quand le jeu la cache exprès (Meta Knight, Paimon), « Player's choice »
// pour un avatar dont on choisit la race. Les D'ni de Myst le sont même hybrides (Gehn, Atrus).

// Après avoir retiré « de fiction », « anthropomorphe »... : le nom de l'espèce, en anglais ou en français
const SPECIES: Record<string, string | null> = {
  // Les libellés français de Wikidata qu'on gardait tels quels, en anglais
  'primarque': 'Primarch', 'voyageur': 'Traveller', 'griffon': 'Griffin', 'hylien': 'Hylian',
  // Humains, et ce qui n'est qu'une sorte d'humain
  'être humain': 'Human', 'humain': 'Human', 'terran': 'Human', 'homs': 'Human', 'spartan': 'Human', 'super soldat': 'Human',
  'sorcier ou sorcière': 'Human', 'magicien': 'Human', 'sang-pur': 'Human', 'animagus': 'Human', 'métamorphomage': 'Human',
  'siren': 'Human', 'psyker': 'Human', 'méta-humain': 'Metahuman', 'mutant': 'Mutant', 'clone': 'Clone', 'nords': 'Nord',
  'humanoïde': 'Humanoid', 'extraterrestre': 'Alien', 'extraterrestre humanoïde': 'Alien',
  // Machines
  'robot': 'Robot', 'robot master': 'Robot', 'sentient machine': 'Robot', 'androïde': 'Android', 'gynoïde': 'Android',
  'intelligence artificielle': 'Robot', 'omnic': 'Omnic', 'sentry': 'Robot',
  // Surnaturel
  'déité': 'Deity', 'daedric prince': 'Daedra', 'higher being': 'Higher Being', 'ange': 'Angel', 'démon': 'Demon',
  'demon': 'Demon', 'half-demon': 'Half-demon', 'yōkai': 'Yokai', 'satori': 'Yokai', 'kappa': 'Yokai', 'komainu': 'Yokai',
  'vampire': 'Vampire', 'comte vampire': 'Vampire', 'dhampir': 'Dhampir', 'fantôme': 'Ghost', 'revenant': 'Undead',
  'undead': 'Undead', 'homunculus': 'Homunculus', 'fée': 'Fairy', 'fairy': 'Fairy', 'dragon': 'Dragon', 'monstres': 'Monster',
  // Fantasy
  'elfe': 'Elf', 'high elf': 'Elf', 'blood elf': 'Elf', 'elfe de la nuit': 'Elf', 'drow': 'Elf', 'avariel': 'Elf',
  'demi-elfe': 'Half-elf', 'half-elf': 'Half-elf', 'elfe de maison': 'House-elf', 'orc': 'Orc', 'orsimer': 'Orc',
  'dwarf': 'Dwarf', 'goblin': 'Goblin', 'demi-géant': 'Half-giant', 'dragonborn': 'Dragonborn', 'tieffelin': 'Tiefling',
  'githyanki': 'Githyanki', 'witcher': 'Mutant human',
  // Les peuples d'une franchise : gardés, en français quand le jeu les traduit
  'mob minecraft': 'Mob', 'nobody': 'Nobody', 'heartless': 'Heartless', 'replica': 'Replica', 'lightners': 'Monster',
  'darkners': 'Monster', 'espèce léviathan': 'Leviathan', 'shangheili': 'Sangheili', 'turian': 'Turian', 'blade': 'Blade',
  'pale being': 'Pale Being', 'vessel': 'Vessel', 'weaver': 'Weaver', 'rabbid': 'Rabbid', 'salmonid': 'Salmonid',
  'kong': 'Monkey', 'vastaya': 'Vastaya', 'yordle': 'Yordle', 'metal head': 'Metal Head',
  // Animaux
  'animal': 'Animal', 'mammifère': 'Animal', 'monkey': 'Monkey', 'singe': 'Monkey', 'gorille': 'Monkey', 'chien': 'Dog',
  'dog': 'Dog', 'renard': 'Fox', 'fox': 'Fox', 'loup': 'Wolf', 'wolf': 'Wolf', 'hedgehog': 'Hedgehog', 'hérisson': 'Hedgehog',
  'echidna': 'Echidna', 'rabbit or hare': 'Rabbit', 'lapin/lièvre': 'Rabbit', 'chat': 'Cat', 'chat de fiction et autres félins': 'Cat',
  'tigre': 'Tiger', 'lion': 'Lion', 'panther': 'Panther', 'cheetah': 'Cheetah', 'ours': 'Bear', 'ours blanc': 'Bear',
  'polar bear': 'Bear', 'panda': 'Panda', 'giant panda': 'Panda', 'raton laveur': 'Raccoon', 'raccoon': 'Raccoon',
  'écureuil': 'Squirrel', 'squirrel': 'Squirrel', 'hamster': 'Hamster', 'rodent': 'Rodent', 'mole': 'Mole', 'skunk': 'Skunk',
  'camelid': 'Llama', 'cheval': 'Horse', 'cochon': 'Pig', 'rhinocéros': 'Rhinoceros', 'hippopotamus': 'Hippopotamus',
  'marsupial': 'Marsupial', 'bat': 'Bat', 'oiseau': 'Bird', 'parrot': 'Parrot', 'seagull': 'Seagull',
  'pélican': 'Pelican', 'hibou': 'Owl', 'grenouille ou crapaud': 'Frog', 'amphibian': 'Frog', 'reptile': 'Reptile',
  'lizard': 'Lizard', 'chameleon': 'Chameleon', 'crocodile or alligator': 'Crocodile', 'tortoise': 'Turtle', 'turtle': 'Turtle',
  'dinosaure': 'Dinosaur', 'poisson': 'Fish', 'shark': 'Shark', 'octopus': 'Octopus', 'jellyfish': 'Jellyfish',
  'sea urchin': 'Sea urchin', 'crabe': 'Crab', 'insecte': 'Insect', 'insect': 'Insect', 'araignée': 'Spider',
  'plante': 'Plant', 'plant species': 'Plant', 'flower': 'Plant', 'arbre': 'Plant', 'virus': 'Virus', 'parasite': 'Parasite',
  'objet': 'Object', 'manchot': 'Penguin', 'zooplankton': 'Plankton',
  // En anglais, depuis les infobox des wikis
  'human': 'Human', 'humans': 'Human', 'human being': 'Human', 'humanoid': 'Humanoid', 'hume': 'Human', 'homo sapiens': 'Human',
  'android': 'Android', 'cyborg': 'Cyborg', 'machine': 'Robot', 'automaton': 'Robot', 'artificial intelligence': 'Robot', 'ai': 'Robot',
  'alien': 'Alien', 'extraterrestrial': 'Alien', 'god': 'Deity', 'goddess': 'Deity', 'deity': 'Deity',
  'demigod': 'Demigod', 'titan': 'Titan', 'angel': 'Angel', 'devil': 'Demon', 'elf': 'Elf', 'elves': 'Elf', 'half-elf': 'Half-elf',
  'dwarves': 'Dwarf', 'orcs': 'Orc', 'troll': 'Troll', 'gnome': 'Gnome', 'giant': 'Giant', 'ogre': 'Ogre', 'tiefling': 'Tiefling',
  'ghost': 'Ghost', 'spirit': 'Spirit', 'zombie': 'Zombie', 'skeleton': 'Skeleton', 'mummy': 'Mummy', 'werewolf': 'Werewolf',
  'witch': 'Human', 'wizard': 'Human', 'muggle': 'Human', 'monster': 'Monster', 'creature': null, 'beast': 'Beast',
  'cat': 'Cat', 'feline': 'Cat', 'canine': 'Dog', 'bird': 'Bird', 'bear': 'Bear', 'rabbit': 'Rabbit', 'mouse': 'Mouse',
  'rat': 'Rat', 'pig': 'Pig', 'frog': 'Frog', 'toad': 'Frog', 'snake': 'Snake', 'spider': 'Spider', 'fish': 'Fish',
  'turtles': 'Turtle', 'koopa troopa': 'Koopa', 'ape': 'Monkey', 'gorilla': 'Monkey', 'chimpanzee': 'Monkey', 'horse': 'Horse',
  'penguin': 'Penguin', 'owl': 'Owl', 'duck': 'Duck', 'chicken': 'Chicken', 'cow': 'Cow', 'goat': 'Goat', 'sheep': 'Sheep',
  'deer': 'Deer', 'lizardfolk': 'Lizard', 'plant': 'Plant', 'mushroom': 'Mushroom', 'slime': 'Slime', 'golem': 'Golem',
  'clone': 'Clone', 'mutant': 'Mutant', 'vampire': 'Vampire', 'dragon': 'Dragon', 'fairy': 'Fairy', 'ghoul': 'Ghoul', 'undead': 'Undead',
  'dinosaur': 'Dinosaur', 'dinosaurs': 'Dinosaur', 'hylian': 'Hylian', 'hylians': 'Hylian', 'demi-god': 'Demigod', 'demigoddess': 'Demigod',
  'half-human': 'Demi-human', 'demi-human': 'Demi-human', 'faun': 'Faun', 'minotaur': 'Minotaur', 'kangaroo': 'Kangaroo',
  'maine coon cat': 'Cat', 'horseshoe crab': 'Horseshoe crab', 'sea anemone': 'Sea anemone', 'necromancer': 'Human', 'fev mutant': 'Mutant',
  'super mutant': 'Mutant', 'posthuman cybernetic fev mutant': 'Mutant', 'living jar': 'Object', 'weapon': 'Object',
  'edenian': 'Edenian', 'saurian': 'Saurian', 'potoroo': 'Marsupial', 'bandicoot': 'Bandicoot',
  'cryomancer': 'Human', 'pyromancer': 'Human', 'human (formerly)': 'Human', 'synth': 'Synthetic', 'replicant': 'Replicant',
  'robotic': 'Robot', 'mech': 'Robot', 'cat-like': 'Cat', 'dog-like': 'Dog', 'squid': 'Squid', 'kitsune': 'Yokai', 'oni': 'Yokai',
  'tengu': 'Yokai', 'youkai': 'Yokai', 'yokai': 'Yokai', 'magician': 'Human', 'shapeshifter': 'Shapeshifter', 'chimera': 'Chimera',
  'mermaid': 'Mermaid', 'merfolk': 'Mermaid', 'lich': 'Lich', 'wraith': 'Spectre', 'specter': 'Spectre', 'spectre': 'Spectre',
  'doll': 'Doll', 'puppet': 'Doll', 'animatronic': 'Animatronic', 'scarecrow': 'Scarecrow', 'snowman': 'Snowman',
  // Pas des espèces : on passe à la classe suivante
  'deutéragoniste': null, 'mascotte': null, 'roi': null, 'idole virtuelle': null, 'transgender person': null, 'persona': null,
  'organisme': null, 'créature surnaturelle': null, 'ennemis récurrents de the legend of zelda': null,
  'mk. ii mobile robotic versatile entity automated assistant': 'Robot', 'unique organic supercomputer': 'Robot',
  // Valeurs des wikis gardées brutes (majuscule), traduites au cas par cas
  'honey bear': 'Bear', 'fallen angel': 'Fallen angel', 'supernatural being': 'Deity', 'human-faerie': 'Half-fairy',
  'artificial human': 'Homunculus', 'demonic sword spirit': 'Demon', 'primordial serpent': 'Primordial Serpent',
  'human mutant': 'Mutant human', 'sentient crt monitor': 'Object', 'mechanical flower ai': 'Robot flower', 'shaman': 'Humanoid',
  'celestial brush god': 'Brush god', 'dragonian': 'Dragon', 'moon tribe': 'Moon Tribe', 'elder god': 'Deity',
  'hybrid': 'Hybrid', 'hyena': 'Hyena', 'basilisk': 'Basilisk', 'operator': 'Robot', 'headcrab': 'Alien',
  'locust drone': 'Locust', 'locust kantus': 'Locust', 'healslime': 'Slime', 'leftherian': 'Human', 'memetic entity': 'Entity',
  'eldritch artifact': 'Object',
  'voidborn': 'Voidborn', 'aspect host': 'Human', 'eternal': 'Eternal', 'halfling': 'Halfling', 'otherworldly': 'Alien',
  'nomaï': 'Nomai',
  'unknown': null, 'dinosaur unknown': 'Dinosaur', 'red xiii\'s species': null, 'various': null, '1': null,
}

// « hérisson de fiction », « anthropomorphic hedgehog », « fée dans une œuvre de fiction », « humain de Donjons et Dragons »
const SPECIES_QUALIFIERS = /\s*\b(?:de fiction|fictif|fictive|fictionnelle?|dans une œuvre de fiction|in a work of fiction|dans l'univers de harry potter|dans la littérature fantasy et le jeu de rôle|de donjons et dragons)$|^fictional\s+|^anthropomorphi(?:c|que)\s+|\s+anthropomorphiques?$|\s+anthropomorphes?$/g

// Champ multiple : une espèce composée vaut ses deux parts (Talos, humain devenu dieu), une IA est un robot
const SPECIES_PARTS: Record<string, string[]> = {
  'AI': ['Robot'], 'Half-elf': ['Human', 'Elf'], 'Half-demon': ['Human', 'Demon'], 'Half-giant': ['Human', 'Giant'],
  'Demigod': ['Human', 'Deity'], 'Half-fairy': ['Human', 'Fairy'], 'Fallen angel': ['Angel', 'Demon'], 'Mutant human': ['Human', 'Mutant'],
  'Robot flower': ['Robot', 'Plant'], 'Brush god': ['Deity', 'Wolf'], 'Daedra': ['Daedra', 'Deity'],
  'Hybrid': ['Human', 'Alien'], 'Forgotling': ['Object', 'Forgotling'],
}

// Les animaux gardent leur espèce, plus « Animal » : un renard et un singe se rejoignent
const ANIMALS = new Set(['Monkey', 'Dog', 'Frog', 'Cat', 'Hedgehog', 'Insect', 'Fox', 'Rabbit', 'Bear', 'Wolf', 'Bird',
  'Raccoon', 'Turtle', 'Fish', 'Tiger', 'Bat', 'Horse', 'Echidna', 'Walrus', 'Pig', 'Owl', 'Mole', 'Llama',
  'Octopus', 'Marsupial', 'Panda', 'Lizard', 'Lion', 'Deer', 'Rodent', 'Rhinoceros', 'Squirrel', 'Penguin', 'Hamster', 'Panther',
  'Chameleon', 'Seagull', 'Skunk', 'Sea anemone', 'Horseshoe crab', 'Crab', 'Jellyfish', 'Sea urchin', 'Kangaroo', 'Bandicoot', 'Cheetah',
  'Pelican', 'Hippopotamus', 'Spider', 'Crocodile', 'Parrot', 'Shark', 'Plankton', 'Chicken', 'Hare', 'Dormouse', 'Hyena', 'Snake',
  'Lynx', 'Dinosaur', 'Mouse', 'Rat', 'Duck', 'Cow', 'Goat', 'Sheep', 'Squid', 'Reptile', 'Lizard Doggo'])

// L'espèce finale d'un personnage : une valeur ou une liste, dépliée (parts, « Animal »), sans doublon
export function expandSpecies(value: unknown): string[] | null {
  const list = (Array.isArray(value) ? value : value ? [value] : []).map(String)
  if (list.length === 0)
    return null
  const parts = list.flatMap(name => SPECIES_PARTS[name] ?? [name])
  return [...new Set(parts.some(name => ANIMALS.has(name)) ? [...parts, 'Animal'] : parts)]
}

// --- Cheveux ---

// L'infobox, sinon le texte de la page entière (textHair : la section Appearance d'abord, « long blonde hair »), à relire
// dans le récap. Un humain sans couleur trouvée reste vide : il a des cheveux, on ne sait juste pas leur couleur.

// Pas de cheveux à décrire : « N/A » plutôt qu'une case vide (« Bald », c'est pour les humains vraiment chauves)
export const NO_HAIR = 'N/A' // = NOT_APPLICABLE du moteur
const HAIRLESS_SPECIES = new Set(['Robot', 'Animal', 'Monster', 'Mob', 'Insect', 'Plant', 'Object', 'Leviathan', 'Dragon', 'Fish',
  'Zerg', 'Slime', 'Golem', 'Skeleton', 'Koopa', 'Kremling', 'Yoshi', 'Waddle Dee', 'Dark Matter', 'Metroid', 'Parasite', 'Flood',
  'Salmonid', 'Omnic', 'Pod', 'Coal', 'Toad'])

// Les cheveux finaux : ceux trouvés, sinon N/A pour un robot, un animal, une créature (pas s'il est aussi humain)
export function hairOrNone(hair: unknown, species: unknown): unknown {
  if (Array.isArray(hair) ? hair.length > 0 : hair)
    return hair
  const list = Array.isArray(species) ? species.map(String) : []
  return list.some(name => HAIRLESS_SPECIES.has(name)) && !list.includes('Human') ? [NO_HAIR] : null
}

// --- Armes ---

// L'arme du personnage (champ « weapon » des infobox) dit aussi comment il se bat : toutes les règles qui collent comptent
// (une gunblade : Épéiste et Tireur). Les modèles d'armes à feu des jeux de tir (AK-47, MP5, M1911…) sont des fusils.
const WEAPON_RULES: [RegExp, string][] = [
  [/sniper|\bintervention\b|\br700\b|\bm21\b|m14 ebr|\brsass\b|\bosipr\b|longshot/, 'Sniper'],
  [/swords?\b|blades?\b|katana|rapier|\bsab(?:re|er)s?\b|cutlass|scimitar|claymore|zweih[äa]nder/, 'Swordsman'],
  [/\bguns?\b|gunblade|pistol|revolver|rifle|shotgun|handgun|firearm|blaster|\bsmg\b|machine ?gun|minigun|chain ?gun|musket|carbine|repeater|magnum|\bak-?\d+|\bmp\d+k?\b|\bm\d{1,4}\b|\bp\d{2,3}\b|\bg\d{2}c?\b|\busp\b|glock|\buzi\b|desert eagle|\bspas|\bscar\b|\bacr\b|\bump\d*\b|enforcers?|\blancer\b|gnasher|hammerburst|boltok|mega buster|arm cannon/, 'Marksman'],
  [/\bbows?\b|longbow|crossbow|\barrows?\b/, 'Archer'],
  [/\bfists?\b|gauntlets?|knuckles\b|martial arts|bare hands/, 'Fighter'],
  [/\bstaff\b|\bstaves\b|\bwands?\b|\bspells?\b|\btome\b|grimoire|\bcatalyst\b|\bmagic\b/, 'Mage'],
  [/\bspears?\b|\blances?\b|halberd|trident|polearm|naginata|glaive|\bpikes?\b/, 'Lancer'],
  [/kunai|shuriken/, 'Ninja'],
  [/microphone/, 'Musician'],
  [/scalpel/, 'Doctor'],
]

export function weaponOccupations(value: string): string[] {
  const text = key(value)
  const found = WEAPON_RULES.filter(([pattern]) => pattern.test(text)).map(([, occupation]) => occupation)
  // Un sniper est déjà un tireur
  return found.includes('Sniper') ? found.filter(name => name !== 'Marksman') : found
}

// L'occupation finale : vide si on ne l'a pas trouvée (None ou Unknown seulement si le wiki le dit, voir pixeldleEnrich.ts).
// Un avatar dont on choisit la race choisit aussi sa classe.
export function occupationOrChoice(occupation: string[] | null, species: unknown): string[] | null {
  if (occupation && occupation.length > 0)
    return occupation
  const list = Array.isArray(species) ? species.map(String) : []
  return list.includes("Player's choice") ? ["Player's choice"] : null
}

export function translateSpecies(label: string): string | null | undefined {
  // « •Human » : sans la puce
  let name = key(label).replace(/^[\s・*•·-]+/, '')
  for (let previous = ''; previous !== name;) {
    previous = name
    name = name.replace(SPECIES_QUALIFIERS, '').trim()
  }
  if (name in SPECIES)
    return SPECIES[name]
  // Les peuples d'une franchise déjà bien écrits (Koopa, Zerg, Asari) : gardés tels quels
  return /^\p{Lu}/u.test(label) ? label : undefined
}

// --- Nationalité ---

// Champ multiple (validé avec FX) : un max de lieux, de la ville au monde (« Pallet Town, Kanto », « Boston,
// Massachusetts, United States »), 4 au plus, et TOUT EN ANGLAIS comme la majorité des wikis, pour que les
// personnages se croisent. Sources : Wikidata (pays, lieu de naissance, résidence), puis les champs « pays » et « lieu »
// du 1er wiki, le lieu d'une date de naissance, et en dernier recours le lieu où on croise le personnage (« location »).
// « defaults » et « edit » du manuel ajoutent des lieux qui se croisent entre franchises (Japan, Earth, Hell,
// Olympus…). Les franchises 100 % fictives restent vides exprès : un lieu par défaut y répéterait l'indice Franchise.

// Les pays historiques ramenés au pays d'aujourd'hui, et les noms anglais des pays de fiction
const NATIONALITIES: Record<string, string> = {
  'république populaire de chine': 'China', 'empire russe': 'Russia', 'union soviétique': 'Soviet Union', 'royaume de grande-bretagne': 'United Kingdom',
  'empire britannique': 'United Kingdom', "royaume d'angleterre": 'United Kingdom', 'royaume de france': 'France', 'nouvelle-france': 'France',
  'royaume de hongrie': 'Hungary', 'principauté de valachie': 'Romania', 'principauté de transylvanie': 'Romania',
  'royaume ptolémaïque': 'Egypt', 'empire achéménide': 'Persia', 'sparte': 'Greece', 'république florentine': 'Italy',
  'royaume de norvège (872-1397)': 'Norway', 'troisième reich': 'Germany', 'lombax kingdom': 'Lombax Kingdom',
  'metro kingdom': 'Metro Kingdom', 'mushroom kingdom': 'Mushroom Kingdom', 'écosse': 'United Kingdom', 'pays de galles': 'United Kingdom',
  'angleterre': 'United Kingdom', 'irlande du nord': 'United Kingdom', 'royaume-uni de grande-bretagne et d\'irlande': 'United Kingdom',
  // En anglais, depuis les infobox des wikis : le pays ou l'adjectif
  'united states': 'United States', 'united states of america': 'United States', 'usa': 'United States', 'us': 'United States', 'america': 'United States',
  'american': 'United States', 'japan': 'Japan', 'japanese': 'Japan', 'united kingdom': 'United Kingdom', 'uk': 'United Kingdom', 'england': 'United Kingdom',
  'english': 'United Kingdom', 'british': 'United Kingdom', 'great britain': 'United Kingdom', 'britain': 'United Kingdom', 'scotland': 'United Kingdom',
  'scottish': 'United Kingdom', 'wales': 'United Kingdom', 'welsh': 'United Kingdom', 'french': 'France', 'germany': 'Germany', 'german': 'Germany',
  'russia': 'Russia', 'russian': 'Russia', 'soviet union': 'Soviet Union', 'ussr': 'Soviet Union', 'china': 'China', 'chinese': 'China', 'italy': 'Italy',
  'italian': 'Italy', 'spain': 'Spain', 'spanish': 'Spain', 'mexico': 'Mexico', 'mexican': 'Mexico', 'brazil': 'Brazil',
  'brazilian': 'Brazil', 'canadian': 'Canada', 'australia': 'Australia', 'australian': 'Australia', 'south korea': 'South Korea',
  'korea': 'South Korea', 'korean': 'South Korea', 'south korean': 'South Korea', 'india': 'India', 'indian': 'India', 'ireland': 'Ireland',
  'irish': 'Ireland', 'sweden': 'Sweden', 'swedish': 'Sweden', 'norway': 'Norway', 'norwegian': 'Norway', 'egypt': 'Egypt', 'egyptian': 'Egypt',
  'greece': 'Greece', 'greek': 'Greece', 'poland': 'Poland', 'polish': 'Poland', 'netherlands': 'Netherlands', 'dutch': 'Netherlands',
  'thailand': 'Thailand', 'thai': 'Thailand', 'turkey': 'Turkey', 'turkish': 'Turkey', 'argentina': 'Argentina', 'cuba': 'Cuba',
  'cuban': 'Cuba', 'nigeria': 'Nigeria', 'kenya': 'Kenya', 'south africa': 'South Africa', 'israel': 'Israel', 'iran': 'Iran',
  'iraq': 'Iraq', 'afghanistan': 'Afghanistan', 'pakistan': 'Pakistan', 'vietnam': 'Vietnam', 'philippines': 'Philippines',
  'czech republic': 'Czech Republic', 'bohemia': 'Czech Republic', 'hungary': 'Hungary', 'romania': 'Romania', 'switzerland': 'Switzerland',
  'austria': 'Austria', 'portugal': 'Portugal', 'finland': 'Finland', 'denmark': 'Denmark', 'belgium': 'Belgium', 'colombia': 'Colombia',
  'peru': 'Peru', 'chile': 'Chile', 'jamaica': 'Jamaica', 'mongolia': 'Mongolia', 'saudi arabia': 'Saudi Arabia',
  'swiss': 'Switzerland', 'austrian': 'Austria', 'portuguese': 'Portugal', 'finnish': 'Finland', 'appears finnish': 'Finland',
  'danish': 'Denmark', 'belgian': 'Belgium', 'colombian': 'Colombia', 'peruvian': 'Peru', 'chilean': 'Chile',
  'jamaican': 'Jamaica', 'mongolian': 'Mongolia', 'saudi': 'Saudi Arabia', 'nigerian': 'Nigeria', 'kenyan': 'Kenya',
  'south african': 'South Africa', 'israeli': 'Israel', 'iranian': 'Iran', 'persian': 'Persia', 'persia': 'Persia',
  'iraqi': 'Iraq', 'afghan': 'Afghanistan', 'pakistani': 'Pakistan', 'vietnamese': 'Vietnam', 'filipino': 'Philippines',
  'czech': 'Czech Republic', 'bohemian': 'Czech Republic', 'hungarian': 'Hungary', 'romanian': 'Romania', 'transylvania': 'Romania',
  'serbia': 'Serbia', 'serbian': 'Serbia', 'croatia': 'Croatia', 'croatian': 'Croatia', 'ukraine': 'Ukraine', 'ukrainian': 'Ukraine',
  'soviet': 'Soviet Union', 'argentinian': 'Argentina', 'argentine': 'Argentina', 'venezuela': 'Venezuela', 'venezuelan': 'Venezuela',
  'haiti': 'Haiti', 'haitian': 'Haiti', 'dominican republic': 'Dominican Republic', 'dominican': 'Dominican Republic',
  'ghana': 'Ghana', 'ghanaian': 'Ghana', 'monaco': 'Monaco', 'monegasque': 'Monaco', 'new zealand': 'New Zealand',
  'new zealander': 'New Zealand', 'canada': 'Canada', 'france': 'France', 'scottish highlands': 'United Kingdom',
  'medieval germany': 'Germany', 'russian-american': 'Russia', 'icelandic': 'Iceland', 'iceland': 'Iceland',
  'singapore': 'Singapore', 'indonesia': 'Indonesia', 'indonesian': 'Indonesia', 'malaysia': 'Malaysia', 'taiwan': 'Taiwan',
  'taiwanese': 'Taiwan', 'hong kong': 'China', 'mexican-american': 'United States', 'japanese-american': 'United States',
  'african-american': 'United States', 'native american': 'United States', 'lebanese': 'Lebanon', 'syrian': 'Syria', 'turkish cypriot': 'Turkey',
  'norse': 'Norway', 'spartan': 'Greece', 'roman': 'Italy', 'ancient egypt': 'Egypt', 'ancient greece': 'Greece',
  // Les planètes de notre système, en français
  'earth': 'Earth', 'earthling': 'Earth', 'terran': 'Earth', 'mars': 'Mars', 'martian': 'Mars', 'luna': 'Moon', 'moon': 'Moon',
  'the moon': 'Moon',
}

// Les villes, régions et états réels, ramenés à leur pays. Les lieux de fiction (Night City, Hyrule) n'y sont pas :
// ils sont gardés tels quels.
const CITIES: Record<string, string> = {
  // États-Unis
  'new york': 'United States', 'new york city': 'United States', 'nyc': 'United States', 'manhattan': 'United States', 'brooklyn': 'United States',
  'the bronx': 'United States', 'bronx': 'United States', 'queens': 'United States', 'harlem': 'United States', 'los angeles': 'United States',
  'san francisco': 'United States', 'san diego': 'United States', 'chicago': 'United States', 'boston': 'United States', 'seattle': 'United States',
  'miami': 'United States', 'detroit': 'United States', 'las vegas': 'United States', 'new orleans': 'United States', 'houston': 'United States',
  'dallas': 'United States', 'austin': 'United States', 'atlanta': 'United States', 'philadelphia': 'United States', 'washington': 'United States',
  'washington, d.c.': 'United States', 'washington d.c.': 'United States', 'denver': 'United States', 'phoenix': 'United States',
  'portland': 'United States', 'baltimore': 'United States', 'pittsburgh': 'United States', 'cleveland': 'United States', 'memphis': 'United States',
  'nashville': 'United States', 'honolulu': 'United States', 'anchorage': 'United States', 'salt lake city': 'United States', 'hollywood': 'United States',
  'jackson': 'United States', 'kansas city': 'United States', 'st. louis': 'United States', 'minneapolis': 'United States', 'milwaukee': 'United States',
  'california': 'United States', 'texas': 'United States', 'florida': 'United States', 'alaska': 'United States', 'hawaii': 'United States',
  'nevada': 'United States', 'arizona': 'United States', 'colorado': 'United States', 'oregon': 'United States', 'montana': 'United States',
  'wyoming': 'United States', 'utah': 'United States', 'new mexico': 'United States', 'oklahoma': 'United States', 'kansas': 'United States',
  'nebraska': 'United States', 'iowa': 'United States', 'missouri': 'United States', 'illinois': 'United States', 'ohio': 'United States',
  'michigan': 'United States', 'wisconsin': 'United States', 'minnesota': 'United States', 'georgia': 'United States', 'louisiana': 'United States',
  'mississippi': 'United States', 'alabama': 'United States', 'tennessee': 'United States', 'kentucky': 'United States', 'virginia': 'United States',
  'west virginia': 'United States', 'pennsylvania': 'United States', 'new jersey': 'United States', 'massachusetts': 'United States',
  'maine': 'United States', 'vermont': 'United States', 'connecticut': 'United States', 'maryland': 'United States', 'carolina': 'United States',
  'north carolina': 'United States', 'south carolina': 'United States', 'indiana': 'United States', 'idaho': 'United States',
  'appalachia': 'United States', 'mojave desert': 'United States', 'mojave wasteland': 'United States', 'capital wasteland': 'United States',
  'commonwealth': 'United States', 'new vegas': 'United States', 'midwest': 'United States', 'bee cave': 'United States', 'college station': 'United States',
  'cheyenne': 'United States', 'topeka': 'United States', 'savannah': 'United States', 'wa': 'United States',
  // Royaume-Uni, Irlande
  'london': 'United Kingdom', 'manchester': 'United Kingdom', 'liverpool': 'United Kingdom', 'birmingham': 'United Kingdom', 'oxford': 'United Kingdom',
  'cambridge': 'United Kingdom', 'bristol': 'United Kingdom', 'leeds': 'United Kingdom', 'sheffield': 'United Kingdom', 'edinburgh': 'United Kingdom',
  'glasgow': 'United Kingdom', 'cardiff': 'United Kingdom', 'belfast': 'United Kingdom', 'yorkshire': 'United Kingdom', 'cornwall': 'United Kingdom',
  'kent': 'United Kingdom', 'surrey': 'United Kingdom', 'devon': 'United Kingdom', 'whitechapel': 'United Kingdom', 'hogsmeade': 'United Kingdom',
  'godric\'s hollow': 'United Kingdom', 'little whinging': 'United Kingdom', 'dublin': 'Ireland',
  // Europe
  'paris': 'France', 'marseille': 'France', 'lyon': 'France', 'bordeaux': 'France', 'normandy': 'France', 'brittany': 'France',
  'berlin': 'Germany', 'munich': 'Germany', 'hamburg': 'Germany', 'hanover': 'Germany', 'frankfurt': 'Germany',
  'cologne': 'Germany', 'bavaria': 'Germany', 'rome': 'Italy', 'milan': 'Italy', 'venice': 'Italy', 'florence': 'Italy',
  'naples': 'Italy', 'sicily': 'Italy', 'tuscany': 'Italy', 'madrid': 'Spain', 'barcelona': 'Spain', 'seville': 'Spain',
  'lisbon': 'Portugal', 'amsterdam': 'Netherlands', 'brussels': 'Belgium', 'vienna': 'Austria', 'zurich': 'Switzerland', 'geneva': 'Switzerland',
  'prague': 'Czech Republic', 'kutná hora': 'Czech Republic', 'skalitz': 'Czech Republic', 'rattay': 'Czech Republic', 'suchdol': 'Czech Republic',
  'budapest': 'Hungary', 'warsaw': 'Poland', 'krakow': 'Poland', 'bucharest': 'Romania', 'athens': 'Greece', 'sparta': 'Greece',
  'stockholm': 'Sweden', 'oslo': 'Norway', 'copenhagen': 'Denmark', 'helsinki': 'Finland', 'reykjavik': 'Iceland',
  'moscow': 'Russia', 'saint petersburg': 'Russia', 'st. petersburg': 'Russia', 'siberia': 'Russia', 'kyiv': 'Ukraine', 'kiev': 'Ukraine',
  'chernobyl': 'Ukraine', 'pripyat': 'Ukraine', 'sumy oblast': 'Ukraine', 'yabluchne': 'Ukraine',
  'dzhugdzhur': 'Russia', 'east siberian mountains': 'Russia', 'ullapool': 'United Kingdom', 'belgrade': 'Serbia', 'istanbul': 'Turkey', 'constantinople': 'Turkey',
  // Asie
  'tokyo': 'Japan', 'shibuya': 'Japan', 'shinjuku': 'Japan', 'kamurocho': 'Japan', 'kamurochō': 'Japan', 'sotenbori': 'Japan',
  'kyoto': 'Japan', 'osaka': 'Japan', 'yokohama': 'Japan', 'kobe': 'Japan', 'nagoya': 'Japan', 'hiroshima': 'Japan',
  'okinawa': 'Japan', 'hokkaido': 'Japan', 'sapporo': 'Japan', 'fukuoka': 'Japan', 'kanagawa': 'Japan', 'kanagawa prefecture': 'Japan', 'inaba': 'Japan',
  'edo': 'Japan', 'tsushima': 'Japan', 'beijing': 'China', 'peking': 'China', 'shanghai': 'China', 'macau': 'China',
  'seoul': 'South Korea', 'busan': 'South Korea', 'bangkok': 'Thailand', 'lampang': 'Thailand', 'mumbai': 'India',
  'delhi': 'India', 'new delhi': 'India', 'calcutta': 'India', 'kolkata': 'India', 'manila': 'Philippines', 'masbate': 'Philippines', 'hanoi': 'Vietnam',
  'saigon': 'Vietnam', 'singapore': 'Singapore', 'jakarta': 'Indonesia', 'tehran': 'Iran', 'baghdad': 'Iraq', 'kabul': 'Afghanistan',
  'jerusalem': 'Israel', 'tel aviv': 'Israel', 'dubai': 'United Arab Emirates', 'riyadh': 'Saudi Arabia', 'ulaanbaatar': 'Mongolia',
  // Amériques, Afrique, Océanie
  'toronto': 'Canada', 'montreal': 'Canada', 'montréal': 'Canada', 'vancouver': 'Canada', 'quebec': 'Canada', 'québec': 'Canada',
  'ontario': 'Canada', 'mexico city': 'Mexico', 'havana': 'Cuba', 'santo domingo': 'Dominican Republic', 'kingston': 'Jamaica',
  'rio de janeiro': 'Brazil', 'são paulo': 'Brazil', 'sao paulo': 'Brazil', 'buenos aires': 'Argentina', 'bogotá': 'Colombia',
  'bogota': 'Colombia', 'lima': 'Peru', 'caracas': 'Venezuela', 'cairo': 'Egypt', 'alexandria': 'Egypt', 'lagos': 'Nigeria',
  'nairobi': 'Kenya', 'johannesburg': 'South Africa', 'cape town': 'South Africa', 'accra': 'Ghana', 'sydney': 'Australia',
  'melbourne': 'Australia', 'brisbane': 'Australia', 'perth': 'Australia', 'auckland': 'New Zealand',
}

// Le pays d'un lieu réel (« United States », « London », « Japanese »), null si on ne le connaît pas
export function placeCountry(label: string): string | null {
  const name = key(label).replace(/^the\s+/, '')
  return NATIONALITIES[key(label)] ?? NATIONALITIES[name] ?? CITIES[key(label)] ?? CITIES[name] ?? null
}

export function translateNationality(label: string): string {
  const value = NATIONALITIES[key(label)] ?? label
  return value[0]!.toUpperCase() + value.slice(1)
}

// Les libellés français de Wikidata (les pays, et les lieux de fiction qu'il traduit) : tous les lieux sont en anglais,
// comme ceux des wikis, pour que les personnages se croisent
const FRENCH_PLACES: Record<string, string> = {
  'afrique du sud': 'South Africa', 'allemagne': 'Germany', 'arabie saoudite': 'Saudi Arabia', 'argentine': 'Argentina',
  'australie': 'Australia', 'autriche': 'Austria', 'belgique': 'Belgium', 'biélorussie': 'Belarus', 'brésil': 'Brazil',
  'chili': 'Chile', 'chine': 'China', 'colombie': 'Colombia', 'corée du sud': 'South Korea', 'croatie': 'Croatia',
  'danemark': 'Denmark', 'empire byzantin': 'Byzantine Empire', 'espagne': 'Spain', 'finlande': 'Finland', 'grèce': 'Greece',
  'groenland': 'Greenland', 'haïti': 'Haiti', 'hongrie': 'Hungary', 'inde': 'India', 'indonésie': 'Indonesia', 'irak': 'Iraq',
  'irlande': 'Ireland', 'islande': 'Iceland', 'israël': 'Israel', 'italie': 'Italy', 'jamaïque': 'Jamaica', 'japon': 'Japan',
  'liban': 'Lebanon', 'lune': 'Moon', 'malaisie': 'Malaysia', 'mexique': 'Mexico', 'mongolie': 'Mongolia', 'norvège': 'Norway',
  'nouvelle-zélande': 'New Zealand', 'pays-bas': 'Netherlands', 'perse': 'Persia', 'pologne': 'Poland', 'polynésie': 'Polynesia',
  'pérou': 'Peru', 'roumanie': 'Romania', 'royaume champignon': 'Mushroom Kingdom', 'royaume métro': 'Metro Kingdom',
  'royaume lombax': 'Lombax Kingdom', 'royaume-uni': 'United Kingdom', 'russie': 'Russia',
  'république dominicaine': 'Dominican Republic', 'serbie': 'Serbia', 'singapour': 'Singapore', 'suisse': 'Switzerland',
  'suède': 'Sweden', 'syrie': 'Syria', 'taïwan': 'Taiwan', 'tchéquie': 'Czech Republic', 'terre': 'Earth',
  'thaïlande': 'Thailand', 'turquie': 'Turkey', 'urss': 'Soviet Union', 'viêt nam': 'Vietnam', 'yougoslavie': 'Yugoslavia',
  'égypte': 'Egypt', 'émirats arabes unis': 'United Arab Emirates', 'états-unis': 'United States',
  // Lieux de fiction
  'témérie': 'Temeria', 'rédanie': 'Redania', 'l\'outremonde': 'Underground', 'cité 17': 'City 17', 'néthéril': 'Netheril',
  'rashéménie': 'Rashemen',
}

// Les pays d'histoire et les écritures des infobox qui manquent à NATIONALITIES
const HISTORIC_COUNTRIES: Record<string, string> = {
  'russian empire': 'Russia', 'people\'s republic of china': 'China', 'ming empire': 'China', 'ukrainian soviet socialist republic': 'Ukraine',
  'belorussian ssr': 'Belarus', 'soviet russian': 'Soviet Union', 'royaume des pays-bas': 'Netherlands', 'liberia': 'Liberia', 'liberian': 'Liberia',
  'république fédérative socialiste de yougoslavie': 'Yugoslavia', 'byzantine': 'Byzantine Empire',
  'u.s': 'United States', 'u.s.a': 'United States', 'englander': 'United Kingdom', 'greenlander': 'Greenland', 'prussian': 'Germany', 'imperial german': 'Germany',
  'rhenish': 'Germany', 'british south african': 'South Africa', 'minoan': 'Greece', 'bc': 'Canada', 'polynesian': 'Polynesia',
}

// Les écritures d'une même ville réelle, ramenées à une seule pour que les personnages se croisent
const CITY_NAMES: Record<string, string> = {
  'nyc': 'New York', 'wa': 'Washington', 'new york city': 'New York', 'washington, d.c.': 'Washington', 'washington d.c.': 'Washington',
  'kamurochō': 'Kamurocho', 'peking': 'Beijing', 'kiev': 'Kyiv', 'st. petersburg': 'Saint Petersburg', 'montréal': 'Montreal',
  'québec': 'Quebec', 'são paulo': 'Sao Paulo', 'bogotá': 'Bogota', 'the bronx': 'Bronx',
}

// Les autres écritures d'un lieu de fiction (gentilé, nom long) ramenées à une seule, pour croiser avec les personnages
// qui donnent le lieu
const PLACE_NAMES: Record<string, string> = {
  'mount olympus': 'Olympus', 'k. rool\'s mobile island fortress': 'Mobile Island Fortress', 'castle of talmberg': 'Talmberg',
  'mare erythraeum': 'Mars', 'west country england': 'West Country', 'inkopolis square & octo canyon': 'Inkopolis Square',
  'eternal holy city okhema': 'Okhema', 'hanged man': 'The Hanged Man', 'galleria': 'Inkopolis Galleria', 'pagos': 'Págos',
  // Les gentilés
  'deponian': 'Deponia', 'elysian': 'Elysium', 'adrestian': 'Adrestian Empire', 'plegian': 'Plegia', 'columbian': 'Columbia',
  'vigoorian': 'Holy Vigoor Empire', 'numbanian': 'Numbani', 'rook islander': 'Rook Islands',
}

// Ce que les wikis rangent dans les champs « pays » ou « lieu » sans que ce soit un lieu : entreprises, jeux, groupes
const NOT_PLACES = new Set([
  'cyberlife', 'dr1', 'dr2', 'the world ends with you', 'celts', 'inc.', 'inc', 'possibly', 'ordinary', 'future', 'd.c',
  // Des jeux, des époques et des bouts de phrase pris pour des lieux par les champs « location »
  'mega man', 'mega man powered up', 'metroid', 'kraid', 'wasteland 2', 'wasteland 3', 'room_mysteryman', 'middle ages', 'mobile',
  'beyond time', 'canada–united states border',
])
// Pas un lieu : un âge, une mythologie, un endroit sans nom (« His keep », « Any place related to the Kremling Krew »),
// une lettre seule. Ni le logement d'un personnage, qui ne se croise avec personne (« 1276 Fig Leaf Lane », « Jackie's
// Garage », « Delamain Corp HQ ») : les champs « residence » en sont pleins.
const NOT_PLACE = /years old|mythology|^(?:his|her|their|my|any|unknown|various|several)\b|^(?:hideout|safehouse|ranch|backyard|home|house|castle|village)$|^[^\p{L}]*$|^\p{L}$|^\d|\b(?:apartments?|house|home|garage|office|hq|mansion|hovel|hideout|lab|cabin|club|restaurante?|saloon|facility|warship|corp|inc|clinic|chamber|control room|alcove|courtyard|camp|campsites?|laboratory|capsule|manor|hall|prison|dam|farmstead|homestead|department|plant|theat(?:er|re)|warehouse|storage|bunker|level|interior|car|inn|buffet|cure|mare)$|\bstage\b|\bcampsites?\b|\sbeach$|\bgas station$|^(?:in|on|at|buried|spirit|reborn|later|see|underneath|room|residence of|apartment of)\b|\b(?:during|childhood)\b|^(?:peripatetic|everywhen|deep in the wilds|l\d+)$/iu

// « Likely Japan », « Created on Zebes », « Town of Onett », « Country of Eagleland » : le lieu seul
const PLACE_PREFIX = /^(?:(?:likely|possibly|probably|presumably|formerly|originally|created (?:on|in)|raised (?:on|in)|born (?:on|in))\s+|(?:the\s+)?(?:island country|country|town|region|province) of\s+)/i

// Les lieux qu'on tire d'un nom, pour donner un max d'indices : un pays en français (« American » → États-Unis), une
// ville ou une région réelle avec son pays (Seattle → Seattle, États-Unis), le lieu d'un gentilé (Deponian → Deponia),
// un lieu de fiction tel quel. [] : pas un lieu.
export function translatePlace(label: string): string[] {
  // Les caractères invisibles des drapeaux emoji (« 󠁧󠁢󠁳 Scottish »)
  const clean = label.replace(/[\u{E0000}-\u{E007F}\p{Extended_Pictographic}]/gu, '').trim().replace(PLACE_PREFIX, '').replace(/["?]/g, '').replace(/[.\s]+$/, '').trim()
  const name = key(clean).replace(/^the\s+/, '')
  if (NOT_PLACES.has(name) || NOT_PLACES.has(key(clean)) || NOT_PLACE.test(name))
    return []
  const country = NATIONALITIES[key(clean)] ?? NATIONALITIES[name] ?? HISTORIC_COUNTRIES[name] ?? FRENCH_PLACES[key(clean)]
  if (country)
    return [country]
  const cityName = CITY_NAMES[key(clean)] ?? CITY_NAMES[name] ?? translateNationality(clean)
  const city = CITIES[key(clean)] ?? CITIES[name] ?? CITIES[key(cityName)]
  if (city)
    return [cityName, city]
  // « Japanese-Portuguese » : les deux pays
  const both = name.split('-').map(part => NATIONALITIES[part])
  if (both.length === 2 && both.every(Boolean))
    return both as string[]
  return [PLACE_NAMES[name] ?? translateNationality(clean)]
}

// --- Monde ---

// Le dernier recours de la nationalité (validé avec FX) : « Monde réel » pour un personnage de notre monde, vide sinon
// (un autre monde sans lieu trouvé, ou on ne sait pas), à compléter à la main. Unknown seulement si le wiki le dit. « Monde réel » et pas
// « Earth » : la science-fiction du système solaire (Mars, la Lune) est aussi notre monde. Plus loin (une planète d'une
// autre étoile), ce n'est plus le monde réel. « Monde réel » s'ajoute aussi à tout personnage placé dans un lieu réel,
// pour qu'il croise ceux qui n'ont que lui (United States face à Monde réel : partiel, pas faux). Les franchises qui se
// passent dans l'espace ajoutent « Lost in the Galaxy » à tous leurs personnages, placés ou non (SPACE_FRANCHISES), et
// celles du mythe de Cthulhu « Mythe de Cthulhu » (MYTHOS_FRANCHISES) : les univers partagés, voir franchiseUniverses.
// Le monde de la franchise : FRANCHISE_WORLDS, sinon les lieux des autres personnages (franchiseWorld).
export const REAL_WORLD = 'Monde réel'
export const SPACE = 'Lost in the Galaxy'
export const CTHULHU_MYTHOS = 'Mythe de Cthulhu'
export type World = 'real' | 'other'

// Les pays d'aujourd'hui (noms anglais d'Intl), ceux d'histoire, et notre système solaire
const REAL_PLACES = new Set([
  ...(() => {
    const names = new Intl.DisplayNames('en', { type: 'region' })
    const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
    return letters.flatMap(a => letters.map(b => names.of(a + b))).filter((name): name is string => Boolean(name) && !/^[A-Z]{2}$/.test(name!))
  })(),
  'Czech Republic', 'Soviet Union', 'Yugoslavia', 'Persia', 'Roman Empire', 'Byzantine Empire', 'Ottoman Empire', 'Portuguese Empire',
  'Kingdom of England', 'Kingdom of France', 'Kingdom of Great Britain', 'Ptolemaic Kingdom', 'Russian Soviet Federative Socialist Republic',
  'Polynesia', 'Earth', 'Moon', 'Mars', 'Venus', 'Mercury', 'Jupiter', 'Saturn', 'Titan', 'Europa', 'Ganymede', 'Callisto', 'Io',
  'Phobos', 'Deimos', 'Pluto', 'Enceladus',
])

// Un lieu de notre monde : un pays, un astre du système solaire, ou une ville réelle connue (London → United Kingdom)
export function isRealPlace(place: string): boolean {
  const country = placeCountry(place)
  return REAL_PLACES.has(place) || (country !== null && REAL_PLACES.has(country))
}

// Les espèces de notre monde : dans une franchise du monde réel, seules elles sont « Monde réel ». Les autres (dieux,
// démons, extraterrestres, dont les espèces propres à une franchise : Sangheili, Asari…) sont « Inconnu ». Une liste
// des espèces d'ailleurs raterait ces dernières. Espèce inconnue : comme un humain.
const OUR_WORLD_SPECIES = new Set(['Human', 'Animal', 'Robot', 'Android', 'Cyborg', 'Mutant', 'Infected', 'Undead', 'Vampire', 'Ghost', 'Replicant', "Player's choice"])

// Les personnages placés dont au moins cette part est dans le monde réel : franchise du monde réel
const REAL_SHARE = 0.6
// Une franchise dont aucun personnage placé n'est dans le monde réel, avec au moins ce nombre de placés : un autre monde
const MIN_PLACED_OTHER = 3

// Le monde d'une franchise d'après les lieux de ses personnages (vides compris), null quand c'est mêlé ou trop peu
export function franchiseWorld(places: (string[] | null)[]): World | null {
  const placed = places.filter(list => list && list.length > 0) as string[][]
  if (placed.length === 0)
    return null
  const real = placed.filter(list => list.some(isRealPlace)).length
  if (real / placed.length >= REAL_SHARE)
    return 'real'
  return real === 0 && placed.length >= MIN_PLACED_OTHER ? 'other' : null
}

// Les lieux d'un personnage avec son monde : Monde réel ajouté s'il est placé dans notre monde ; sans lieu, Monde réel
// si sa franchise s'y passe (pas pour un dieu ou un extraterrestre : vide). Les univers partagés de la franchise en
// plus (Lost in the Galaxy, Mythe de Cthulhu : franchiseUniverses). null si on ne sait rien.
export function withWorld(places: string[] | null, species: unknown, world: World | null, universes: readonly string[] = []): string[] | null {
  const spaced = (list: string[]) => [...list, ...universes.filter(universe => !list.includes(universe))]
  if (places && places.length > 0)
    return spaced(places.some(isRealPlace) && !places.includes(REAL_WORLD) ? [...places, REAL_WORLD] : places)
  const list = Array.isArray(species) ? species.map(String) : []
  const ours = list.length === 0 || list.some(name => OUR_WORLD_SPECIES.has(name))
  const found = spaced(world === 'real' && ours ? [REAL_WORLD] : [])
  return found.length > 0 ? found : null
}

// Le monde des franchises que les lieux des personnages ne tranchent pas (personne de placé, ou mêlé), et les
// corrections du calcul. null : on ne sait pas, les personnages sans lieu restent vides. La science-fiction avec des
// humains venus de la Terre est le monde réel tant qu'elle reste dans le système solaire (Prey, Doom).
export const FRANCHISE_WORLDS: Record<string, World | null> = {
  // Monde réel
  'Fallout': 'real', 'Mega Man': 'real', 'Cyberpunk 2077': 'real', 'Horizon': 'real', 'Dying Light': 'real', 'Doom': 'real',
  'Syberia': 'real', 'The Stanley Parable': 'real', 'Sons Of The Forest': 'real', 'Death Stranding': 'real', 'Prey': 'real',
  'The Talos Principle': 'real', 'Wasteland': 'real', 'Twelve Minutes': 'real', 'Hunt: Showdown': 'real', 'Rust': 'real',
  // Un autre monde
  'Super Mario': 'other', 'Kingdom Hearts': 'other', 'Kirby': 'other', 'Animal Crossing': 'other', 'Ratchet & Clank': 'other',
  'Gears of War': 'other', 'Rayman': 'other', 'Dragon Quest': 'other', 'Xenoblade Chronicles': 'other', 'Zenless Zone Zero': 'other',
  'Minecraft': 'other', 'Okami': 'other', 'Touhou Project': 'other', 'Stardew Valley': 'other', 'Bloons Tower Defense': 'other',
  'Spore': 'other', 'Warhammer': 'other', 'Palworld': 'other', 'No Man\'s Sky': 'other', 'Solasta': 'other', 'Myst': 'other',
  'Forgotton Anne': 'other', 'The World Next Door': 'other', 'Deep Rock Galactic': 'other', 'Chants of Sennaar': 'other',
  'We Were Here': 'other', 'My Time at Portia / Sandrock': 'other', 'Mirror\'s Edge': 'other', 'Dredge': 'other',
  'Blue Prince': 'other', 'Among Us': 'other',
  // La science-fiction hors du système solaire, même avec des humains venus de la Terre
  'Halo': 'other', 'Dead Space': 'other', 'Satisfactory': 'other', 'Icarus': 'other', 'The Riftbreaker': 'other',
  'The Alters': 'other', 'Breathedge': 'other', 'Genesis Alpha One': 'other', 'Subnautica': 'other',
  // Le calcul dit « autre monde », mais c'est (peut-être) le nôtre : on ne sait pas
  'Devil May Cry': null, 'Yo-kai Watch': null,
}

// Les franchises qui se passent dans l'espace (vaisseaux, autres planètes) : Lost in the Galaxy pour tous
export const SPACE_FRANCHISES = new Set([
  'Mass Effect', 'Halo', 'Dead Space', 'Star Fox', 'Metroid', 'Ratchet & Clank', 'StarCraft', 'Borderlands', 'Outer Wilds',
  'No Man\'s Sky', 'Rebel Galaxy', 'Among Us', 'Subnautica', 'Satisfactory', 'Icarus', 'The Riftbreaker', 'The Alters',
  'Breathedge', 'Genesis Alpha One', 'Deep Rock Galactic', 'Titanfall / Apex Legends', 'Honkai: Star Rail', 'Pikmin', 'Prey',
])

// Les franchises du mythe de Cthulhu (Lovecraft) : le même univers, Mythe de Cthulhu pour tous. Seulement celles qui
// reprennent le mythe lui-même (ses dieux, ses lieux : Nyarlathotep, Innsmouth), pas celles qui s'en inspirent avec leur
// propre univers (Dredge, Amnesia, Dead Space). À compléter à la main, rien dans Wikidata ne les repère bien.
export const MYTHOS_FRANCHISES = new Set(['Call of Cthulhu', 'The Sinking City', 'Sundered'])

// Les univers partagés d'une franchise, ajoutés aux lieux de tous ses personnages
export function franchiseUniverses(franchise: string): string[] {
  return [...SPACE_FRANCHISES.has(franchise) ? [SPACE] : [], ...MYTHOS_FRANCHISES.has(franchise) ? [CTHULHU_MYTHOS] : []]
}

// --- Occupation ---

// Les sources, dans l'ordre (fetchPixeldle.ts, pixeldleEnrich.ts) : Wikidata, le champ occupation de l'infobox, sinon
// son grade ou sa classe (« Commander », « Mage »), une créature hostile (« behavior: Hostile ») en Prédateur, puis
// l'introduction de la page (« X is a Vietnam veteran » → Soldat, introRoles), « defaults » du manuel (le métier commun
// d'une franchise : Valorant, Soulcalibur…). Les armes de l'infobox s'y ajoutent (weaponOccupations). Sans métier :
// Compagnon ou Assistant si l'introduction le dit (introFunction), Destructeur ou Protecteur pour un dieu, un démon ou un
// ange (introAlignment), puis Au choix (occupationOrChoice), vide sinon. Les quasi-synonymes sont regroupés à la
// fin (mergeOccupations). Pas d'occupation pour les rôles d'histoire (antagoniste, compagnon possible) ni les liens de
// famille.

// Déjà passée en français et au masculin par wikidataOccupation (« Pratiquant d'arts martiaux »). null : retirée.
const OCCUPATION_RULES: [RegExp, string | null][] = [
  // Les cas qui contiennent un mot d'une autre famille
  [/military impostor/, null],
  [/patron de bar/, 'Waiter'],
  [/agent de sécurité|garde du corps|garde royale|videur|tower guard|sentinel|gatekeeper|^gardien$|directeur de prison/, 'Guard'],
  [/agent immobilier/, 'Merchant'],
  [/directeur d'école|professeur|enseignant|instituteur|mentor|instructeur|chargé de cours|doyen|entraîneur/, 'Teacher'],
  [/étudiant en médecine|médecin|chirurgien|infirmi|aide-soignant|psychiatre|guérisseur|personnel médical|intervenant d'urgence|sauveteur/, 'Doctor'],
  [/joueur professionnel de jeux vidéo|^gamer$/, 'Gamer'],
  [/développeur de jeux vidéo|testeur de jeux|programmeur|ingénieur logiciel|hacker/, 'Programmer'],
  [/pirate de l'air|criminel de guerre/, 'Criminal'],
  [/voyageur dans le temps|dimension traveler/, 'Time traveler'],
  [/dresseur pokémon|champion d'arène|pokémon coordinator/, 'Trainer'],
  [/chasseur de primes|^fixeur$/, 'Bounty hunter'],
  [/chasseur de (?:vampires?|démons?|monstres?|zombies?)|dragonslayer|witcher|exorciste/, 'Monster hunter'],
  [/chasseur de trésor|vault hunter|prospecteur/, 'Treasure hunter'],
  [/^chasseur$/, 'Hunter'],
  // Crime
  [/tueur à gages|assassin/, 'Assassin'],
  [/tueur|meurtrier/, 'Killer'],
  [/voleur|braqueur|escroc|brigand|bandit|^rogue$/, 'Thief'],
  [/pirate|corsaire/, 'Pirate'],
  [/gangster|chef de bande|yakuza|trafiquant|dealer|contrebandier|proxénète|usurier|hors-la-loi|criminel|conspirateur|incendiaire/, 'Criminal'],
  [/terroriste/, 'Terrorist'],
  [/mercenaire/, 'Mercenary'],
  // Combat
  [/justicier|super-héros|crime ?fighter/, 'Vigilante'],
  [/^hero$|antihéros/, 'Hero'],
  [/révolutionnaire|militant|partisan|chef rebelle|combattant pour la liberté|freedom fighter|défenseur des droits|propagandiste/, 'Revolutionary'],
  [/tireur|as de la gâchette/, 'Sniper'],
  [/pilote|aviateur|mech pilot|spacecraft pilot/, 'Pilot'],
  [/espion|^agent|indicateur/, 'Spy'],
  [/soldat|militaire|military|espace marin|officier|commandant|chef militaire|seigneur de guerre|aide de camp|sapeur|écuyer/, 'Soldier'],
  [/arts martiaux|karatéka|nak muay|kick-boxeur|taekwondoïste|catcheur|wrestler|gladiateur|fighter|escrimeur|matador/, 'Fighter'],
  [/chevalier|paladin/, 'Knight'],
  [/samouraï|rōnin/, 'Samurai'],
  [/épéiste/, 'Swordsman'],
  [/ninja|kunoichi/, 'Ninja'],
  [/\barcher|rôdeur/, 'Archer'],
  [/guerrier|barbare/, 'Warrior'],
  // Magie, religion
  [/jedi/, 'Jedi'],
  [/magicien|wizard|sorci|sorcerer|warlock|archimage|nécromancien|druide|auror|féticheur|médium|hypnotiseur/, 'Mage'],
  [/prêtre|clerc|moine|miko|gūji|chef religieux|gourou|prédicateur/, 'Cleric'],
  // Pouvoir
  [/\broi\b|\breine\b|souverain|monarque|empereur|impératrice|tyran|dictateur|chef d'état/, 'Royalty'],
  [/prince|famille royale|^lord$|héritière|vizir/, 'Noble'],
  [/chef de tribu|clan chief/, 'Clan leader'],
  [/personnalité politique|président|maire|gouverneur|diplomate|délégué|personne d'état/, 'Politician'],
  [/avocat|procureur|juge/, 'Lawyer'],
  [/personnalité du monde des affaires|entrepreneur|investisseur|philanthrope|magnat|négociant|propriétaire|conseil d'administration/, 'Businessperson'],
  [/responsable|dirigeant|directeur|fondateur|patron|chef d'entreprise|manager/, 'Leader'],
  [/conseiller|consultant|tacticien|adjoint|assistant/, 'Advisor'],
  // Sciences
  [/archéologue/, 'Archaeologist'],
  [/scientifique|chercheur|roboticien|ingénieur|inventeur|chimiste|physicien|généticien|virologue|toxicologue|biologiste|bioingénieur|botaniste|climatologue|cybernéticien|cybernétiste|technicien de laboratoire|magizoologist/, 'Scientist'],
  [/historien|érudit|archiviste|penseur|philosophe/, 'Scholar'],
  [/détective|enquêteur|inspecteur/, 'Detective'],
  [/policier|police|shérif|deputy sheriff|proctor/, 'Police officer'],
  // Aventure
  [/survivant/, 'Survivor'],
  [/explorateur|aventurier|voyageur|pionnier|ermite|musher/, 'Adventurer'],
  [/astronaute/, 'Astronaut'],
  [/\bmarin\b|capitaine de|membre d'équipage/, 'Sailor'],
  // École, sport
  [/étudiant/, 'Student'],
  [/lycéen|collégien|élève|écolier|preschool/, 'Pupil'],
  [/footballeur|piqueuse|joueur|sportif|gymnaste|pom-pom|tennis|traceur|plongeur/, 'Athlete'],
  // Arts, médias
  [/chanteur|musicien|guitariste|bassiste|choriste|disc jockey|artiste lyrique|barde/, 'Musician'],
  [/acteur|cinéaste|réalisateur|producteur|animateur de télévision/, 'Actor'],
  [/journaliste|reporter|correspondant|rédacteur/, 'Journalist'],
  [/auteur|écrivain/, 'Writer'],
  [/artiste|sculpteur|danseur|photographe|mannequin|mode|divertissement/, 'Artist'],
  // Métiers
  [/plombier/, 'Plumber'],
  [/mécanicien/, 'Mechanic'],
  [/cuisinier|boulanger/, 'Cook'],
  [/serveur|employé de bar|patron de bar|bouteiller/, 'Waiter'],
  [/vendeur|commerçant|marchand|fleuriste/, 'Merchant'],
  [/herboriste|agriculteur|vacher|jardinier|vigneron|plantation|cow-boy|pêcheur/, 'Farmer'],
  [/femme au foyer|domestique|femme de ménage|valet|nourrice|gardien d'enfants|majordome/, 'Servant'],
  [/chauffeur|conducteur|coursier|livreur|charretier/, 'Driver'],
  [/charpentier|forgeron|ouvrier|mineur|usineur|tapissier|modéliste|homme à tout faire|technicien de surface|janitor|travailleur|cireur/, 'Worker'],
  [/salarié|employé|secrétaire|commis|bibliothécaire/, 'Employee'],
  [/guide/, 'Guide'],
  [/prostitué/, 'Prostitute'],
  [/pompes funèbres/, 'Undertaker'],
  [/chômeur/, 'Unemployed'],
  [/retraité|pensionné/, 'Retiree'],
  [/prisonnier/, 'Prisoner'],
  // Pas des occupations
  [/partenaire sexuel|cobaye|bénévole|humanitaire/, null],
]

// Les valeurs anglaises des infobox (« Bartender », « Leader of the Horde », « CEO of Wayne Enterprises »), et les
// traductions du dictionnaire du Weebdle qui ne sont pas dans nos familles (Leader, Mage, Serviteur...).
// Après les règles françaises : les cas précis d'abord.
const ENGLISH_OCCUPATION_RULES: [RegExp, string | null][] = [
  // Pas des occupations : des titres, des rôles d'histoire, des phrases
  [/^legend$|^champion$|lesser evil|prime evil|^savior|^beast$|^predator$|^deity$|silent protagonist|she sleeps|making trouble|possibly other|^training$|^development$|^stabilizes|^search-|^catastrophes|pursuit of knowledge|rapid recovery|mow down|^africa$|^bowser's kingdom$|^burkes$|^calanthe$|^crach$|offices?$|uncloak|ultra guardians|^the army|^special forces$|research specimen|alchemilla hospital patient|detainee|devil gene|kindergartner|^aspect of|herald of|left eye|protector of|jailer of|soul devourer|^disciple of|sentinel of light|^primus|^ordermaster|hidden arcanum|^monitor|prime candidate|wandering orphan|^illuminator|^virtuoso|party animal|liquor connoisseur|independently wealthy|reclaiming|^ss of|shikigami|terraformer|sumpsnipe/, null],
  // Les cas qui contiennent un mot d'une autre famille
  [/cheerleader/, 'Athlete'],
  [/medical officer/, 'Doctor'],
  [/science officer/, 'Scientist'],
  [/assistant manager/, 'Employee'],
  [/forest ranger|park ranger|fire lookout/, 'Guard'],
  [/commando/, 'Soldier'],
  [/gym leader|elite four|frontier brain|pokémon champion|pokemon champion|pokémon performer|trainer/, 'Trainer'],
  [/advisor|adviser|vizier to/, 'Advisor'],
  [/servant of/, 'Servant'],
  [/waiter|waitress|hostess|bartender/, 'Waiter'],
  [/stage show|\bactor\b/, 'Actor'],
  [/con-?artist|gunrunner/, 'Criminal'],
  [/freedom fighter/, 'Revolutionary'],
  [/crime ?fighter/, 'Vigilante'],
  [/doctor of archaeology/, 'Archaeologist'],
  [/doctor of philosophy/, 'Scholar'],
  [/purchasing agent|sales (?:agent|assistant)/, 'Merchant'],
  [/\bmarines?\b/, 'Soldier'],
  [/law officer/, 'Police officer'],
  [/\bruler\b/, 'Royalty'],
  [/fiend hunter/, 'Monster hunter'],
  [/fortune hunter/, 'Treasure hunter'],
  [/student council|(?:elementary|middle|high) ?school student/, 'Pupil'],
  [/head of hogwarts/, 'Teacher'],
  [/bodyguard|security|guard|bouncer|warden|gatekeeper|jailer|keeper of the keys|enforcer|sentry|sentinel/, 'Guard'],
  [/video game developer|game developer|hacker|programmer|software|ripperdoc|technician/, 'Programmer'],
  [/bounty hunter|^fixer$/, 'Bounty hunter'],
  [/dragon ?slayer|monster hunter|demon hunter|vampire hunter|witcher/, 'Monster hunter'],
  [/treasure|salvager|prospector/, 'Treasure hunter'],
  [/gamekeeper|^hunter$|^huntress$/, 'Hunter'],
  [/head of (?:\w+ )?house|head of transfiguration|potions master|professor|teacher|mentor|instructor|^dean\b|headmaster|headmistress/, 'Teacher'],
  [/doctor|physician|surgeon|nurse|medic\b|first responder|paramedic|healer|caregiver/, 'Doctor'],
  [/streamer|influencer|youtuber/, 'Artist'],
  // Crime
  [/assassin|hitman|contract killer/, 'Assassin'],
  [/serial killer|murderer|killer/, 'Killer'],
  [/thief|burglar|robber|pickpocket|fence|swindler|con artist|fraud/, 'Thief'],
  [/pirate|smuggler/, 'Pirate'],
  [/terrorist|anarchist|insurgent/, 'Terrorist'],
  [/gangster|mobster|crime (?:lord|boss)|criminal|outlaw|drug|racketeer|henchman|thug|gang|yakuza|mafia|patriarch|chairman of the tojo|fugitive|convict|bandit|rocket boss|super-?villain|villain/, 'Criminal'],
  [/mercenar/, 'Mercenary'],
  // Combat
  [/vigilante|superhero|super-hero|crime ?fighter/, 'Vigilante'],
  [/^hero$|^heroine$/, 'Hero'],
  [/revolutionar|rebel|resistance|freedom fighter|activist|liberat|guerrilla|subversive/, 'Revolutionary'],
  [/sniper|marksman|gunslinger/, 'Sniper'],
  [/pilot|aviator/, 'Pilot'],
  [/sailor|navigator|boat captain|seaman|lord admiral/, 'Sailor'],
  [/\bspy\b|^agent|operative|informant|interrogator|mi6/, 'Spy'],
  [/soldier|army|navy|marine|military|commander|^general$|general of|admiral|captain|corporal|sergeant|lieutenant|colonel|\bmajor\b|officer|warlord|warmonger|seals|s\.t\.a\.r\.s|u\.b\.c\.s|bsaa|tekken force|squire|serviceman/, 'Soldier'],
  [/martial artist|fighter|boxer|wrestler|luchador|gladiator|brawler|karate|kung fu|thunderdome/, 'Fighter'],
  [/knight|paladin|templar/, 'Knight'],
  [/samurai|ronin/, 'Samurai'],
  [/swordsman|swordswoman|swordmaster|blademaster/, 'Swordsman'],
  [/ninja|shinobi|kunoichi/, 'Ninja'],
  [/\barcher|\branger/, 'Archer'],
  [/warrior|barbarian|berserker/, 'Warrior'],
  // Magie, religion
  [/jedi/, 'Jedi'],
  [/archmage|\bmage\b|wizard|witch|sorcer|warlock|necromancer|druid|shaman|summoner|abjurer|transmuter|diviner|enchant|conjur|alchemist|auror|medium|magician/, 'Mage'],
  [/priest|cleric|\bmonks?\b|\bnun\b|clergy|bishop|archbishop|preacher|religious|cult leader|shrine|tekken grand high/, 'Cleric'],
  // Pouvoir
  [/\bking\b|\bqueen\b|emperor|empress|monarch|sultan|pharaoh|exalt|head of state|tyrant|dictator|maharajah/, 'Royalty'],
  [/prince|princess|duke|duchess|count\b|countess|marquess|^baron|lord|lady|noble|royal|socialite|sheikh/, 'Noble'],
  [/chieftain|warchief|chief of the|\bclan\b|\btribe\b/, 'Clan leader'],
  [/politician|president|mayor|governor|minister|senator|ambassador|diplomat|head of government|government|bailiff|vizier/, 'Politician'],
  [/lawyer|attorney|prosecutor|judge/, 'Lawyer'],
  [/ceo\b|chief executive|business|entrepreneur|investor|industrialist|tycoon|magnate|philanthropist|baron|exporter|real estate|charity/, 'Businessperson'],
  [/leader|head of|director|executive|founder|manager|boss|overseer|matron|ringmaster|chairman|supervisor/, 'Leader'],
  [/advisor|adviser|tactician|second-in-command|consultant|assistant|protégé|associate/, 'Advisor'],
  // Sciences
  [/archaeologist|anthropologist/, 'Archaeologist'],
  [/scientist|researcher|engineer|inventor|chemist|physicist|geneticist|biologist|cryogenicist|brain data|research/, 'Scientist'],
  [/scholar|historian|philosopher|librarian|archivist|translator/, 'Scholar'],
  [/detective|investigator|inspector/, 'Detective'],
  [/police|cop\b|sheriff|deputy|patrolman|constable/, 'Police officer'],
  // Aventure
  [/survivor/, 'Survivor'],
  [/explorer|adventurer|traveler|traveller|wanderer|rescues lost/, 'Adventurer'],
  [/astronaut|cosmonaut/, 'Astronaut'],
  // École, sport
  [/student|pupil/, 'Student'],
  [/athlete|player|racer|racing|apex games|scout leader|yoga/, 'Athlete'],
  // Arts, médias
  [/singer|songstress|musician|guitarist|drummer|\bdj\b|rock ?star|punk|rocker|bard|idol/, 'Musician'],
  [/actor|actress|filmmaker|director of films|tv personality|entertainer|performer|harlequin|clown|stage show/, 'Actor'],
  [/journalist|reporter|correspondent|columnist|interviewer|editor/, 'Journalist'],
  [/writer|author|novelist|poet/, 'Writer'],
  [/photographer|artist|painter|sculptor|dancer|ballet|model\b|designer/, 'Artist'],
  // Métiers
  [/plumber/, 'Plumber'],
  [/mechanic/, 'Mechanic'],
  [/^chef$|\bcook\b|baker|brewer|restaura|yakitori|confection/, 'Cook'],
  [/bartender|barmaid|waiter|waitress|dishwasher/, 'Waiter'],
  [/merchant|vendor|shopkeeper|trader|seller|store|shop|florist|haberdasher|milliner/, 'Merchant'],
  [/farmer|farmhand|rancher|ranch hand|gardener|fisherman|cowboy|herbalist/, 'Farmer'],
  [/\bmaid\b|butler|servant|housekeeper|house-elf|valet|nanny|house cleaning|cleaner|caretaker/, 'Servant'],
  [/driver|chauffeur|courier|delivery|conductor|mover/, 'Driver'],
  [/miner|blacksmith|carpenter|craftsman|artisan|builder|construction|handyman|laborer|labourer|worker|odd job|janitor|part-time/, 'Worker'],
  [/clerk|secretary|employee|office worker|receptionist/, 'Employee'],
  [/guide/, 'Guide'],
  [/prostitute|courtesan|escort/, 'Prostitute'],
  [/unemployed/, 'Unemployed'],
  [/retired/, 'Retiree'],
  [/prisoner|inmate/, 'Prisoner'],
  // Les traductions du dictionnaire du Weebdle hors de nos familles
  [/^leader$|^gérant$|^chef$/, 'Leader'],
  [/^mage$|^sorcier$|^sorcière$/, 'Mage'],
  [/^mafieux$/, 'Criminal'],
  [/^actrice$/, 'Actor'],
  [/^serveuse$/, 'Waiter'],
  [/^serviteur$|^servante$|^majordome$/, 'Servant'],
  [/^capitaine$/, 'Soldier'],
  [/^célébrité$/, 'Artist'],
  [/^idole$/, 'Musician'],
  [/^navigateur$/, 'Sailor'],
]

// L'occupation exacte (clés en minuscules, sans puces), avant les règles : les valeurs des infobox qu'aucune règle
// ne range, ou mal. null : pas une occupation, on la retire.
const OCCUPATIONS: Record<string, string | null> = {
  // Artisans
  'weaponsmith': 'Worker', 'armorer': 'Worker', 'bronzecaster': 'Worker', 'glassblower': 'Worker', 'cobbler': 'Worker',
  'forger': 'Worker', 'logger': 'Worker', 'mining expert': 'Worker', 'foreman of gecko': 'Worker', 'custodian': 'Worker',
  'maintenance android': 'Mechanic',
  // Death Stranding : les porteurs livrent
  'porter': 'Courier', 'porter in training': 'Courier',
  // Commerce, service
  'barista': 'Waiter', 'alewife': 'Waiter', 'works at maxine\'s diner': 'Waiter', 'proprietor': 'Merchant',
  'proprieter of the mikaelsen ranch': 'Farmer', 'bookeeper at wren\'s nook': 'Employee',
  'financial backer of hiram burrows': 'Businessperson', 'managing of the new vegas strip': 'Leader',
  // Chasse
  'trapper': 'Hunter', '3rd tier tracker': 'Hunter', 'vampire huntress': 'Monster hunter', 'banisher': 'Monster hunter',
  // Armée, police
  'albion operations tactical adjutant': 'Soldier', 'demolitions expert': 'Soldier', 'executor of the koprulu expedition': 'Soldier',
  'legionnaire': 'Soldier', 'recon trooper': 'Soldier', 'recruit': 'Soldier', 'the last minuteman': 'Soldier',
  'trainee at rockfort island': 'Soldier', 'usstratcom\'s anti-umbrella pursuit': 'Soldier', 'yorha tactical support unit': 'Soldier',
  'confederate marshal': 'Police officer', 'marshal': 'Police officer', 'swat specialist': 'Police officer', 'watchman of the aesir': 'Guard',
  // Combat
  'blade of miquella': 'Warrior', 'champion of the aesir': 'Warrior', 'east-khan champion': 'Fighter',
  'west-khan champion': 'Fighter', 'competitor': 'Fighter', 'chosen of sylvarant': 'Hero',
  // Crime
  'blackmailer': 'Criminal', 'loyalist conspirator': 'Criminal', 'mastermind': 'Criminal',
  'freebooter': 'Pirate', 'plunderer': 'Pirate', 'privateers': 'Pirate',
  // Religion, magie
  'church crier': 'Cleric', 'grand inquisitor': 'Cleric', 'missionary': 'Cleric', 'prophet': 'Cleric', 'saint': 'Cleric',
  'sanctifex': 'Cleric', 'sanctoress': 'Cleric', 'fire keeper': 'Cleric', 'right hand of the divine': 'Cleric',
  'defender of the emerald dream': 'Mage', 'astrologer': 'Scholar', 'interpreter': 'Scholar',
  // Pouvoir
  'sovereign': 'Royalty', 'mistress of castle dimitrescu': 'Noble', 'dracula\'s vassal': 'Servant',
  'public voice of the elders': 'Politician', 'spokesperson': 'Politician', 'judicator': 'Politician', 'the notary': 'Lawyer',
  'second in command': 'Advisor',
  // Sciences, soins
  'roboticist': 'Scientist', 'architect': 'Scientist', 'elerium expert': 'Scientist', 'looking glass specialist': 'Scientist',
  'alpha a.i. psychologist': 'Doctor', 'tau radiologist': 'Doctor', 'therapist': 'Doctor', 'techie': 'Programmer',
  // Médias, spectacle
  'acrobat': 'Artist', 'color commentator': 'Journalist', 'reality tv host': 'Actor', 'prepper': 'Survivor',
  'occultist': 'Mage', 'polymath': 'Scholar', 'tech support for lara croft': 'Programmer',
  'tactical adjutant': 'Soldier', 'climatologist': 'Scientist', 'debt collector': 'Criminal', 'investment banker': 'Businessperson',
  'scavenger': 'Survivor', 'jester': 'Artist', 'pokémon watcher': 'Trainer', 'mad gear goon': 'Criminal', 'nukenin': 'Ninja', 'professional gamer': 'Gamer', 'yooper scooper': 'Worker',
  'albion operations': null, 'last of the xel\'naga': null, 'various others': null,
  // Pas des occupations : rôles dans l'histoire, liens de famille, dieux (l'espèce le dit), phrases, valeurs vides
  'antagonist': null, 'main antagonist': null, 'overarching antagonist': null, 'secondary antagonist': null,
  'hidden antagonist': null, 'narrator': null,
  'primary fallout antagonist': null, 'protagonist': null, 'ally': null, 'companion': null, 'temporary companion': null,
  'minor character': null, 'neutral': null, 'determinant': null, 'colleague': null, 'father': null, 'mother': null,
  'husband': null, 'wife': null, 'elder god': null, 'god of chaos': null, 'god of crossroads': null, 'treeminder deity': null,
  'ghost': null, 'darkness': null, 'rebirth': null, 'solo': null, 'support': null, 'nuker': null, 'operating': null,
  'supervision': null, 'satelite control': null, 'control of the supercarriers': null, 'control of magical creatures': null,
  'explosive devices': null, 'corporate': null, 'uca': null, 'spi': null, '2nd tier': null, 'mount': null, 'bridge baby': null,
  'walking enigma': null, 'feline demi-human': null, 'contracted demon': null, 'vessel for dominus': null, 'the blade': null,
  'the \'will of high prophets\'': null, 'child of the full moon': null, 'promotional mascot': null, 'initiate': null,
  'trickster': null, 'alien invader': null, 'dark mistress': null, 'mourner': null, 'volunteer': null, 'birdwatcher': null,
  'vault resident': null, 'off-seer': null, 'leaper': null, 'puzzle keeper': null, 'torture specialist': null,
  'torturer of souls': null, 'apas human interface': null, 'battle automaton': null, 'exploration robot': null,
  'sentient assault vehicle': null, 'super fighting robot': null, 'timber felling robot': null, 'creator of chromatic dragonflight': null,
  'creator of the chromatic dragonflight': null, 'creator of h3o': null, 'creator of sensen': null, 'creator of the ruin': null,
}

export function translateOccupation(label: string): string | null | undefined {
  // « ---- Confederate marshal », « · Weaponsmith », « "The Blade » → sans les puces ni les guillemets qui traînent
  const value = key(label).replace(/^[\s・*•·"-]+|"+$/g, '').replace(/^(?:former\s+|ex-|retired\s+)(?=\S)/, '')
  // « ---- » : rien
  if (!value)
    return null
  if (value in OCCUPATIONS)
    return OCCUPATIONS[value]
  const french = firstRule(OCCUPATION_RULES, value)
  return french !== undefined ? french : firstRule(ENGLISH_OCCUPATION_RULES, value)
}

// Les quasi-synonymes regroupés, validés avec FX (aussi ceux de la table commune scripts/translate.ts, et des corrections à la main)
const OCCUPATION_MERGES: Record<string, string | null> = {
  'Pupil': 'Student', 'Clan leader': 'Leader', 'Killer': 'Assassin', 'Warrior': 'Fighter',
  // déjà dans l'espèce (Divinité)
  'God': null,
}

// Les occupations finales d'un personnage : regroupées, sans doublon
export function mergeOccupations(value: unknown): string[] | null {
  const list = (Array.isArray(value) ? value : value ? [value] : []).map(String)
    .map(name => name in OCCUPATION_MERGES ? OCCUPATION_MERGES[name] : name)
    .filter((name): name is string => name !== null)
  return list.length > 0 ? [...new Set(list)] : null
}

// --- Développeur ---

// Les divisions internes et les filiales ramenées au studio que les joueurs connaissent
const DEVELOPERS: Record<string, string> = {
  'nintendo entertainment analysis and development': 'Nintendo', 'nintendo entertainment planning & development': 'Nintendo',
  'nintendo research and development 1': 'Nintendo', 'nintendo software technology': 'Nintendo',
  'square': 'Square Enix', 'namco': 'Bandai Namco', 'namco tales studio': 'Bandai Namco', 'bandai namco entertainment': 'Bandai Namco',
  'project soul': 'Bandai Namco', 'chunsoft': 'Spike Chunsoft', 'spike': 'Spike Chunsoft', 'blizzard entertainment': 'Blizzard',
  'blizzard north': 'Blizzard', 'valve corporation': 'Valve', 'bungie studios': 'Bungie', 'bioware': 'BioWare',
  'cd projekt red': 'CD Projekt Red', 'team silent': 'Konami', 'sega-am2': 'Sega', 'bethesda softworks': 'Bethesda',
  'bethesda game studios': 'Bethesda', 'zenimax online studios': 'Bethesda', 'ubisoft montréal': 'Ubisoft', 'ubisoft québec': 'Ubisoft',
  'ubisoft shanghai': 'Ubisoft', 'ubisoft paris': 'Ubisoft', 'ubisoft sofia': 'Ubisoft', 'eric barone': 'ConcernedApe',
  'mojang studios': 'Mojang', 'midway games': 'Midway', 'mercurysteam entertainment': 'MercurySteam',
  'digital illusions creative entertainment': 'DICE', 'don\'t nod entertainment': 'Don\'t Nod', 'sora': 'Sora Ltd.',
  'unknown worlds entertainment': 'Unknown Worlds', 'atlus': 'Atlus', 'rockstar north': 'Rockstar', 'dma design': 'Rockstar',
  'rockstar san diego': 'Rockstar', 'rockstar lincoln': 'Rockstar', 'p-studio': 'Atlus',
}

// Les franchises dont Wikidata donne le mauvais studio (8-4 a traduit Undertale, ne l'a pas fait)
export const FRANCHISE_DEVELOPERS: Record<string, string> = {
  'Undertale': 'Toby Fox',
  // Absents de Wikidata
  'Rebel Galaxy': 'Double Damage Games',
  'Breathedge': 'RedRuins Softworks',
  // Sanzaru n'a fait que le 4e jeu (et les portages)
  'Sly Cooper': 'Sucker Punch Productions',
  // Iron Galaxy n'a fait que le portage Switch d'Apex Legends
  'Titanfall / Apex Legends': 'Respawn Entertainment',
  // Développé seul par Luis Antonio (Annapurna l'édite) : Wikidata n'a pas de développeur
  'Twelve Minutes': 'Luis Antonio',
}

export function translateDeveloper(label: string): string {
  return DEVELOPERS[key(label)] ?? label
}

// --- Genres ---

const GENRE_RULES: [RegExp, string | null][] = [
  // Les thèmes ne sont pas des genres : retirés
  [/lgbt|science-fiction|science fiction(?! horror)|postapocalyptique|cyberpunk|fantasy|historique|comédie|christmas|halloween|zombie|time travel|space opera|fiction spéculative|milieu scolaire|cross-over|retro-style|eroge|erotic|chuunige|mystère|localisation|augmented reality|thriller/, null],
  // Une ambiance ou une mécanique, pas un genre (Dredge, Among Us)
  [/cozy game|inventory management|jeu occasionnel|déduction sociale|road movie|crime video game|univers parallèles/, null],
  [/parkour/, 'Platformer'],
  [/commerce|simulateur de vol|jeu vidéo de pêche/, 'Simulation'],
  // Gardés tels quels, validé avec FX
  [/immersive sim/, 'Immersive sim'],
  [/monster-taming/, 'Monster-taming'],
  [/walking simulator/, 'Walking simulator'],
  [/^jeu de tir$|extraction shooter/, 'FPS'],
  [/jeu d'aventure à la troisième personne/, 'Adventure'],
  [/énigme/, 'Puzzle'],
  [/^action-rpg$|soulslike/, 'Action RPG'],
  [/tactical rpg|tactique au tour par tour/, 'Tactical RPG'],
  [/massivement multijoueur/, 'MMO'],
  [/rôle|jrpg|dungeon crawler/, 'RPG'],
  [/action-aventure/, 'Action-adventure'],
  [/point'n click|aventure graphique|film interactif|^jeu d'aventure$/, 'Adventure'],
  [/visual novel/, 'Visual novel'],
  [/survival horror/, 'Survival horror'],
  [/horreur|horror/, 'Horror'],
  [/battle royale/, 'Battle royale'],
  [/tir en vue subjective|hero shooter|looter shooter|horde shooter|tir tactique/, 'FPS'],
  [/tir à la troisième personne/, 'TPS'],
  [/manic shooter|rail shooter|shoot 'em up/, "Shoot 'em up"],
  [/combat motorisé|course|mascot racer/, 'Racing'],
  [/combat|fighting|fighter|airdasher/, 'Fighting'],
  [/metroidvania|soulsvania|metroidbrainia/, 'Metroidvania'],
  [/plates?-?formes?|platformer/, 'Platformer'],
  [/infiltration/, 'Stealth'],
  [/stratégie|tactique en temps réel|tower defense|4x|god game/, 'Strategy'],
  [/arène de bataille/, 'MOBA'],
  [/roguelike|roguelite/, 'Roguelike'],
  [/hack and slash|character-action|beat them all/, "Beat 'em up"],
  [/réflexion/, 'Puzzle'],
  [/gacha/, 'Gacha'],
  [/survie/, 'Survival'],
  [/sandbox/, 'Sandbox'],
  [/farm life|simulation|gestion|commerce/, 'Simulation'],
  [/football|hockey|tennis|sport/, 'Sports'],
  [/party game|minigame/, 'Party game'],
  [/cartes/, 'Card game'],
  [/flipper|arcade/, 'Arcade'],
  [/^jeu d'action$/, 'Action'],
]

export function translateGenre(label: string): string | null | undefined {
  return firstRule(GENRE_RULES, key(label))
}

// Les genres que Wikidata oublie pour une franchise, ajoutés à ceux de son jeu
export const FRANCHISE_GENRES: Record<string, string[]> = {
  // Les immersive sims cités par Wikipédia FR (Prey l'a déjà dans Wikidata), sur toute la franchise : validé avec FX
  'Dishonored': ['Immersive sim'],
  'Deus Ex': ['Immersive sim'],
  'BioShock': ['Immersive sim'],
  'The Elder Scrolls': ['Immersive sim'],
  'Fallout': ['Immersive sim'],
}
