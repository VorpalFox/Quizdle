// Traduction en français des indices récupérés en anglais (AniList, Wikipédia EN), faite à la fin des scripts
// de l'Animedle et du Weebdle. Le sexe et les cheveux sont déjà traduits à la lecture (GENDERS, hairColors) :
// il reste les occupations, traduites avec un dictionnaire puis des règles par mot-clé. Celles qui ne passent
// dans aucun restent telles quelles et sont listées à la fin du script : à ajouter ici si c'est générique,
// sinon à corriger perso par perso dans le fichier de corrections (data/*-manual.json). Après les corrections, l'arme
// du perso s'ajoute et les synonymes sont regroupés en familles (finishOccupations) : les corrections s'écrivent donc
// avec les valeurs regroupées (Étudiant, pas Lycéen).
import type { Entry } from '../src/engine/types.js'

// L'occupation exacte, clés en minuscules. null = pas une occupation, on la retire.
const OCCUPATIONS: Record<string, string | null> = {
  // École
  'student': 'Élève', 'high school student': 'Lycéen', 'first-year high school student': 'Lycéen', 'middle school student': 'Collégien',
  'university student': 'Étudiant', 'college student': 'Étudiant', 'seimei university junior': 'Étudiant',
  'principal': 'Directeur d\'école', 'delving instructor': 'Instructeur', 'student council president': 'Président du conseil des élèves',
  // Armée, police
  'general': 'Général', 'briggs general': 'Général', 'lieutenant': 'Lieutenant', 'sergeant': 'Sergent', 'officer': 'Officier',
  'military officer': 'Officier', 'soldier': 'Soldat', 'scout': 'Éclaireur', 'guard': 'Garde', 'bodyguard': 'Garde du corps',
  'survey corps': 'Bataillon d\'exploration', '104th training corps': 'Recrue', '104th trainees squad': 'Recrue',
  'police officer': 'Policier', 'policeman': 'Policier', 'spy': 'Espion', 'informant': 'Informateur',
  'mercenary': 'Mercenaire', 'assassin': 'Assassin',
  // Fantasy
  'knight': 'Chevalier', 'mage': 'Mage', 'magi': 'Mage', 'magician': 'Magicien', 'wizard': 'Magicien', 'sorcerer': 'Sorcier',
  'sorceress': 'Sorcière', 'witch': 'Sorcière', 'jujutsu sorcerer': 'Exorciste', 'exorcist': 'Exorciste', 'curse user': 'Utilisateur de fléaux',
  'adventurer': 'Aventurier', 'delver': 'Explorateur', 'hunter': 'Chasseur', 'fang hunter': 'Chasseur', 'vampire hunter': 'Chasseur de vampires',
  'demon slayer': 'Pourfendeur de démons', 'warrior': 'Guerrier', 'warrior captain': 'Guerrier', 'swordsman': 'Épéiste', 'swordswoman': 'Épéiste',
  'samurai': 'Samouraï', 'ninja': 'Ninja', 'archer': 'Archer', 'healer': 'Soigneur', 'cleric': 'Clerc', 'priest': 'Prêtre', 'priestess': 'Prêtresse',
  'nun': 'Religieuse', 'monk': 'Moine', 'shrine maiden': 'Miko', 'oracle': 'Oracle', 'fortune teller': 'Voyant',
  'alchemist': 'Alchimiste', 'state alchemist': 'Alchimiste', 'herbalist': 'Herboriste', 'potion maker': 'Apothicaire',
  'hero': 'Héros', 'pro hero': 'Héros professionnel', 'villain': 'Méchant',
  'pirate': 'Pirate', 'space pirate': 'Pirate de l\'espace', 'thief': 'Voleur', 'criminal': 'Criminel', 'tueur en série': 'Tueur en série',
  'god': 'Dieu', 'goddess': 'Déesse', 'god of war': 'Dieu', 'delivery god': 'Dieu', 'god of calamity': 'Dieu',
  // Noblesse
  'king': 'Roi', 'queen': 'Reine', 'prince': 'Prince', 'princess': 'Princesse', 'emperor': 'Empereur', 'empress': 'Impératrice',
  'noble': 'Noble', 'lord': 'Seigneur', 'lady': 'Dame', 'earl of phantomhive': 'Comte', 'president': 'Président', 'diplomat': 'Diplomate',
  // Métiers
  'doctor': 'Médecin', 'psychiatrist': 'Psychiatre', 'nurse': 'Infirmier', 'veterinarian': 'Vétérinaire',
  'scientist': 'Scientifique', 'researcher': 'Chercheur', 'archaeologist': 'Archéologue', 'oceanographer': 'Océanographe',
  'marine explorer': 'Explorateur', 'inventor': 'Inventeur', 'engineer': 'Ingénieur', 'astronomer': 'Astronome', 'astronaut': 'Astronaute',
  'mechanic': 'Mécanicien', 'mechanics': 'Mécanicien', 'automail mechanic': 'Mécanicien', 'automail technician': 'Mécanicien',
  'lawyer': 'Avocat', 'editorial staff': 'Éditeur', 'communication specialist': 'Spécialiste des communications',
  'writer': 'Écrivain', 'novelist': 'Écrivain', 'manga artist': 'Mangaka', 'mangaka': 'Mangaka', 'artist': 'Artiste',
  'idol': 'Idole', 'singer': 'Chanteur', 'musician': 'Musicien', 'rapper': 'Rappeur', 'actor': 'Acteur', 'actress': 'Actrice',
  'model': 'Mannequin', 'grand couturier': 'Couturier', 'dyeing craftsman': 'Artisan',
  'chef': 'Cuisinier', 'cook': 'Cuisinier', 'maid': 'Servante', 'butler': 'Majordome', 'servant': 'Serviteur',
  'merchant': 'Marchand', 'merchant apprentice': 'Marchand', 'tobacco store clerk': 'Vendeur', 'waitress': 'Serveuse', 'waiter': 'Serveur',
  'office worker': 'Employé de bureau', 'salaryman': 'Employé de bureau', 'city hall clerk': 'Fonctionnaire', 'clerk': 'Employé',
  'real estate agent': 'Agent immobilier', 'truck driver': 'Routier', 'housewife': 'Femme au foyer', 'guide': 'Guide',
  'part-time worker': 'Petits boulots', 'part-timer': 'Petits boulots', 'villager': 'Villageois', 'farmer': 'Fermier',
  'blacksmith': 'Forgeron', 'fisherman': 'Pêcheur', 'sailor': 'Marin', 'navigator': 'Navigateur', 'charcoal burner': 'Charbonnier',
  'hikikomori': 'Chômeur',
  // Sport
  'middle blocker': 'Volleyeur', 'outside hitter': 'Volleyeur', 'setter': 'Volleyeur', 'libero': 'Volleyeur', 'athlete': 'Athlète',
  // Wikidata : déjà en français, ramené à notre vocabulaire
  'idole japonaise': 'Idole', 'femme de ménage': 'Servante', 'dame de compagnie': 'Servante', 'domestique': 'Serviteur',
  'devil hunter': 'Chasseur de démons', 'chasseur de démon': 'Chasseur de démons', 'chasseur de monstre': 'Chasseur',
  'tueur': 'Tueur', 'meurtrier': 'Tueur', 'thug': 'Voyou', 'as de la gâchette': 'Tireur', 'terroriste': 'Terroriste',
  'piqueuse': 'Volleyeur', 'seiyū': 'Doubleur', 'travail à temps partiel': 'Petits boulots', 'travailleur': 'Employé',
  'livreur de pizza': 'Livreur', 'coursier': 'Livreur', 'écolier': 'Élève', 'enseignant': 'Professeur', 'floral designer': 'Fleuriste',
  'caissier': 'Vendeur', 'cosplayer-server': 'Serveur', 'neurologue': 'Médecin', 'pratiquant d\'arts martiaux': 'Artiste martial',
  'personnalité politique': 'Politicien', 'personnalité du monde des affaires': 'Homme d\'affaires', 'conseiller': 'Conseiller',
  'monarque': 'Monarque', 'consort': 'Noble', 'membre de la famille royale': 'Noble', 'courtisane': 'Courtisane',
  'révolutionnaire': 'Révolutionnaire', 'justicier': 'Justicier', 'philanthrope': 'Philanthrope', 'youtubeur': 'Youtubeur',
  'voyageur dans le temps': 'Voyageur temporel', 'tueur de masse': 'Tueur', 'tueur à gages': 'Assassin', 'mob enforcer': 'Voyou',
  'travailleur autonome': 'Indépendant', 'agriculteur': 'Fermier', 'modèle photo': 'Mannequin', 'clairvoyant': 'Voyant',
  'chasseur de fantômes': 'Exorciste', 'généticien': 'Scientifique', 'cosplayeur': 'Cosplayeur', 'boulanger': 'Boulanger',
  'chasseur de primes': 'Chasseur de primes', 'lutteur': 'Lutteur', 'hacker': 'Hacker', 'hypnotiseur': 'Hypnotiseur',
  // Pas des occupations
  'unknown': null, 'test subject': null, 'sujet psi': null,
}

// Sinon, le 1er mot-clé trouvé (en anglais ou en français) : « Owner of the Urahara Shop » → Commerçant.
// Les cas précis d'abord, puis les grandes familles de métiers. null : pas une occupation, on la retire.
const RULES: [RegExp, string | null][] = [
  [/yakuza|mafi|crime boss|\bgang|\bthug|enforcer|drug dealer|trafficker/, 'Mafieux'],
  // Les piliers et disciples de Demon Slayer (« Water Hashira »)
  [/hashira|tsuguko|demon slayer/, 'Pourfendeur de démons'],
  [/devil hunter|chasseur de d[ée]mon/, 'Chasseur de démons'],
  [/serial killer|mass murderer/, 'Tueur en série'],
  [/magical ?☆?girl/, 'Magical girl'],
  // « Leader of the Phantom Troupe », « Commander of the Secret Mobile Corps », « CEO of Seventh Heaven », « Head of the Tendo Family »
  [/\b(?:leader|commander|master|chief|commandant|responsable|führer|head|ceo|chairman|chair|director|executive|boss|founder|administrator|supervisor|overseer|mayor|governor|minister)\b/, 'Leader'],
  [/\bcaptain\b/, 'Capitaine'],
  [/\bguardian\b/, 'Gardien'],
  [/shinigami|soul reaper|dieu de la mort|god of death/, 'Shinigami'],
  // « Pilote d'EVA », « Stamen » et « Pistil » (les pilotes de DARLING in the FRANXX)
  [/\bpilot|stamen|pistil/, 'Pilote'],
  [/surgeon|chirurgien/, 'Chirurgien'],
  [/teacher|professor|housemaster|headmaster|instructor|lecturer|mentor|tutor|\bcoach|trainer|principal/, 'Professeur'],
  [/detective|investigator|inspector/, 'Détective'],
  [/\bspy\b|espionage|counterintelligence|intelligence/, 'Espion'],
  [/\bagent\b/, 'Agent secret'],
  [/magazine|journalist|reporter|announcer/, 'Journaliste'],
  [/\bmanager\b/, 'Gérant'],
  [/\b(?:owner|shop|shopkeeper|store)\b/, 'Commerçant'],
  // Les postes de Tower of God
  [/bearer|wave controller/, 'Combattant'],
  [/super-?h[ée]ro/, 'Super-héros'],
  [/\bknight|crusader|paladin/, 'Chevalier'],
  [/\b(?:king|emperor|monarch|ruler|warlord)\b/, 'Roi'],
  [/\b(?:queen|empress)\b/, 'Reine'],
  [/princess|heiress/, 'Princesse'],
  [/\bprince\b|\bheir\b/, 'Prince'],
  [/\b(?:duke|duchess|lord|lady|noble|royal|royalty|earl|baron|aristocrat)\b/, 'Noble'],
  [/sniper|marksman|gunman|shooter|gâchette/, 'Tireur'],
  [/\b(?:soldier|combatant|warrior|warrrior|fighter|gladiator|duelist|raider|attacker|tank|spotter|initiator|mercenary|shinobi)\b/, 'Combattant'],
  [/\b(?:general|major|lieutenant|sergeant|colonel|officer)\b/, 'Officier'],
  [/\b(?:guard|bodyguard|gatekeeper|security|sentinel)\b/, 'Garde'],
  [/butler/, 'Majordome'],
  [/\bmaid|handmaiden|lady-in-waiting|housekeeper/, 'Servante'],
  [/\b(?:servant|steward|retainer|attendant|valet)\b/, 'Serviteur'],
  [/musician|vocalist|guitarist|drummer|bassist|pianist|composer|violinist|\bband\b|beatbox/, 'Musicien'],
  [/\b(?:idol|celebrity|influencer|youtuber|streamer|personality|entertainer|actor|actress)\b/, 'Célébrité'],
  [/merchant|trader|salesman|saleswoman|dealer|businessman|businesswoman|broker|peddler/, 'Marchand'],
  [/scientist|researcher|engineer|technician|analyst|programmer|botanist|pharmacist|chemist|physicist|inventor/, 'Scientifique'],
  [/physician|doctor|nurse|medic|psychiatrist|counsel/, 'Médecin'],
  [/writer|author|editor|novelist|poet|mangaka/, 'Écrivain'],
  [/\b(?:slave|livestock)\b/, 'Esclave'],
  [/prisoner|inmate/, 'Prisonnier'],
  [/unemployed|\bneet\b|homeless/, 'Chômeur'],
  [/con ?-?artist|conman|hustler|thief|robber|swindler|pickpocket/, 'Voleur'],
  [/killer|murderer|assassin|hitman|hitwoman/, 'Assassin'],
  [/magician|\bmage\b|magus|sorcerer|sorceress|witch|wizard|\bmagi\b|warlock/, 'Magicien'],
  [/priest|bishop|monk|\bnun\b|miko|shrine|apostle|guru|cleric|religious/, 'Religieux'],
  [/athlete|player|runner|skater|gymnast|pitcher|racer|swimmer|boxer|wrestler/, 'Sportif'],
  [/farmer|farming|gardener|woodcutter|carpenter|baker|seamstress|tailor|hairdresser|florist|bartender|photographer|swordsmith|blacksmith|craftsman|artisan|\bcook\b|\bchef\b/, 'Artisan'],
  [/worker|clerk|cashier|employee|\bstaff\b|operator|receptionist|secretary|office lady|accountant|librarian|delivery|courier/, 'Employé'],
  [/assistant|\baide\b|sidekick|right-hand|adviser|advisor|apprentice|subordinate|attaché/, 'Assistant'],
  [/traveler|traveller|nomad|wanderer/, 'Voyageur'],
  [/\bpresident\b|representative|second-in-command/, 'Leader'],
  [/\bhunter\b/, 'Chasseur'],
  [/\bhero(?:ine)?\b|vassal weapon/, 'Héros'],
  [/supervillain|villain/, 'Méchant'],
  [/waitress|waiter|hostess/, 'Serveur'],
  [/singer|vocals/, 'Chanteur'],
  [/astronaut|cosmonaut/, 'Astronaute'],
  [/politician|senator|ambassador|diplomat|chancellor|official|prelate/, 'Politicien'],
  [/attorney|prosecutor|lawyer/, 'Avocat'],
  [/firefighter/, 'Pompier'],
  [/bandit/, 'Voleur'],
  [/game (?:designer|planner|tester)|producer|promoter/, 'Employé'],
  [/house ?wife|house spouse/, 'Femme au foyer'],
  [/[ée]tudiant/, 'Étudiant'],
  [/\bstudent\b|schooler|freshman|pupil|high school|class representative|homeroom/, 'Élève'],
  // Pas des occupations : animaux, valeurs vides
  [/\bpet\b|housepet|familiar|^none$|^current$|^former$|^inc$|^npc$/, null],
  // Une appartenance à un groupe, pas un métier (« Member of the SSS », « 3rd Seat of the Seven Shadows »)
  [/\b(?:member|members|seat|crew|team|squad|council|cast|division|committee|corps|group)\b/, null],
]

// Les occupations déjà en français (Wikipédia FR, corrections à la main) : on les garde telles quelles
const FRENCH = new Set([...Object.values(OCCUPATIONS), ...RULES.map(([, french]) => french)].flatMap(french => french ? [french.toLowerCase()] : []))

// La traduction, null si ce n'est pas une occupation, undefined si on ne sait pas la traduire
export function translateOccupation(value: string): string | null | undefined {
  // « ・Slave », « Legendary Hero Former », « Former Attorney » → sans les puces ni « former »
  const key = value.toLowerCase().replace(/^[\s・*•-]+/, '').replace(/^former\s+|\s+former$/, '').trim()
  if (key in OCCUPATIONS)
    return OCCUPATIONS[key]
  if (FRENCH.has(key))
    return value
  return RULES.find(([pattern]) => pattern.test(key))?.[1]
}

// Les occupations des entrées traduites, et celles qui ne sont pas dans le dictionnaire (avec leur nombre).
// `fixedIds` : les personnages dont l'occupation est corrigée à la main, rien à traduire.
export function translateEntries(entries: Entry[], fixedIds: ReadonlySet<string> = new Set()): { entries: Entry[], untranslated: Map<string, number> } {
  const untranslated = new Map<string, number>()
  const translated = entries.map(entry => {
    const occupation = entry.attributes.occupation
    if (!Array.isArray(occupation) || fixedIds.has(entry.id))
      return entry
    const values = (occupation as string[]).flatMap(value => {
      const french = translateOccupation(value)
      if (french === undefined)
        untranslated.set(value, (untranslated.get(value) ?? 0) + 1)
      return french === undefined ? [value] : french === null ? [] : [french]
    })
    const unique = [...new Set(values)]
    return { ...entry, attributes: { ...entry.attributes, occupation: unique.length > 0 ? unique : null } }
  })
  return { entries: translated, untranslated }
}

// --- Regroupement, après les corrections à la main ---

// Les quasi-synonymes : une seule valeur, rien de perdu (Lycéen et Étudiant, c'est pareil pour deviner ; Reine, le sexe le dit déjà)
const OCCUPATION_MERGES: Record<string, string> = {
  'Élève': 'Étudiant', 'Lycéen': 'Étudiant', 'Collégien': 'Étudiant',
  'Guerrier': 'Combattant', 'Tueur': 'Assassin', 'Tireur d\'élite': 'Tireur',
  'Général': 'Officier', 'Lieutenant': 'Officier', 'Recrue': 'Soldat', 'Garde du corps': 'Garde', 'Agent secret': 'Espion',
  'Mage': 'Magicien', 'Magicienne': 'Magicien', 'Sorcier': 'Magicien', 'Sorcière': 'Magicien', 'Magical Girl': 'Magical girl',
  'Prêtre': 'Religieux', 'Prêtresse': 'Religieux', 'Religieuse': 'Religieux', 'Moine': 'Religieux', 'Clerc': 'Religieux',
  'Roi': 'Souverain', 'Reine': 'Souverain', 'Empereur': 'Souverain', 'Impératrice': 'Souverain', 'Monarque': 'Souverain',
  'Prince': 'Noble', 'Princesse': 'Noble', 'Comte': 'Noble', 'Seigneur': 'Noble', 'Dame': 'Noble', 'Déesse': 'Dieu',
  'Héros professionnel': 'Super-héros', 'Pirate de l\'espace': 'Pirate',
  'Infirmier': 'Médecin', 'Soigneur': 'Médecin', 'Chercheur': 'Scientifique', 'Explorateur': 'Aventurier', 'Voyageur': 'Aventurier',
  'Instructeur': 'Professeur', 'Employé de bureau': 'Employé', 'Fonctionnaire': 'Employé', 'Marchand': 'Commerçant', 'Vendeur': 'Commerçant',
  'Servante': 'Domestique', 'Serviteur': 'Domestique', 'Majordome': 'Domestique', 'Serveuse': 'Serveur', 'Boulanger': 'Cuisinier',
  'Actrice': 'Acteur', 'Rappeur': 'Chanteur',
}

// Les grandes familles, ajoutées à la valeur précise qui garde son info en plus (Épéiste + Combattant) : deux persos
// qui se battent se croisent en jaune même avec des armes différentes
const OCCUPATION_FAMILIES: Record<string, readonly string[]> = {
  // Combat
  'Épéiste': ['Combattant'], 'Samouraï': ['Combattant'], 'Ninja': ['Combattant'], 'Chevalier': ['Combattant'], 'Archer': ['Combattant'],
  'Tireur': ['Combattant'], 'Lancier': ['Combattant'], 'Mercenaire': ['Combattant'], 'Artiste martial': ['Combattant'],
  'Lutteur': ['Combattant', 'Sportif'], 'Chasseur de primes': ['Combattant'],
  // Soldat à part : un militaire n'est pas forcément un combattant, l'indice n'est pas le même (validé avec FX)
  'Officier': ['Soldat'], 'Bataillon d\'exploration': ['Soldat'], 'Éclaireur': ['Soldat'],
  'Pourfendeur de démons': ['Chasseur de monstres', 'Combattant'], 'Chasseur de démons': ['Chasseur de monstres', 'Combattant'],
  'Chasseur de vampires': ['Chasseur de monstres', 'Combattant'], 'Exorciste': ['Chasseur de monstres', 'Magicien'],
  'Super-héros': ['Héros', 'Combattant'], 'Justicier': ['Héros'],
  // Crime
  'Assassin': ['Criminel', 'Combattant'], 'Tueur en série': ['Criminel'], 'Mafieux': ['Criminel'], 'Voyou': ['Criminel'],
  'Voleur': ['Criminel'], 'Pirate': ['Criminel'], 'Terroriste': ['Criminel'],
  // Magie, religion
  'Magical girl': ['Magicien'], 'Onmyouji': ['Magicien'], 'Utilisateur de fléaux': ['Magicien'], 'Miko': ['Religieux'], 'Oracle': ['Religieux'],
  // Pouvoir
  'Souverain': ['Noble', 'Leader'], 'Président': ['Leader'], 'Gérant': ['Leader'], 'Capitaine': ['Leader'],
  'Directeur d\'école': ['Professeur', 'Leader'], 'Président du conseil des élèves': ['Étudiant', 'Leader'],
  // Sciences, santé
  'Chirurgien': ['Médecin'], 'Psychiatre': ['Médecin'], 'Ingénieur': ['Scientifique'], 'Inventeur': ['Scientifique'],
  'Archéologue': ['Scientifique'], 'Océanographe': ['Scientifique'], 'Astronome': ['Scientifique'], 'Alchimiste': ['Scientifique'],
  // Arts, spectacle
  'Chanteur': ['Musicien', 'Artiste'], 'Musicien': ['Artiste'], 'Idole': ['Chanteur', 'Célébrité', 'Artiste'],
  'Acteur': ['Célébrité', 'Artiste'], 'Mannequin': ['Célébrité', 'Artiste'], 'Youtubeur': ['Célébrité'], 'Doubleur': ['Artiste'],
  'Mangaka': ['Artiste'], 'Écrivain': ['Artiste'], 'Cosplayeur': ['Artiste'], 'Couturier': ['Artisan'],
  // Métiers, sport
  'Forgeron': ['Artisan'], 'Fleuriste': ['Artisan'], 'Cuisinier': ['Artisan'], 'Petits boulots': ['Employé'], 'Volleyeur': ['Sportif'],
}

// Les occupations finales : les synonymes regroupés, puis la famille ajoutée après la valeur précise, sans doublon
export function groupOccupations(values: readonly string[]): string[] | null {
  const merged = values.map(value => OCCUPATION_MERGES[value] ?? value)
  const grouped = [...new Set([...merged, ...merged.flatMap(value => OCCUPATION_FAMILIES[value] ?? [])])]
  return grouped.length > 0 ? grouped : null
}

// Les armes ajoutées à l'occupation, au plus (comme au Pixeldle)
const MAX_WEAPONS = 2

// À la fin, corrections comprises : les armes (comment le perso se bat, attribut de travail « weapon ») rejoignent
// l'occupation, puis tout est regroupé
export function finishOccupations(entries: Entry[]): Entry[] {
  return entries.map(entry => {
    const { weapon, ...attributes } = entry.attributes
    const occupation = [...(attributes.occupation as string[] | null) ?? [], ...((weapon as string[] | null | undefined) ?? []).slice(0, MAX_WEAPONS)]
    return { ...entry, attributes: { ...attributes, occupation: groupOccupations(occupation) } }
  })
}

// Les ids dont le fichier de corrections remplace l'occupation
export function fixedOccupationIds(edit: Record<string, Record<string, unknown>>): Set<string> {
  return new Set(Object.entries(edit).filter(([, changes]) => 'occupation' in changes).map(([id]) => id))
}
