// Tables de traduction du Pixeldle : les noms bruts de Wikidata (« être humain de fiction », « Nintendo Entertainment
// Analysis and Development », « jeu de plateforme en 3D ») ramenés à de courtes listes, pour que les indices se comparent.
// Chaque fonction renvoie la valeur traduite, null si ce n'est pas une valeur à garder (on la retire), undefined si on
// ne sait pas la traduire (gardée telle quelle et listée dans le récap : à ajouter ici).

const key = (value: string) => value.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim()

// Le 1er motif qui correspond. Les cas précis d'abord.
const firstRule = (rules: [RegExp, string | null][], value: string) => rules.find(([pattern]) => pattern.test(value))?.[1]

// --- Sexe ---

// Ce que wikidataGender (masculin, féminin...) ne reconnaît pas
const GENDERS: Record<string, string | null> = {
  'genre déterminé par le joueur': 'Au choix', 'femme trans': 'Femme', 'homme trans': 'Homme',
  'agenre': 'Autre', 'intersexuation': 'Autre', 'non-binaire': 'Autre',
  'sexe non divulgué dans œuvre': null, 'sexe inconnu': null, 'sexe ou genre non divulgué': null,
  'intersex': 'Autre', 'non-binary': 'Autre', 'nonbinary': 'Autre', 'ambiguous': 'Autre', 'hermaphrodite': 'Autre',
  // Sans sexe : robots, objets, entités
  'genderless': 'Aucun', 'asexual': 'Aucun', 'asexué': 'Aucun', 'sans genre': 'Aucun', 'n/a': 'Aucun', 'unknown': null, 'varies': 'Au choix', 'variable': 'Au choix',
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

// Après avoir retiré « de fiction », « anthropomorphe »... : le nom de l'espèce, en anglais ou en français
const SPECIES: Record<string, string | null> = {
  // Humains, et ce qui n'est qu'une sorte d'humain
  'être humain': 'Humain', 'humain': 'Humain', 'terran': 'Humain', 'homs': 'Humain', 'spartan': 'Humain', 'super soldat': 'Humain',
  'sorcier ou sorcière': 'Humain', 'magicien': 'Humain', 'sang-pur': 'Humain', 'animagus': 'Humain', 'métamorphomage': 'Humain',
  'siren': 'Humain', 'psyker': 'Humain', 'méta-humain': 'Méta-humain', 'mutant': 'Mutant', 'clone': 'Clone', 'nords': 'Nordique',
  'humanoïde': 'Humanoïde', 'extraterrestre': 'Extraterrestre', 'extraterrestre humanoïde': 'Extraterrestre',
  // Machines
  'robot': 'Robot', 'robot master': 'Robot', 'sentient machine': 'Robot', 'androïde': 'Androïde', 'gynoïde': 'Androïde',
  'intelligence artificielle': 'IA', 'omnic': 'Omniaque', 'sentry': 'Robot',
  // Surnaturel
  'déité': 'Divinité', 'daedric prince': 'Daedra', 'higher being': 'Être supérieur', 'ange': 'Ange', 'démon': 'Démon',
  'demon': 'Démon', 'half-demon': 'Demi-démon', 'yōkai': 'Yōkai', 'satori': 'Yōkai', 'kappa': 'Yōkai', 'komainu': 'Yōkai',
  'vampire': 'Vampire', 'comte vampire': 'Vampire', 'dhampir': 'Dhampire', 'fantôme': 'Fantôme', 'revenant': 'Mort-vivant',
  'undead': 'Mort-vivant', 'homunculus': 'Homoncule', 'fée': 'Fée', 'fairy': 'Fée', 'dragon': 'Dragon', 'monstres': 'Monstre',
  // Fantasy
  'elfe': 'Elfe', 'high elf': 'Elfe', 'blood elf': 'Elfe', 'elfe de la nuit': 'Elfe', 'drow': 'Elfe', 'avariel': 'Elfe',
  'demi-elfe': 'Demi-elfe', 'half-elf': 'Demi-elfe', 'elfe de maison': 'Elfe de maison', 'orc': 'Orque', 'orsimer': 'Orque',
  'dwarf': 'Nain', 'goblin': 'Gobelin', 'demi-géant': 'Demi-géant', 'dragonborn': 'Drakéide', 'tieffelin': 'Tieffelin',
  'githyanki': 'Githyanki', 'witcher': 'Sorceleur',
  // Les peuples d'une franchise : gardés, en français quand le jeu les traduit
  'mob minecraft': 'Mob', 'nobody': 'Simili', 'heartless': 'Sans-cœur', 'replica': 'Réplique', 'lightners': 'Lightner',
  'darkners': 'Darkner', 'espèce léviathan': 'Léviathan', 'shangheili': 'Sangheili', 'turian': 'Turien', 'blade': 'Lame',
  'pale being': 'Être pâle', 'vessel': 'Réceptacle', 'weaver': 'Tisseuse', 'rabbid': 'Lapin crétin', 'salmonid': 'Salmonoïde',
  'kong': 'Singe', 'vastaya': 'Vastaya', 'yordle': 'Yordle', 'metal head': 'Metal Head',
  // Animaux
  'animal': 'Animal', 'mammifère': 'Animal', 'monkey': 'Singe', 'singe': 'Singe', 'gorille': 'Singe', 'chien': 'Chien',
  'dog': 'Chien', 'renard': 'Renard', 'fox': 'Renard', 'loup': 'Loup', 'wolf': 'Loup', 'hedgehog': 'Hérisson', 'hérisson': 'Hérisson',
  'echidna': 'Échidné', 'rabbit or hare': 'Lapin', 'lapin/lièvre': 'Lapin', 'chat': 'Chat', 'chat de fiction et autres félins': 'Chat',
  'tigre': 'Tigre', 'lion': 'Lion', 'panther': 'Panthère', 'cheetah': 'Guépard', 'ours': 'Ours', 'ours blanc': 'Ours',
  'polar bear': 'Ours', 'panda': 'Panda', 'giant panda': 'Panda', 'raton laveur': 'Raton laveur', 'raccoon': 'Raton laveur',
  'écureuil': 'Écureuil', 'squirrel': 'Écureuil', 'hamster': 'Hamster', 'rodent': 'Rongeur', 'mole': 'Taupe', 'skunk': 'Moufette',
  'camelid': 'Lama', 'cheval': 'Cheval', 'cochon': 'Cochon', 'rhinocéros': 'Rhinocéros', 'hippopotamus': 'Hippopotame',
  'marsupial': 'Marsupial', 'bat': 'Chauve-souris', 'oiseau': 'Oiseau', 'parrot': 'Perroquet', 'seagull': 'Mouette',
  'pélican': 'Pélican', 'hibou': 'Hibou', 'grenouille ou crapaud': 'Grenouille', 'amphibian': 'Grenouille', 'reptile': 'Reptile',
  'lizard': 'Lézard', 'chameleon': 'Caméléon', 'crocodile or alligator': 'Crocodile', 'tortoise': 'Tortue', 'turtle': 'Tortue',
  'dinosaure': 'Dinosaure', 'poisson': 'Poisson', 'shark': 'Requin', 'octopus': 'Pieuvre', 'jellyfish': 'Méduse',
  'sea urchin': 'Oursin', 'crabe': 'Crabe', 'insecte': 'Insecte', 'insect': 'Insecte', 'araignée': 'Araignée',
  'plante': 'Plante', 'plant species': 'Plante', 'flower': 'Plante', 'arbre': 'Plante', 'virus': 'Virus', 'parasite': 'Parasite',
  'objet': 'Objet', 'manchot': 'Manchot', 'zooplankton': 'Plancton',
  // En anglais, depuis les infobox des wikis
  'human': 'Humain', 'humans': 'Humain', 'human being': 'Humain', 'humanoid': 'Humanoïde', 'hume': 'Humain', 'homo sapiens': 'Humain',
  'android': 'Androïde', 'cyborg': 'Cyborg', 'machine': 'Robot', 'automaton': 'Robot', 'artificial intelligence': 'IA', 'ai': 'IA',
  'alien': 'Extraterrestre', 'extraterrestrial': 'Extraterrestre', 'god': 'Divinité', 'goddess': 'Divinité', 'deity': 'Divinité',
  'demigod': 'Demi-dieu', 'titan': 'Titan', 'angel': 'Ange', 'devil': 'Démon', 'elf': 'Elfe', 'elves': 'Elfe', 'half-elf': 'Demi-elfe',
  'dwarves': 'Nain', 'orcs': 'Orque', 'troll': 'Troll', 'gnome': 'Gnome', 'giant': 'Géant', 'ogre': 'Ogre', 'tiefling': 'Tieffelin',
  'ghost': 'Fantôme', 'spirit': 'Esprit', 'zombie': 'Zombie', 'skeleton': 'Squelette', 'mummy': 'Momie', 'werewolf': 'Loup-garou',
  'witch': 'Humain', 'wizard': 'Humain', 'muggle': 'Humain', 'monster': 'Monstre', 'creature': null, 'beast': 'Bête',
  'cat': 'Chat', 'feline': 'Chat', 'canine': 'Chien', 'bird': 'Oiseau', 'bear': 'Ours', 'rabbit': 'Lapin', 'mouse': 'Souris',
  'rat': 'Rat', 'pig': 'Cochon', 'frog': 'Grenouille', 'toad': 'Grenouille', 'snake': 'Serpent', 'spider': 'Araignée', 'fish': 'Poisson',
  'turtles': 'Tortue', 'koopa troopa': 'Koopa', 'ape': 'Singe', 'gorilla': 'Singe', 'chimpanzee': 'Singe', 'horse': 'Cheval',
  'penguin': 'Manchot', 'owl': 'Hibou', 'duck': 'Canard', 'chicken': 'Poule', 'cow': 'Vache', 'goat': 'Chèvre', 'sheep': 'Mouton',
  'deer': 'Cerf', 'lizardfolk': 'Lézard', 'plant': 'Plante', 'mushroom': 'Champignon', 'slime': 'Slime', 'golem': 'Golem',
  'clone': 'Clone', 'mutant': 'Mutant', 'vampire': 'Vampire', 'dragon': 'Dragon', 'fairy': 'Fée', 'ghoul': 'Goule', 'undead': 'Mort-vivant',
  'dinosaur': 'Dinosaure', 'dinosaurs': 'Dinosaure', 'hylian': 'Hylien', 'hylians': 'Hylien', 'demi-god': 'Demi-dieu', 'demigoddess': 'Demi-dieu',
  'half-human': 'Demi-humain', 'demi-human': 'Demi-humain', 'faun': 'Faune', 'minotaur': 'Minotaure', 'kangaroo': 'Kangourou',
  'maine coon cat': 'Chat', 'horseshoe crab': 'Limule', 'sea anemone': 'Anémone de mer', 'necromancer': 'Humain', 'fev mutant': 'Mutant',
  'super mutant': 'Mutant', 'posthuman cybernetic fev mutant': 'Mutant', 'living jar': 'Objet', 'weapon': 'Objet',
  'edenian': 'Édénien', 'saurian': 'Saurien', 'potoroo': 'Marsupial', 'bandicoot': 'Bandicoot',
  'cryomancer': 'Humain', 'pyromancer': 'Humain', 'human (formerly)': 'Humain', 'synth': 'Synthétique', 'replicant': 'Réplicant',
  'robotic': 'Robot', 'mech': 'Robot', 'cat-like': 'Chat', 'dog-like': 'Chien', 'squid': 'Calmar', 'kitsune': 'Yōkai', 'oni': 'Yōkai',
  'tengu': 'Yōkai', 'youkai': 'Yōkai', 'yokai': 'Yōkai', 'magician': 'Humain', 'shapeshifter': 'Métamorphe', 'chimera': 'Chimère',
  'mermaid': 'Sirène', 'merfolk': 'Sirène', 'lich': 'Liche', 'wraith': 'Spectre', 'specter': 'Spectre', 'spectre': 'Spectre',
  'doll': 'Poupée', 'puppet': 'Poupée', 'animatronic': 'Animatronique', 'scarecrow': 'Épouvantail', 'snowman': 'Bonhomme de neige',
  // Pas des espèces : on passe à la classe suivante
  'deutéragoniste': null, 'mascotte': null, 'roi': null, 'idole virtuelle': null, 'transgender person': null, 'persona': null,
  'organisme': null, 'créature surnaturelle': null, 'ennemis récurrents de the legend of zelda': null,
  'mk. ii mobile robotic versatile entity automated assistant': 'Robot', 'unique organic supercomputer': 'IA',
  'unknown': null, 'dinosaur unknown': 'Dinosaure', 'red xiii\'s species': null, 'various': null, '1': null,
}

// « hérisson de fiction », « anthropomorphic hedgehog », « fée dans une œuvre de fiction », « humain de Donjons et Dragons »
const SPECIES_QUALIFIERS = /\s*\b(?:de fiction|fictif|fictive|fictionnelle?|dans une œuvre de fiction|in a work of fiction|dans l'univers de harry potter|dans la littérature fantasy et le jeu de rôle|de donjons et dragons)$|^fictional\s+|^anthropomorphi(?:c|que)\s+|\s+anthropomorphiques?$|\s+anthropomorphes?$/g

export function translateSpecies(label: string): string | null | undefined {
  // « •Human » : sans la puce
  let name = key(label).replace(/^[\s・*•·-]+/, '')
  for (let previous = ''; previous !== name;) {
    previous = name
    name = name.replace(SPECIES_QUALIFIERS, '').trim()
  }
  if (name in SPECIES)
    return SPECIES[name]
  // Les peuples d'une franchise déjà bien écrits (Hylien, Koopa, Zerg, Asari) : gardés tels quels
  return /^\p{Lu}/u.test(label) ? label : undefined
}

// --- Nationalité ---

// Les pays historiques ramenés au pays d'aujourd'hui, et les noms anglais des pays de fiction
const NATIONALITIES: Record<string, string> = {
  'république populaire de chine': 'Chine', 'empire russe': 'Russie', 'union soviétique': 'URSS', 'royaume de grande-bretagne': 'Royaume-Uni',
  'empire britannique': 'Royaume-Uni', "royaume d'angleterre": 'Royaume-Uni', 'royaume de france': 'France', 'nouvelle-france': 'France',
  'royaume de hongrie': 'Hongrie', 'principauté de valachie': 'Roumanie', 'principauté de transylvanie': 'Roumanie',
  'royaume ptolémaïque': 'Égypte', 'empire achéménide': 'Perse', 'sparte': 'Grèce', 'république florentine': 'Italie',
  'royaume de norvège (872-1397)': 'Norvège', 'troisième reich': 'Allemagne', 'lombax kingdom': 'Royaume lombax',
  'metro kingdom': 'Royaume Métro', 'mushroom kingdom': 'Royaume Champignon', 'écosse': 'Royaume-Uni', 'pays de galles': 'Royaume-Uni',
  'angleterre': 'Royaume-Uni', 'irlande du nord': 'Royaume-Uni', 'royaume-uni de grande-bretagne et d\'irlande': 'Royaume-Uni',
  // En anglais, depuis les infobox des wikis : le pays ou l'adjectif
  'united states': 'États-Unis', 'united states of america': 'États-Unis', 'usa': 'États-Unis', 'us': 'États-Unis', 'america': 'États-Unis',
  'american': 'États-Unis', 'japan': 'Japon', 'japanese': 'Japon', 'united kingdom': 'Royaume-Uni', 'uk': 'Royaume-Uni', 'england': 'Royaume-Uni',
  'english': 'Royaume-Uni', 'british': 'Royaume-Uni', 'great britain': 'Royaume-Uni', 'britain': 'Royaume-Uni', 'scotland': 'Royaume-Uni',
  'scottish': 'Royaume-Uni', 'wales': 'Royaume-Uni', 'welsh': 'Royaume-Uni', 'french': 'France', 'germany': 'Allemagne', 'german': 'Allemagne',
  'russia': 'Russie', 'russian': 'Russie', 'soviet union': 'URSS', 'ussr': 'URSS', 'china': 'Chine', 'chinese': 'Chine', 'italy': 'Italie',
  'italian': 'Italie', 'spain': 'Espagne', 'spanish': 'Espagne', 'mexico': 'Mexique', 'mexican': 'Mexique', 'brazil': 'Brésil',
  'brazilian': 'Brésil', 'canadian': 'Canada', 'australia': 'Australie', 'australian': 'Australie', 'south korea': 'Corée du Sud',
  'korea': 'Corée du Sud', 'korean': 'Corée du Sud', 'south korean': 'Corée du Sud', 'india': 'Inde', 'indian': 'Inde', 'ireland': 'Irlande',
  'irish': 'Irlande', 'sweden': 'Suède', 'swedish': 'Suède', 'norway': 'Norvège', 'norwegian': 'Norvège', 'egypt': 'Égypte', 'egyptian': 'Égypte',
  'greece': 'Grèce', 'greek': 'Grèce', 'poland': 'Pologne', 'polish': 'Pologne', 'netherlands': 'Pays-Bas', 'dutch': 'Pays-Bas',
  'thailand': 'Thaïlande', 'thai': 'Thaïlande', 'turkey': 'Turquie', 'turkish': 'Turquie', 'argentina': 'Argentine', 'cuba': 'Cuba',
  'cuban': 'Cuba', 'nigeria': 'Nigeria', 'kenya': 'Kenya', 'south africa': 'Afrique du Sud', 'israel': 'Israël', 'iran': 'Iran',
  'iraq': 'Irak', 'afghanistan': 'Afghanistan', 'pakistan': 'Pakistan', 'vietnam': 'Viêt Nam', 'philippines': 'Philippines',
  'czech republic': 'Tchéquie', 'bohemia': 'Tchéquie', 'hungary': 'Hongrie', 'romania': 'Roumanie', 'switzerland': 'Suisse',
  'austria': 'Autriche', 'portugal': 'Portugal', 'finland': 'Finlande', 'denmark': 'Danemark', 'belgium': 'Belgique', 'colombia': 'Colombie',
  'peru': 'Pérou', 'chile': 'Chili', 'jamaica': 'Jamaïque', 'mongolia': 'Mongolie', 'saudi arabia': 'Arabie saoudite',
  'swiss': 'Suisse', 'austrian': 'Autriche', 'portuguese': 'Portugal', 'finnish': 'Finlande', 'appears finnish': 'Finlande',
  'danish': 'Danemark', 'belgian': 'Belgique', 'colombian': 'Colombie', 'peruvian': 'Pérou', 'chilean': 'Chili',
  'jamaican': 'Jamaïque', 'mongolian': 'Mongolie', 'saudi': 'Arabie saoudite', 'nigerian': 'Nigeria', 'kenyan': 'Kenya',
  'south african': 'Afrique du Sud', 'israeli': 'Israël', 'iranian': 'Iran', 'persian': 'Perse', 'persia': 'Perse',
  'iraqi': 'Irak', 'afghan': 'Afghanistan', 'pakistani': 'Pakistan', 'vietnamese': 'Viêt Nam', 'filipino': 'Philippines',
  'czech': 'Tchéquie', 'bohemian': 'Tchéquie', 'hungarian': 'Hongrie', 'romanian': 'Roumanie', 'transylvania': 'Roumanie',
  'serbia': 'Serbie', 'serbian': 'Serbie', 'croatia': 'Croatie', 'croatian': 'Croatie', 'ukraine': 'Ukraine', 'ukrainian': 'Ukraine',
  'soviet': 'URSS', 'argentinian': 'Argentine', 'argentine': 'Argentine', 'venezuela': 'Venezuela', 'venezuelan': 'Venezuela',
  'haiti': 'Haïti', 'haitian': 'Haïti', 'dominican republic': 'République dominicaine', 'dominican': 'République dominicaine',
  'ghana': 'Ghana', 'ghanaian': 'Ghana', 'monaco': 'Monaco', 'monegasque': 'Monaco', 'new zealand': 'Nouvelle-Zélande',
  'new zealander': 'Nouvelle-Zélande', 'canada': 'Canada', 'france': 'France', 'scottish highlands': 'Royaume-Uni',
  'medieval germany': 'Allemagne', 'russian-american': 'Russie', 'icelandic': 'Islande', 'iceland': 'Islande',
  'singapore': 'Singapour', 'indonesia': 'Indonésie', 'indonesian': 'Indonésie', 'malaysia': 'Malaisie', 'taiwan': 'Taïwan',
  'taiwanese': 'Taïwan', 'hong kong': 'Chine', 'mexican-american': 'États-Unis', 'japanese-american': 'États-Unis',
  'african-american': 'États-Unis', 'native american': 'États-Unis', 'lebanese': 'Liban', 'syrian': 'Syrie', 'turkish cypriot': 'Turquie',
  'norse': 'Norvège', 'spartan': 'Grèce', 'roman': 'Italie', 'ancient egypt': 'Égypte', 'ancient greece': 'Grèce',
  // Les planètes de notre système, en français
  'earth': 'Terre', 'earthling': 'Terre', 'terran': 'Terre', 'mars': 'Mars', 'martian': 'Mars', 'luna': 'Lune', 'moon': 'Lune',
  'the moon': 'Lune',
}

// Les villes, régions et états réels, ramenés à leur pays. Les lieux de fiction (Night City, Hyrule) n'y sont pas :
// ils sont gardés tels quels.
const CITIES: Record<string, string> = {
  // États-Unis
  'new york': 'États-Unis', 'new york city': 'États-Unis', 'nyc': 'États-Unis', 'manhattan': 'États-Unis', 'brooklyn': 'États-Unis',
  'the bronx': 'États-Unis', 'bronx': 'États-Unis', 'queens': 'États-Unis', 'harlem': 'États-Unis', 'los angeles': 'États-Unis',
  'san francisco': 'États-Unis', 'san diego': 'États-Unis', 'chicago': 'États-Unis', 'boston': 'États-Unis', 'seattle': 'États-Unis',
  'miami': 'États-Unis', 'detroit': 'États-Unis', 'las vegas': 'États-Unis', 'new orleans': 'États-Unis', 'houston': 'États-Unis',
  'dallas': 'États-Unis', 'austin': 'États-Unis', 'atlanta': 'États-Unis', 'philadelphia': 'États-Unis', 'washington': 'États-Unis',
  'washington, d.c.': 'États-Unis', 'washington d.c.': 'États-Unis', 'denver': 'États-Unis', 'phoenix': 'États-Unis',
  'portland': 'États-Unis', 'baltimore': 'États-Unis', 'pittsburgh': 'États-Unis', 'cleveland': 'États-Unis', 'memphis': 'États-Unis',
  'nashville': 'États-Unis', 'honolulu': 'États-Unis', 'anchorage': 'États-Unis', 'salt lake city': 'États-Unis', 'hollywood': 'États-Unis',
  'jackson': 'États-Unis', 'kansas city': 'États-Unis', 'st. louis': 'États-Unis', 'minneapolis': 'États-Unis', 'milwaukee': 'États-Unis',
  'california': 'États-Unis', 'texas': 'États-Unis', 'florida': 'États-Unis', 'alaska': 'États-Unis', 'hawaii': 'États-Unis',
  'nevada': 'États-Unis', 'arizona': 'États-Unis', 'colorado': 'États-Unis', 'oregon': 'États-Unis', 'montana': 'États-Unis',
  'wyoming': 'États-Unis', 'utah': 'États-Unis', 'new mexico': 'États-Unis', 'oklahoma': 'États-Unis', 'kansas': 'États-Unis',
  'nebraska': 'États-Unis', 'iowa': 'États-Unis', 'missouri': 'États-Unis', 'illinois': 'États-Unis', 'ohio': 'États-Unis',
  'michigan': 'États-Unis', 'wisconsin': 'États-Unis', 'minnesota': 'États-Unis', 'georgia': 'États-Unis', 'louisiana': 'États-Unis',
  'mississippi': 'États-Unis', 'alabama': 'États-Unis', 'tennessee': 'États-Unis', 'kentucky': 'États-Unis', 'virginia': 'États-Unis',
  'west virginia': 'États-Unis', 'pennsylvania': 'États-Unis', 'new jersey': 'États-Unis', 'massachusetts': 'États-Unis',
  'maine': 'États-Unis', 'vermont': 'États-Unis', 'connecticut': 'États-Unis', 'maryland': 'États-Unis', 'carolina': 'États-Unis',
  'north carolina': 'États-Unis', 'south carolina': 'États-Unis', 'indiana': 'États-Unis', 'idaho': 'États-Unis',
  'appalachia': 'États-Unis', 'mojave desert': 'États-Unis', 'mojave wasteland': 'États-Unis', 'capital wasteland': 'États-Unis',
  'commonwealth': 'États-Unis', 'new vegas': 'États-Unis', 'midwest': 'États-Unis', 'bee cave': 'États-Unis', 'college station': 'États-Unis',
  'cheyenne': 'États-Unis', 'topeka': 'États-Unis', 'savannah': 'États-Unis', 'wa': 'États-Unis',
  // Royaume-Uni, Irlande
  'london': 'Royaume-Uni', 'manchester': 'Royaume-Uni', 'liverpool': 'Royaume-Uni', 'birmingham': 'Royaume-Uni', 'oxford': 'Royaume-Uni',
  'cambridge': 'Royaume-Uni', 'bristol': 'Royaume-Uni', 'leeds': 'Royaume-Uni', 'sheffield': 'Royaume-Uni', 'edinburgh': 'Royaume-Uni',
  'glasgow': 'Royaume-Uni', 'cardiff': 'Royaume-Uni', 'belfast': 'Royaume-Uni', 'yorkshire': 'Royaume-Uni', 'cornwall': 'Royaume-Uni',
  'kent': 'Royaume-Uni', 'surrey': 'Royaume-Uni', 'devon': 'Royaume-Uni', 'whitechapel': 'Royaume-Uni', 'hogsmeade': 'Royaume-Uni',
  'godric\'s hollow': 'Royaume-Uni', 'little whinging': 'Royaume-Uni', 'dublin': 'Irlande',
  // Europe
  'paris': 'France', 'marseille': 'France', 'lyon': 'France', 'bordeaux': 'France', 'normandy': 'France', 'brittany': 'France',
  'berlin': 'Allemagne', 'munich': 'Allemagne', 'hamburg': 'Allemagne', 'hanover': 'Allemagne', 'frankfurt': 'Allemagne',
  'cologne': 'Allemagne', 'bavaria': 'Allemagne', 'rome': 'Italie', 'milan': 'Italie', 'venice': 'Italie', 'florence': 'Italie',
  'naples': 'Italie', 'sicily': 'Italie', 'tuscany': 'Italie', 'madrid': 'Espagne', 'barcelona': 'Espagne', 'seville': 'Espagne',
  'lisbon': 'Portugal', 'amsterdam': 'Pays-Bas', 'brussels': 'Belgique', 'vienna': 'Autriche', 'zurich': 'Suisse', 'geneva': 'Suisse',
  'prague': 'Tchéquie', 'kutná hora': 'Tchéquie', 'skalitz': 'Tchéquie', 'rattay': 'Tchéquie', 'suchdol': 'Tchéquie',
  'budapest': 'Hongrie', 'warsaw': 'Pologne', 'krakow': 'Pologne', 'bucharest': 'Roumanie', 'athens': 'Grèce', 'sparta': 'Grèce',
  'stockholm': 'Suède', 'oslo': 'Norvège', 'copenhagen': 'Danemark', 'helsinki': 'Finlande', 'reykjavik': 'Islande',
  'moscow': 'Russie', 'saint petersburg': 'Russie', 'st. petersburg': 'Russie', 'siberia': 'Russie', 'kyiv': 'Ukraine', 'kiev': 'Ukraine',
  'chernobyl': 'Ukraine', 'pripyat': 'Ukraine', 'sumy oblast': 'Ukraine', 'yabluchne': 'Ukraine',
  'dzhugdzhur': 'Russie', 'east siberian mountains': 'Russie', 'ullapool': 'Royaume-Uni', 'belgrade': 'Serbie', 'istanbul': 'Turquie', 'constantinople': 'Turquie',
  // Asie
  'tokyo': 'Japon', 'shibuya': 'Japon', 'shinjuku': 'Japon', 'kamurocho': 'Japon', 'kamurochō': 'Japon', 'sotenbori': 'Japon',
  'kyoto': 'Japon', 'osaka': 'Japon', 'yokohama': 'Japon', 'kobe': 'Japon', 'nagoya': 'Japon', 'hiroshima': 'Japon',
  'okinawa': 'Japon', 'hokkaido': 'Japon', 'sapporo': 'Japon', 'fukuoka': 'Japon', 'kanagawa': 'Japon', 'kanagawa prefecture': 'Japon', 'inaba': 'Japon',
  'edo': 'Japon', 'tsushima': 'Japon', 'beijing': 'Chine', 'peking': 'Chine', 'shanghai': 'Chine', 'macau': 'Chine',
  'seoul': 'Corée du Sud', 'busan': 'Corée du Sud', 'bangkok': 'Thaïlande', 'lampang': 'Thaïlande', 'mumbai': 'Inde',
  'delhi': 'Inde', 'new delhi': 'Inde', 'calcutta': 'Inde', 'kolkata': 'Inde', 'manila': 'Philippines', 'masbate': 'Philippines', 'hanoi': 'Viêt Nam',
  'saigon': 'Viêt Nam', 'singapore': 'Singapour', 'jakarta': 'Indonésie', 'tehran': 'Iran', 'baghdad': 'Irak', 'kabul': 'Afghanistan',
  'jerusalem': 'Israël', 'tel aviv': 'Israël', 'dubai': 'Émirats arabes unis', 'riyadh': 'Arabie saoudite', 'ulaanbaatar': 'Mongolie',
  // Amériques, Afrique, Océanie
  'toronto': 'Canada', 'montreal': 'Canada', 'montréal': 'Canada', 'vancouver': 'Canada', 'quebec': 'Canada', 'québec': 'Canada',
  'ontario': 'Canada', 'mexico city': 'Mexique', 'havana': 'Cuba', 'santo domingo': 'République dominicaine', 'kingston': 'Jamaïque',
  'rio de janeiro': 'Brésil', 'são paulo': 'Brésil', 'sao paulo': 'Brésil', 'buenos aires': 'Argentine', 'bogotá': 'Colombie',
  'bogota': 'Colombie', 'lima': 'Pérou', 'caracas': 'Venezuela', 'cairo': 'Égypte', 'alexandria': 'Égypte', 'lagos': 'Nigeria',
  'nairobi': 'Kenya', 'johannesburg': 'Afrique du Sud', 'cape town': 'Afrique du Sud', 'accra': 'Ghana', 'sydney': 'Australie',
  'melbourne': 'Australie', 'brisbane': 'Australie', 'perth': 'Australie', 'auckland': 'Nouvelle-Zélande',
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

// Les pays d'histoire et les écritures des infobox qui manquent à NATIONALITIES
const HISTORIC_COUNTRIES: Record<string, string> = {
  'russian empire': 'Russie', 'people\'s republic of china': 'Chine', 'ming empire': 'Chine', 'ukrainian soviet socialist republic': 'Ukraine',
  'belorussian ssr': 'Biélorussie', 'soviet russian': 'URSS', 'royaume des pays-bas': 'Pays-Bas', 'liberia': 'Liberia', 'liberian': 'Liberia',
  'république fédérative socialiste de yougoslavie': 'Yougoslavie', 'byzantine': 'Empire byzantin',
  'u.s': 'États-Unis', 'englander': 'Royaume-Uni', 'greenlander': 'Groenland', 'prussian': 'Allemagne', 'imperial german': 'Allemagne',
  'rhenish': 'Allemagne', 'british south african': 'Afrique du Sud', 'minoan': 'Grèce', 'bc': 'Canada', 'polynesian': 'Polynésie',
}

// Les écritures d'une même ville réelle, ramenées à une seule pour que les personnages se croisent
const CITY_NAMES: Record<string, string> = {
  'nyc': 'New York', 'new york city': 'New York', 'washington, d.c.': 'Washington', 'washington d.c.': 'Washington',
  'kamurochō': 'Kamurocho', 'peking': 'Beijing', 'kiev': 'Kyiv', 'st. petersburg': 'Saint Petersburg', 'montréal': 'Montreal',
  'québec': 'Quebec', 'são paulo': 'Sao Paulo', 'bogotá': 'Bogota', 'the bronx': 'Bronx',
}

// Les autres écritures d'un lieu de fiction (gentilé, nom long) ramenées à une seule, pour croiser avec les personnages
// qui donnent le lieu
const PLACE_NAMES: Record<string, string> = {
  'mount olympus': 'Olympus', 'k. rool\'s mobile island fortress': 'Mobile Island Fortress', 'castle of talmberg': 'Talmberg',
  'mare erythraeum': 'Mars',
  // Les gentilés
  'deponian': 'Deponia', 'elysian': 'Elysium', 'adrestian': 'Adrestian Empire', 'plegian': 'Plegia', 'columbian': 'Columbia',
  'vigoorian': 'Holy Vigoor Empire', 'numbanian': 'Numbani', 'rook islander': 'Rook Islands',
}

// Ce que les wikis rangent dans les champs « pays » ou « lieu » sans que ce soit un lieu : entreprises, jeux, groupes
const NOT_PLACES = new Set([
  'cyberlife', 'dr1', 'dr2', 'the world ends with you', 'celts', 'inc.', 'inc', 'possibly', 'ordinary', 'future', 'd.c',
])
// Pas un lieu : un âge, une mythologie, un endroit sans nom (« His keep », « Any place related to the Kremling Krew »),
// une lettre seule. Ni le logement d'un personnage, qui ne se croise avec personne (« 1276 Fig Leaf Lane », « Jackie's
// Garage », « Delamain Corp HQ ») : les champs « residence » en sont pleins.
const NOT_PLACE = /years old|mythology|^(?:his|her|their|my|any|unknown|various|several)\b|^(?:hideout|safehouse|ranch|backyard|home|house|castle|village)$|^[^\p{L}]*$|^\p{L}$|^\d|\b(?:apartments?|house|home|garage|office|hq|mansion|hovel|hideout|lab|cabin|club|restaurante?|saloon|facility|warship|corp|inc)$/u

// « Likely Japan », « Created on Zebes », « Town of Onett », « Country of Eagleland » : le lieu seul
const PLACE_PREFIX = /^(?:(?:likely|possibly|probably|presumably|formerly|originally|created (?:on|in)|raised (?:on|in)|born (?:on|in))\s+|(?:the\s+)?(?:island country|country|town|city|region|province|village) of\s+)/i

// Les lieux qu'on tire d'un nom, pour donner un max d'indices : un pays en français (« American » → États-Unis), une
// ville ou une région réelle avec son pays (Seattle → Seattle, États-Unis), le lieu d'un gentilé (Deponian → Deponia),
// un lieu de fiction tel quel. [] : pas un lieu.
export function translatePlace(label: string): string[] {
  // Les caractères invisibles des drapeaux emoji (« 󠁧󠁢󠁳 Scottish »)
  const clean = label.replace(/[\u{E0000}-\u{E007F}\p{Extended_Pictographic}]/gu, '').trim().replace(PLACE_PREFIX, '').replace(/[.\s]+$/, '')
  const name = key(clean).replace(/^the\s+/, '')
  if (NOT_PLACES.has(name) || NOT_PLACE.test(name))
    return []
  const country = NATIONALITIES[key(clean)] ?? NATIONALITIES[name] ?? HISTORIC_COUNTRIES[name]
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

// --- Occupation ---

// Déjà passée en français et au masculin par wikidataOccupation (« Pratiquant d'arts martiaux »). null : retirée.
const OCCUPATION_RULES: [RegExp, string | null][] = [
  // Les cas qui contiennent un mot d'une autre famille
  [/military impostor/, null],
  [/patron de bar/, 'Serveur'],
  [/agent de sécurité|garde du corps|garde royale|videur|tower guard|sentinel|gatekeeper|^gardien$|directeur de prison/, 'Garde'],
  [/agent immobilier/, 'Commerçant'],
  [/directeur d'école|professeur|enseignant|instituteur|mentor|instructeur|chargé de cours|doyen|entraîneur/, 'Professeur'],
  [/étudiant en médecine|médecin|chirurgien|infirmi|aide-soignant|psychiatre|guérisseur|personnel médical|intervenant d'urgence|sauveteur/, 'Médecin'],
  [/joueur professionnel de jeux vidéo|^gamer$/, 'Gamer'],
  [/développeur de jeux vidéo|testeur de jeux|programmeur|ingénieur logiciel|hacker/, 'Informaticien'],
  [/pirate de l'air|criminel de guerre/, 'Criminel'],
  [/voyageur dans le temps|dimension traveler/, 'Voyageur temporel'],
  [/dresseur pokémon|champion d'arène|pokémon coordinator/, 'Dresseur'],
  [/chasseur de primes|^fixeur$/, 'Chasseur de primes'],
  [/chasseur de (?:vampires?|démons?|monstres?|zombies?)|dragonslayer|witcher|exorciste/, 'Chasseur de monstres'],
  [/chasseur de trésor|vault hunter|prospecteur/, 'Chasseur de trésor'],
  [/^chasseur$/, 'Chasseur'],
  // Crime
  [/tueur à gages|assassin/, 'Assassin'],
  [/tueur|meurtrier/, 'Tueur'],
  [/voleur|braqueur|escroc|brigand|bandit|^rogue$/, 'Voleur'],
  [/pirate|corsaire/, 'Pirate'],
  [/gangster|chef de bande|yakuza|trafiquant|dealer|contrebandier|proxénète|usurier|hors-la-loi|criminel|conspirateur|incendiaire/, 'Criminel'],
  [/terroriste/, 'Terroriste'],
  [/mercenaire/, 'Mercenaire'],
  // Combat
  [/justicier|super-héros|crime ?fighter/, 'Justicier'],
  [/^hero$|antihéros/, 'Héros'],
  [/révolutionnaire|militant|partisan|chef rebelle|combattant pour la liberté|freedom fighter|défenseur des droits|propagandiste/, 'Révolutionnaire'],
  [/tireur|as de la gâchette/, 'Tireur d\'élite'],
  [/pilote|aviateur|mech pilot|spacecraft pilot/, 'Pilote'],
  [/espion|^agent|indicateur/, 'Espion'],
  [/soldat|militaire|military|espace marin|officier|commandant|chef militaire|seigneur de guerre|aide de camp|sapeur|écuyer/, 'Soldat'],
  [/arts martiaux|karatéka|nak muay|kick-boxeur|taekwondoïste|catcheur|wrestler|gladiateur|fighter|escrimeur|matador/, 'Combattant'],
  [/chevalier|paladin/, 'Chevalier'],
  [/samouraï|rōnin/, 'Samouraï'],
  [/épéiste/, 'Épéiste'],
  [/ninja|kunoichi/, 'Ninja'],
  [/\barcher|rôdeur/, 'Archer'],
  [/guerrier|barbare/, 'Guerrier'],
  // Magie, religion
  [/jedi/, 'Jedi'],
  [/magicien|wizard|sorci|sorcerer|warlock|archimage|nécromancien|druide|auror|féticheur|médium|hypnotiseur/, 'Magicien'],
  [/prêtre|clerc|moine|miko|gūji|chef religieux|gourou|prédicateur/, 'Religieux'],
  // Pouvoir
  [/\broi\b|\breine\b|souverain|monarque|empereur|impératrice|tyran|dictateur|chef d'état/, 'Souverain'],
  [/prince|famille royale|^lord$|héritière|vizir/, 'Noble'],
  [/chef de tribu|clan chief/, 'Chef de clan'],
  [/personnalité politique|président|maire|gouverneur|diplomate|délégué|personne d'état/, 'Politicien'],
  [/avocat|procureur|juge/, 'Avocat'],
  [/personnalité du monde des affaires|entrepreneur|investisseur|philanthrope|magnat|négociant|propriétaire|conseil d'administration/, 'Homme d\'affaires'],
  [/responsable|dirigeant|directeur|fondateur|patron|chef d'entreprise|manager/, 'Dirigeant'],
  [/conseiller|consultant|tacticien|adjoint|assistant/, 'Conseiller'],
  // Sciences
  [/archéologue/, 'Archéologue'],
  [/scientifique|chercheur|roboticien|ingénieur|inventeur|chimiste|physicien|généticien|virologue|toxicologue|biologiste|bioingénieur|botaniste|climatologue|cybernéticien|cybernétiste|technicien de laboratoire|magizoologist/, 'Scientifique'],
  [/historien|érudit|archiviste|penseur|philosophe/, 'Érudit'],
  [/détective|enquêteur|inspecteur/, 'Détective'],
  [/policier|police|shérif|deputy sheriff|proctor/, 'Policier'],
  // Aventure
  [/survivant/, 'Survivant'],
  [/explorateur|aventurier|voyageur|pionnier|ermite|musher/, 'Aventurier'],
  [/astronaute/, 'Astronaute'],
  [/\bmarin\b|capitaine de|membre d'équipage/, 'Marin'],
  // École, sport
  [/étudiant/, 'Étudiant'],
  [/lycéen|collégien|élève|écolier|preschool/, 'Élève'],
  [/footballeur|piqueuse|joueur|sportif|gymnaste|pom-pom|tennis|traceur|plongeur/, 'Sportif'],
  // Arts, médias
  [/chanteur|musicien|guitariste|bassiste|choriste|disc jockey|artiste lyrique|barde/, 'Musicien'],
  [/acteur|cinéaste|réalisateur|producteur|animateur de télévision/, 'Acteur'],
  [/journaliste|reporter|correspondant|rédacteur/, 'Journaliste'],
  [/auteur|écrivain/, 'Écrivain'],
  [/artiste|sculpteur|danseur|photographe|mannequin|mode|divertissement/, 'Artiste'],
  // Métiers
  [/plombier/, 'Plombier'],
  [/mécanicien/, 'Mécanicien'],
  [/cuisinier|boulanger/, 'Cuisinier'],
  [/serveur|employé de bar|patron de bar|bouteiller/, 'Serveur'],
  [/vendeur|commerçant|marchand|fleuriste/, 'Commerçant'],
  [/herboriste|agriculteur|vacher|jardinier|vigneron|plantation|cow-boy|pêcheur/, 'Fermier'],
  [/femme au foyer|domestique|femme de ménage|valet|nourrice|gardien d'enfants|majordome/, 'Domestique'],
  [/chauffeur|conducteur|coursier|livreur|charretier/, 'Chauffeur'],
  [/charpentier|forgeron|ouvrier|mineur|usineur|tapissier|modéliste|homme à tout faire|technicien de surface|janitor|travailleur|cireur/, 'Ouvrier'],
  [/salarié|employé|secrétaire|commis|bibliothécaire/, 'Employé'],
  [/guide/, 'Guide'],
  [/prostitué/, 'Prostitué'],
  [/pompes funèbres/, 'Croque-mort'],
  [/chômeur/, 'Chômeur'],
  [/retraité|pensionné/, 'Retraité'],
  [/prisonnier/, 'Prisonnier'],
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
  [/cheerleader/, 'Sportif'],
  [/gym leader|elite four|frontier brain|pokémon champion|pokemon champion|pokémon performer|trainer/, 'Dresseur'],
  [/advisor|adviser|vizier to/, 'Conseiller'],
  [/servant of/, 'Domestique'],
  [/waiter|waitress|hostess|bartender/, 'Serveur'],
  [/stage show|\bactor\b/, 'Acteur'],
  [/con-?artist|gunrunner/, 'Criminel'],
  [/freedom fighter/, 'Révolutionnaire'],
  [/crime ?fighter/, 'Justicier'],
  [/doctor of archaeology/, 'Archéologue'],
  [/doctor of philosophy/, 'Érudit'],
  [/purchasing agent|sales (?:agent|assistant)/, 'Commerçant'],
  [/\bmarines?\b/, 'Soldat'],
  [/law officer/, 'Policier'],
  [/\bruler\b/, 'Souverain'],
  [/fiend hunter/, 'Chasseur de monstres'],
  [/fortune hunter/, 'Chasseur de trésor'],
  [/student council|(?:elementary|middle|high) ?school student/, 'Élève'],
  [/head of hogwarts/, 'Professeur'],
  [/bodyguard|security|guard|bouncer|warden|gatekeeper|jailer|keeper of the keys|enforcer|sentry|sentinel/, 'Garde'],
  [/video game developer|game developer|hacker|programmer|software|ripperdoc|technician/, 'Informaticien'],
  [/bounty hunter|^fixer$/, 'Chasseur de primes'],
  [/dragon ?slayer|monster hunter|demon hunter|vampire hunter|witcher/, 'Chasseur de monstres'],
  [/treasure|salvager|prospector/, 'Chasseur de trésor'],
  [/gamekeeper|^hunter$|^huntress$/, 'Chasseur'],
  [/head of (?:\w+ )?house|head of transfiguration|potions master|professor|teacher|mentor|instructor|^dean\b|headmaster|headmistress/, 'Professeur'],
  [/doctor|physician|surgeon|nurse|medic\b|first responder|paramedic|healer|caregiver/, 'Médecin'],
  [/streamer|influencer|youtuber/, 'Artiste'],
  // Crime
  [/assassin|hitman|contract killer/, 'Assassin'],
  [/serial killer|murderer|killer/, 'Tueur'],
  [/thief|burglar|robber|pickpocket|fence|swindler|con artist|fraud/, 'Voleur'],
  [/pirate|smuggler/, 'Pirate'],
  [/terrorist|anarchist|insurgent/, 'Terroriste'],
  [/gangster|mobster|crime (?:lord|boss)|criminal|outlaw|drug|racketeer|henchman|thug|gang|yakuza|mafia|patriarch|chairman of the tojo|fugitive|convict|bandit|rocket boss|super-?villain|villain/, 'Criminel'],
  [/mercenar/, 'Mercenaire'],
  // Combat
  [/vigilante|superhero|super-hero|crime ?fighter/, 'Justicier'],
  [/^hero$|^heroine$/, 'Héros'],
  [/revolutionar|rebel|resistance|freedom fighter|activist|liberat|guerrilla|subversive/, 'Révolutionnaire'],
  [/sniper|marksman|gunslinger/, 'Tireur d\'élite'],
  [/pilot|aviator/, 'Pilote'],
  [/sailor|navigator|boat captain|seaman|lord admiral/, 'Marin'],
  [/\bspy\b|^agent|operative|informant|interrogator|mi6/, 'Espion'],
  [/soldier|army|navy|marine|military|commander|^general$|general of|admiral|captain|corporal|sergeant|lieutenant|colonel|major|officer|warlord|warmonger|seals|s\.t\.a\.r\.s|u\.b\.c\.s|bsaa|tekken force|squire|serviceman/, 'Soldat'],
  [/martial artist|fighter|boxer|wrestler|luchador|gladiator|brawler|karate|kung fu|thunderdome/, 'Combattant'],
  [/knight|paladin|templar/, 'Chevalier'],
  [/samurai|ronin/, 'Samouraï'],
  [/swordsman|swordswoman|swordmaster|blademaster/, 'Épéiste'],
  [/ninja|shinobi|kunoichi/, 'Ninja'],
  [/\barcher|\branger/, 'Archer'],
  [/warrior|barbarian|berserker/, 'Guerrier'],
  // Magie, religion
  [/jedi/, 'Jedi'],
  [/archmage|\bmage\b|wizard|witch|sorcer|warlock|necromancer|druid|shaman|summoner|abjurer|transmuter|diviner|enchant|conjur|alchemist|auror|medium|magician/, 'Magicien'],
  [/priest|cleric|monk|\bnun\b|clergy|bishop|archbishop|preacher|religious|cult leader|shrine|tekken grand high/, 'Religieux'],
  // Pouvoir
  [/\bking\b|\bqueen\b|emperor|empress|monarch|sultan|pharaoh|exalt|head of state|tyrant|dictator|maharajah/, 'Souverain'],
  [/prince|princess|duke|duchess|count\b|countess|marquess|^baron|lord|lady|noble|royal|socialite|sheikh/, 'Noble'],
  [/chieftain|warchief|chief of the|clan|tribe/, 'Chef de clan'],
  [/politician|president|mayor|governor|minister|senator|ambassador|diplomat|head of government|government|bailiff|vizier/, 'Politicien'],
  [/lawyer|attorney|prosecutor|judge/, 'Avocat'],
  [/ceo\b|chief executive|business|entrepreneur|investor|industrialist|tycoon|magnate|philanthropist|baron|exporter|real estate|charity/, 'Homme d\'affaires'],
  [/leader|head of|director|executive|founder|manager|boss|overseer|matron|ringmaster|chairman|supervisor/, 'Dirigeant'],
  [/advisor|adviser|tactician|second-in-command|consultant|assistant|protégé|associate/, 'Conseiller'],
  // Sciences
  [/archaeologist|anthropologist/, 'Archéologue'],
  [/scientist|researcher|engineer|inventor|chemist|physicist|geneticist|biologist|cryogenicist|brain data|research/, 'Scientifique'],
  [/scholar|historian|philosopher|librarian|archivist|translator/, 'Érudit'],
  [/detective|investigator|inspector/, 'Détective'],
  [/police|cop\b|sheriff|deputy|patrolman|constable/, 'Policier'],
  // Aventure
  [/survivor/, 'Survivant'],
  [/explorer|adventurer|traveler|traveller|wanderer|rescues lost/, 'Aventurier'],
  [/astronaut|cosmonaut/, 'Astronaute'],
  // École, sport
  [/student|pupil/, 'Étudiant'],
  [/athlete|player|racer|racing|apex games|scout leader|yoga/, 'Sportif'],
  // Arts, médias
  [/singer|songstress|musician|guitarist|drummer|\bdj\b|rock ?star|punk|rocker|bard|idol/, 'Musicien'],
  [/actor|actress|filmmaker|director of films|tv personality|entertainer|performer|harlequin|clown|stage show/, 'Acteur'],
  [/journalist|reporter|correspondent|columnist|interviewer|editor/, 'Journaliste'],
  [/writer|author|novelist|poet/, 'Écrivain'],
  [/photographer|artist|painter|sculptor|dancer|ballet|model\b|designer/, 'Artiste'],
  // Métiers
  [/plumber/, 'Plombier'],
  [/mechanic/, 'Mécanicien'],
  [/^chef$|\bcook\b|baker|brewer|restaura|yakitori|confection/, 'Cuisinier'],
  [/bartender|barmaid|waiter|waitress|dishwasher/, 'Serveur'],
  [/merchant|vendor|shopkeeper|trader|seller|store|shop|florist|haberdasher|milliner/, 'Commerçant'],
  [/farmer|farmhand|rancher|ranch hand|gardener|fisherman|cowboy|herbalist/, 'Fermier'],
  [/maid|butler|servant|housekeeper|house-elf|valet|nanny|house cleaning|cleaner|caretaker/, 'Domestique'],
  [/driver|chauffeur|courier|delivery|conductor|mover/, 'Chauffeur'],
  [/miner|blacksmith|carpenter|craftsman|artisan|builder|construction|handyman|laborer|labourer|worker|odd job|janitor|part-time/, 'Ouvrier'],
  [/clerk|secretary|employee|office worker|receptionist/, 'Employé'],
  [/guide/, 'Guide'],
  [/prostitute|courtesan|escort/, 'Prostitué'],
  [/unemployed/, 'Chômeur'],
  [/retired/, 'Retraité'],
  [/prisoner|inmate/, 'Prisonnier'],
  // Les traductions du dictionnaire du Weebdle hors de nos familles
  [/^leader$|^gérant$|^chef$/, 'Dirigeant'],
  [/^mage$|^sorcier$|^sorcière$/, 'Magicien'],
  [/^mafieux$/, 'Criminel'],
  [/^actrice$/, 'Acteur'],
  [/^serveuse$/, 'Serveur'],
  [/^serviteur$|^servante$|^majordome$/, 'Domestique'],
  [/^capitaine$/, 'Soldat'],
  [/^célébrité$/, 'Artiste'],
  [/^idole$/, 'Musicien'],
  [/^navigateur$/, 'Marin'],
]

// L'occupation exacte (clés en minuscules, sans puces), avant les règles : les valeurs des infobox qu'aucune règle
// ne range, ou mal. null : pas une occupation, on la retire.
const OCCUPATIONS: Record<string, string | null> = {
  // Artisans
  'weaponsmith': 'Ouvrier', 'armorer': 'Ouvrier', 'bronzecaster': 'Ouvrier', 'glassblower': 'Ouvrier', 'cobbler': 'Ouvrier',
  'forger': 'Ouvrier', 'logger': 'Ouvrier', 'mining expert': 'Ouvrier', 'foreman of gecko': 'Ouvrier', 'custodian': 'Ouvrier',
  'maintenance android': 'Mécanicien',
  // Death Stranding : les porteurs livrent
  'porter': 'Chauffeur', 'porter in training': 'Chauffeur',
  // Commerce, service
  'barista': 'Serveur', 'alewife': 'Serveur', 'works at maxine\'s diner': 'Serveur', 'proprietor': 'Commerçant',
  'proprieter of the mikaelsen ranch': 'Fermier', 'bookeeper at wren\'s nook': 'Employé',
  'financial backer of hiram burrows': 'Homme d\'affaires', 'managing of the new vegas strip': 'Dirigeant',
  // Chasse
  'trapper': 'Chasseur', '3rd tier tracker': 'Chasseur', 'vampire huntress': 'Chasseur de monstres', 'banisher': 'Chasseur de monstres',
  // Armée, police
  'albion operations tactical adjutant': 'Soldat', 'demolitions expert': 'Soldat', 'executor of the koprulu expedition': 'Soldat',
  'legionnaire': 'Soldat', 'recon trooper': 'Soldat', 'recruit': 'Soldat', 'the last minuteman': 'Soldat',
  'trainee at rockfort island': 'Soldat', 'usstratcom\'s anti-umbrella pursuit': 'Soldat', 'yorha tactical support unit': 'Soldat',
  'confederate marshal': 'Policier', 'marshal': 'Policier', 'swat specialist': 'Policier', 'watchman of the aesir': 'Garde',
  // Combat
  'blade of miquella': 'Guerrier', 'champion of the aesir': 'Guerrier', 'east-khan champion': 'Combattant',
  'west-khan champion': 'Combattant', 'competitor': 'Combattant', 'chosen of sylvarant': 'Héros',
  // Crime
  'blackmailer': 'Criminel', 'loyalist conspirator': 'Criminel', 'mastermind': 'Criminel',
  'freebooter': 'Pirate', 'plunderer': 'Pirate', 'privateers': 'Pirate',
  // Religion, magie
  'church crier': 'Religieux', 'grand inquisitor': 'Religieux', 'missionary': 'Religieux', 'prophet': 'Religieux', 'saint': 'Religieux',
  'sanctifex': 'Religieux', 'sanctoress': 'Religieux', 'fire keeper': 'Religieux', 'right hand of the divine': 'Religieux',
  'defender of the emerald dream': 'Magicien', 'astrologer': 'Érudit', 'interpreter': 'Érudit',
  // Pouvoir
  'sovereign': 'Souverain', 'mistress of castle dimitrescu': 'Noble', 'dracula\'s vassal': 'Domestique',
  'public voice of the elders': 'Politicien', 'spokesperson': 'Politicien', 'judicator': 'Politicien', 'the notary': 'Avocat',
  'second in command': 'Conseiller',
  // Sciences, soins
  'roboticist': 'Scientifique', 'architect': 'Scientifique', 'elerium expert': 'Scientifique', 'looking glass specialist': 'Scientifique',
  'alpha a.i. psychologist': 'Médecin', 'tau radiologist': 'Médecin', 'therapist': 'Médecin', 'techie': 'Informaticien',
  // Médias, spectacle
  'acrobat': 'Artiste', 'color commentator': 'Journaliste', 'reality tv host': 'Acteur', 'prepper': 'Survivant',
  'occultist': 'Magicien', 'polymath': 'Érudit', 'tech support for lara croft': 'Informaticien',
  // Pas des occupations : rôles dans l'histoire, liens de famille, dieux (l'espèce le dit), phrases, valeurs vides
  'antagonist': null, 'main antagonist': null, 'overarching antagonist': null, 'secondary antagonist': null,
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
  if (value in OCCUPATIONS)
    return OCCUPATIONS[value]
  const french = firstRule(OCCUPATION_RULES, value)
  return french !== undefined ? french : firstRule(ENGLISH_OCCUPATION_RULES, value)
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
  [/cozy game|inventory management|jeu occasionnel|déduction sociale/, null],
  [/commerce|simulateur de vol|jeu vidéo de pêche/, 'Simulation'],
  // Gardés tels quels, validé avec FX
  [/immersive sim/, 'Immersive sim'],
  [/monster-taming/, 'Monster-taming'],
  [/walking simulator/, 'Walking simulator'],
  [/^jeu de tir$|extraction shooter/, 'FPS'],
  [/jeu d'aventure à la troisième personne/, 'Aventure'],
  [/énigme/, 'Réflexion'],
  [/^action-rpg$|soulslike/, 'Action-RPG'],
  [/tactical rpg|tactique au tour par tour/, 'RPG tactique'],
  [/massivement multijoueur/, 'MMO'],
  [/rôle|jrpg|dungeon crawler/, 'RPG'],
  [/action-aventure/, 'Action-aventure'],
  [/point'n click|aventure graphique|film interactif|^jeu d'aventure$/, 'Aventure'],
  [/visual novel/, 'Visual novel'],
  [/survival horror/, 'Survival horror'],
  [/horreur|horror/, 'Horreur'],
  [/battle royale/, 'Battle royale'],
  [/tir en vue subjective|hero shooter|looter shooter|horde shooter|tir tactique/, 'FPS'],
  [/tir à la troisième personne/, 'TPS'],
  [/manic shooter|rail shooter|shoot 'em up/, 'Shoot \'em up'],
  [/combat motorisé|course|mascot racer/, 'Course'],
  [/combat|fighting|fighter|airdasher/, 'Combat'],
  [/metroidvania|soulsvania|metroidbrainia/, 'Metroidvania'],
  [/plates?-?formes?|platformer/, 'Plates-formes'],
  [/infiltration/, 'Infiltration'],
  [/stratégie|tactique en temps réel|tower defense|4x|god game/, 'Stratégie'],
  [/arène de bataille/, 'MOBA'],
  [/roguelike|roguelite/, 'Roguelike'],
  [/hack and slash|character-action|beat them all/, 'Beat them all'],
  [/réflexion/, 'Réflexion'],
  [/gacha/, 'Gacha'],
  [/survie/, 'Survie'],
  [/sandbox/, 'Bac à sable'],
  [/farm life|simulation|gestion|commerce/, 'Simulation'],
  [/football|hockey|tennis|sport/, 'Sport'],
  [/party game|minigame/, 'Party game'],
  [/cartes/, 'Cartes'],
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
