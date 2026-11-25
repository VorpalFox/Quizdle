// Traduction en français des indices récupérés en anglais (AniList, Wikipédia EN), faite à la fin des scripts
// de l'Animedle et du Weebdle. Le sexe et les cheveux sont déjà traduits à la lecture (GENDERS, hairColors) :
// il reste les occupations, traduites avec un dictionnaire puis des règles par mot-clé. Celles qui ne passent
// dans aucun restent telles quelles et sont listées à la fin du script : à ajouter ici si c'est générique,
// sinon à corriger perso par perso dans le fichier de corrections (data/*-manual.json). Après les corrections, l'arme
// du perso s'ajoute et les synonymes sont regroupés en familles (finishOccupations) : les corrections s'écrivent donc
// avec les valeurs regroupées (Étudiant, pas Lycéen).
import type { AttributeValue, Entry } from '../src/engine/types.js'
import { isSetEdit } from '../src/subjects/manual.js'
import { expandSpecies, translateSpecies } from './pixeldleTranslate.js'

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
  'scientist': 'Scientifique', 'researcher': 'Chercheur', 'scholar': 'Chercheur', 'archaeologist': 'Archéologue', 'oceanographer': 'Océanographe',
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
  'militaire': 'Soldat', 'officier général': 'Général', 'procureur': 'Avocat', 'gourou': 'Religieux', 'dirigeant': 'Leader',
  'personnalité du monde de la mode': 'Mannequin', 'orthésiste': 'Mécanicien', 'chauffeur de maître': 'Chauffeur',
  'bouteiller': 'Serviteur', 'tortionnaire': 'Tortionnaire',
  // Repérées en cumulant les sources (les valeurs intraduisibles d'une source suivante sont laissées de côté)
  'courtesan': 'Courtisane', 'terrorist': 'Terroriste', 'fashion model': 'Mannequin', 'gravure model': 'Mannequin',
  'apothecary': 'Apothicaire', 'dyer': 'Artisan', 'archeoligist': 'Archéologue', 'digger': 'Ouvrier', 'hermit': 'Ermite',
  'martial artist': 'Artiste martial', 'tobacconist': 'Vendeur', 'barista': 'Serveur', 'strategist': 'Stratège',
  'serving woman': 'Servante', 'sales position': 'Vendeur', 'rallyist': 'Pilote',
  // Pas des occupations
  'test subject': null, 'sujet psi': null,
  // Assumé par la source : « Unknown » donne Inconnu, « None » donne Aucune. Rien de trouvé, c'est vide (validé avec FX).
  'unknown': 'Inconnu', 'none': 'Aucune',
}

// Sinon, le 1er mot-clé trouvé (en anglais ou en français) : « Owner of the Urahara Shop » → Commerçant.
// Les cas précis d'abord, puis les grandes familles de métiers. null : pas une occupation, on la retire.
const RULES: [RegExp, string | null][] = [
  // Les Servants et les Masters de Fate : des esprits invoqués et leurs invocateurs, pas des domestiques ni des chefs
  [/-class servant|servant class|knight class|\bmaster of (?:\w+-class|saber|archer|lancer|rider|caster|assassin|berserker)\b/, null],
  [/yakuza|mafi|crime boss|\bgang|\bthug|enforcer|drug dealer|trafficker|underboss/, 'Mafieux'],
  // Les piliers et disciples de Demon Slayer (« Water Hashira »)
  [/hashira|tsuguko|demon slayer/, 'Pourfendeur de démons'],
  [/devil hunter|chasseur de d[ée]mon/, 'Chasseur de démons'],
  [/serial killer|mass murderer/, 'Tueur en série'],
  [/magical ?☆?girl/, 'Magical girl'],
  // « Leader of the Phantom Troupe », « Commander of the Secret Mobile Corps », « CEO of Seventh Heaven », « Head of the Tendo Family »
  [/\b(?:leader|commander|master|chief|chieftain|commandant|responsable|führer|head|ceo|chairman|chair|director|executive|boss|founder|administrator|supervisor|overseer|mayor|governor|minister)\b/, 'Leader'],
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
  // Le propriétaire d'un commerce seulement : pas « owner of the Giftia » (le maître d'un robot)
  [/\b(?:shop|shopkeeper|store|mart|restaurant|café|cafe|inn|bar)\b|^owner$/, 'Commerçant'],
  // Les postes de Tower of God
  [/bearer|wave controller/, 'Combattant'],
  [/super-?h[ée]ro/, 'Super-héros'],
  // Pas les Knightmare Frames de Code Geass
  [/\bknight(?!mare)|crusader|paladin/, 'Chevalier'],
  // Pas « one of the Devil King's Generals » : au service du roi
  [/\b(?:king|emperor|monarch|ruler|warlord)\b(?!'s)/, 'Roi'],
  [/\b(?:queen|empress)\b(?!'s)/, 'Reine'],
  [/princess|heiress/, 'Princesse'],
  [/\bprince\b|\bheir\b/, 'Prince'],
  [/royal guard/, 'Garde'],
  [/\b(?:duke|duchess|lord|lady|noble|royal|royalty|earl|baron|aristocrat)\b/, 'Noble'],
  [/sniper|marksman|gunman|shooter|gâchette/, 'Tireur'],
  [/swords(?:wo)?m[ae]n/, 'Épéiste'],
  [/exorcist/, 'Exorciste'],
  [/\bbull(?:y|ies)\b|delinquent/, 'Voyou'],
  [/\b(?:soldier|combatant|warrior|warrrior|fighter|gladiator|duelist|raider|attacker|tank|spotter|initiator|mercenary|shinobi)\b/, 'Combattant'],
  [/\b(?:general|major|lieutenant|sergeant|colonel|officer)s?\b/, 'Officier'],
  [/\b(?:guard|bodyguard|gatekeeper|security|sentinel)s?\b/, 'Garde'],
  [/butler/, 'Majordome'],
  [/\bmaid|handmaiden|lady-in-waiting|housekeeper/, 'Servante'],
  [/\b(?:servant|steward|retainer|attendant|valet)\b/, 'Serviteur'],
  [/musician|vocalist|guitarist|drummer|bassist|pianist|composer|violinist|\bband\b|beatbox/, 'Musicien'],
  // « TV personality », pas le caractère (« gained a different personality »)
  [/\b(?:idol|celebrity|influencer|youtuber|tiktoker|streamer|(?:tv|television|radio|media|internet|online) personality|talk show host|radio host|entertainer|actor|actress)\b/, 'Célébrité'],
  [/\bconsultant\b/, 'Conseiller'],
  [/merchant|trader|salesman|saleswoman|dealer|businessman|businesswoman|broker|peddler/, 'Marchand'],
  [/scientist|researcher|engineer|technician|analyst|programmer|botanist|pharmacist|chemist|physicist|inventor/, 'Scientifique'],
  [/physician|doctor|nurse|medic|psychiatrist|counsel/, 'Médecin'],
  [/writer|author|editor|novelist|poet|mangaka/, 'Écrivain'],
  [/\b(?:slave|livestock)\b/, 'Esclave'],
  [/prisoner|inmate/, 'Prisonnier'],
  [/unemployed|\bneet\b|homeless/, 'Chômeur'],
  [/con ?-?artist|con ?man|hustler|thief|robber|swindler|pickpocket/, 'Voleur'],
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
  [/\bstudents?\b|schooler|freshman|pupil|high school|class representative|homeroom|classmates?/, 'Élève'],
  // Pas des occupations : animaux, valeurs vides
  [/\bpet\b|housepet|familiar|\bspoilers?\b|^none$|^current$|^former$|^inc$|^npc$/, null],
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

// --- Cumul des sources ---

// Les sources passent dans l'ordre (AniList, Wikidata, Fandom, Wikipédia). Occupation, espèce, cheveux et arme : chacune
// ajoute ses valeurs, on n'en a pas de plus fiable et ce sont des listes (validé avec FX). Venant d'une source suivante,
// une occupation qu'on ne sait pas traduire est laissée de côté (« Aub Alexandria's First Husband ») : seule la 1re
// garde la sienne, listée dans le récap pour être traduite. Sexe, âge et taille : la 1re source qui en a un.
const CUMULATIVE_KEYS = new Set(['occupation', 'species', 'hair', 'weapon'])
const isEmpty = (value: AttributeValue | undefined) => value === null || value === undefined

// Ce qu'une source ajoute aux attributs : les champs vides, et les valeurs en plus des champs cumulés
export function addedValues(current: Readonly<Record<string, AttributeValue>>, values: Readonly<Record<string, AttributeValue>>): Record<string, AttributeValue> {
  const added: Record<string, AttributeValue> = {}
  for (const [key, value] of Object.entries(values)) {
    const before = current[key]
    if (isEmpty(value))
      continue
    if (isEmpty(before)) {
      added[key] = value
      continue
    }
    if (!CUMULATIVE_KEYS.has(key) || !Array.isArray(before) || !Array.isArray(value))
      continue
    const extra = (value as string[]).filter(item => !before.includes(item) && (key !== 'occupation' || translateOccupation(item) !== undefined))
    if (extra.length > 0)
      added[key] = [...before, ...extra]
  }
  return added
}

// Les occupations des entrées traduites, et celles qui ne sont pas dans le dictionnaire (avec leur nombre).
// `corrected` : les personnages dont l'occupation est corrigée à la main (manualOccupations). Les valeurs que la
// correction retire restent telles quelles, pour qu'elle les trouve ; le reste est traduit (les sources cumulées
// ajoutent des valeurs en anglais), sans lister ce qui ne l'est pas : c'est déjà relu.
export function translateEntries(entries: Entry[], corrected: ReadonlyMap<string, ReadonlySet<string>> = new Map()): { entries: Entry[], untranslated: Map<string, number> } {
  const untranslated = new Map<string, number>()
  const translated = entries.map(entry => {
    const occupation = entry.attributes.occupation
    if (!Array.isArray(occupation))
      return entry
    const removed = corrected.get(entry.id)
    const values = (occupation as string[]).flatMap(value => {
      if (removed?.has(value))
        return [value]
      const french = translateOccupation(value)
      if (french === undefined && !removed)
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
  'Super-héros': ['Héros', 'Combattant'],
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

const NO_REAL_OCCUPATION = new Set(['Inconnu', 'Aucune'])

// Les occupations finales : les synonymes regroupés, puis la famille ajoutée après la valeur précise, sans doublon
export function groupOccupations(values: readonly string[]): string[] | null {
  // Inconnu et Aucune s'effacent devant une vraie occupation (une arme, un titre)
  const real = values.filter(value => !NO_REAL_OCCUPATION.has(value))
  const merged = (real.length > 0 ? real : values).map(value => OCCUPATION_MERGES[value] ?? value)
  const grouped = [...new Set([...merged, ...merged.flatMap(value => OCCUPATION_FAMILIES[value] ?? [])])]
  return grouped.length > 0 ? grouped : null
}

// Les armes et les titres ajoutés à l'occupation, au plus (comme au Pixeldle)
const MAX_WEAPONS = 2
const MAX_TITLES = 2

// Un perso mort sans aucune occupation : « Aucune » (validé avec FX). Seulement s'il n'a rien d'autre, et jamais
// « Mort » ou « Défunt » : ce serait un spoil affiché à chaque proposition.
const NO_OCCUPATION = 'Aucune'

// À la fin, corrections comprises : les armes (comment le perso se bat) et les titres des infobox (attributs de travail
// « weapon », « titles » et « deceased ») rejoignent l'occupation, puis tout est regroupé
export function finishOccupations(entries: Entry[]): Entry[] {
  return entries.map(entry => {
    const { weapon, titles, deceased, ...attributes } = entry.attributes
    const extra = (value: unknown, max: number) => ((value as string[] | null | undefined) ?? []).slice(0, max)
    const occupation = [...(attributes.occupation as string[] | null) ?? [], ...extra(weapon, MAX_WEAPONS), ...extra(titles, MAX_TITLES)]
    const grouped = groupOccupations(occupation) ?? (deceased ? [NO_OCCUPATION] : null)
    return { ...entry, attributes: { ...attributes, occupation: grouped } }
  })
}

// Les ids dont le fichier de corrections touche l'occupation, avec les valeurs qu'il retire
export function manualOccupations(edit: Record<string, Record<string, unknown>>): Map<string, Set<string>> {
  return new Map(Object.entries(edit).filter(([, changes]) => 'occupation' in changes)
    .map(([id, changes]) => [id, new Set(isSetEdit(changes.occupation) ? changes.occupation.moins ?? [] : [])]))
}

// --- Espèce (Weebdle) ---

// Les espèces des animes, clés en minuscules, par-dessus la table du Pixeldle (translateSpecies). Les peuples d'un seul
// anime rejoignent une grande famille pour que les persos se croisent : les Spirals de Gurren Lagann sont des humains,
// les Giftias de Plastic Memories des androïdes. null = pas une espèce.
const ANIME_SPECIES: Record<string, string | null> = {
  'new human': 'Humain', 'spiral': 'Humain', 'immanity': 'Humain', 'imanity': 'Humain', 'evolved human': 'Humain',
  'divine human': 'Humain', 'caucasian': 'Humain', 'beyondian': 'Humain', 'gamer': 'Humain', 'amazoness': 'Humain',
  'pallum': 'Humain', 'esper': 'Humain', 'magus': 'Humain', 'burst linker': 'Humain', 'master': null, 'magician': 'Humain',
  'giftia': 'Androïde', 'humanoid ai': 'Androïde', 'cyber girl': 'Androïde',
  'shiki': 'Vampire', 'real vampire': 'Vampire', 'artificial vampire': 'Vampire', 'lesser vampire': 'Vampire', 'vampiric thrall': 'Vampire',
  'devilman': 'Démon', 'succubus': 'Démon', 'fiend': 'Démon', 'fiend host': 'Démon', 'karma demon': 'Démon', 'demons': 'Démon', 'daemon': 'Démon',
  'grim reaper': 'Shinigami', 'shinigami': 'Shinigami', 'soul reaper': 'Shinigami',
  'seraph': 'Ange', 'flügel': 'Ange', 'jinrou': 'Loup-garou', 'intelligent titan': 'Titan', 'titan': 'Titan',
  'pillar man': 'Homme du pilier', 'life fibers': 'Fibre de vie', 'chimera ant': 'Fourmi-chimère',
  'monster rat': 'Rat', 'filolial': 'Oiseau', 'crow': 'Oiseau', 'tanuki': 'Tanuki', 'japanese raccoon': 'Tanuki',
  'hobgoblin': 'Gobelin', 'ghast': 'Mort-vivant', 'kamui': 'Fibre de vie', 'boaz': 'Homme-bête', 'wanui': 'Homme-bête',
  'gorgon': 'Gorgone', 'medusa': 'Gorgone', 'dullahan': 'Mort-vivant', 'divine fighter': 'Démon', 'divine wolf': 'Loup', 'merman': 'Sirène', 'servant': 'Esprit héroïque',
  'shadow': 'Ombre', 'shadows': 'Ombre', 'nephilim': 'Demi-démon', 'elder bairn': 'Monstre', 'narehate': 'Narehate',
  'michaela': null, 'familiar': null, 'neighbor': null,
  // Les hybrides de Chainsaw Man sont des humains-démons (au Pixeldle, un hybride est mi-extraterrestre). Les Parasites de
  // DARLING in the FRANXX sont les pilotes, des humains (Parasyte n'est pas dans la liste du Weebdle).
  'hybrid': 'Demi-démon', 'parasite': 'Humain',
  'none': null, 'unknown': null, 'jewel': null, 'image fragment': null, 'spirit swords': null, 'immortal': null,
}
// La longue traîne, dans l'ordre (« human-turned beastman - tanuki » : homme-bête avant humain)
const ANIME_SPECIES_RULES: [RegExp, string][] = [
  [/beast ?m[ae]n|beastkin|beast human|beast race|beast hybrid|therianthrope|werebeast|werecat|cat people|kitten human|felinoid/, 'Homme-bête'],
  [/\bhalf[- ]?(?:elf|alv)\b/, 'Demi-elfe'],
  [/\b(?:fairy|fairies|pixie|sylph|salamander|undine|spriggan|leprechaun|cait sith|cat s[ií]dhe)\b/, 'Fée'],
  [/\bvampir/, 'Vampire'],
  [/\b(?:demon|devil|oni)\b/, 'Démon'],
  [/\bdragon/, 'Dragon'],
  [/\b(?:elf|elves|alv)\b/, 'Elfe'],
  [/\b(?:angel|seraph)/, 'Ange'],
  [/\bshadows?\b/, 'Ombre'],
  [/\b(?:werewolf|jinrou)\b/, 'Loup-garou'],
  [/\b(?:yokai|youkai|yōkai|ayakashi|kyouma)\b/, 'Yōkai'],
  [/\bspirit\b/, 'Esprit'],
  [/\b(?:giant|gigantes)\b/, 'Géant'],
  [/\b(?:god|goddess|deity|divine)\b/, 'Divinité'],
  [/\b(?:android|robot|ai)\b/, 'Robot'],
  [/\bhumans?\b/, 'Humain'],
]
// Un nom d'espèce exact, sans les règles par mot-clé : pour l'intro des pages, où « demon slayer » n'est pas un démon
export function exactSpecies(name: string): string | null | undefined {
  const key = name.toLowerCase().trim()
  return key in ANIME_SPECIES ? ANIME_SPECIES[key] : translateSpecies(key)
}

// « Human (formerly), Demon » → Humain, Démon : toutes les espèces du perso, même celles qu'il prend plus tard dans
// l'histoire (Mikaela, Seraph of the End : « Human (Formerly), Vampire (Formerly), Demon »). Un indice vaut mieux qu'un
// spoil évité (validé avec FX) ; seule la mort n'est jamais dite. Ce qu'on ne sait pas traduire est mis de côté
// (unknown), pas gardé en anglais : souvent une phrase (« most possibly an absolute monad »), à ajouter ici si ça revient.
export function translateCharacterSpecies(raw: string): { species: string[], unknown: string[] } {
  const species: string[] = []
  const unknown: string[] = []
  for (const part of raw.split(/\s*(?:,|;|\/|\n|&|\band\b|\bor\b|→|・)\s*/i).filter(part => part.trim())) {
    const key = part.toLowerCase().replace(/\s*\([^)]*\)?/g, '').replace(/\[[^\]]*\]/g, '').replace(/^[\s*•·-]+|[\s.:)]+$/g, '').trim()
    if (!key || /^\d+$/.test(key))
      continue
    // « Part 2: Vampire », « Elder Bairn by the end of the movie » : l'espèce seule
    const name = key.replace(/^part\s*\d+\s*:\s*/, '').replace(/\s+(?:by the end|at the end|in the end)\b.*$/, '')
    const french = name in ANIME_SPECIES ? ANIME_SPECIES[name] : translateSpecies(name) ?? ANIME_SPECIES_RULES.find(([pattern]) => pattern.test(name))?.[1]
    if (french === undefined)
      unknown.push(part.trim())
    else if (french)
      species.push(french)
  }
  return { species: [...new Set(species)], unknown }
}

// L'espèce des entrées (« species », les valeurs brutes des sources) traduite et dépliée (Demi-elfe = Humain + Elfe,
// un chat est aussi un Animal), avec ce qui n'a pas pu l'être
export function translateSpeciesEntries(entries: Entry[]): { entries: Entry[], untranslated: Map<string, number> } {
  const untranslated = new Map<string, number>()
  const translated = entries.map(entry => {
    const raw = entry.attributes.species
    if (!Array.isArray(raw))
      return entry
    const found = (raw as string[]).map(translateCharacterSpecies)
    for (const value of found.flatMap(({ unknown }) => unknown))
      untranslated.set(value, (untranslated.get(value) ?? 0) + 1)
    // Les espèces de toutes les sources (addedValues), chacune parfois en plusieurs valeurs
    const species = [...new Set(found.flatMap(({ species }) => species))]
    return { ...entry, attributes: { ...entry.attributes, species: expandSpecies(species) } }
  })
  return { entries: translated, untranslated }
}
