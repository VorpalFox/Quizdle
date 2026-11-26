import { describe, expect, it } from 'vitest'
import { expandSpecies, franchiseUniverses, franchiseWorld, hairOrNone, isRealPlace, mergeOccupations, occupationOrChoice, weaponOccupations, placeCountry, translateDeveloper, translateGender, translateGenre, translateNationality, translateOccupation, translatePlace, translateSpecies, withWorld } from '../pixeldleTranslate.js'

describe('expandSpecies', () => {
  it('Animal_AjouteAnimal', () => {
    expect(expandSpecies('Fox')).toEqual(['Fox', 'Animal'])
    expect(expandSpecies(['Deity', 'Wolf'])).toEqual(['Deity', 'Wolf', 'Animal'])
  })

  it('EspeceComposee_SesDeuxParts', () => {
    expect(expandSpecies('Half-elf')).toEqual(['Human', 'Elf'])
    expect(expandSpecies('AI')).toEqual(['Robot'])
  })

  it('DejaDepliee_Inchangee', () => {
    expect(expandSpecies(['Fox', 'Animal'])).toEqual(['Fox', 'Animal'])
    expect(expandSpecies(['Human', 'Human'])).toEqual(['Human'])
  })

  it('Vide_Null', () => {
    expect(expandSpecies(null)).toBeNull()
    expect(expandSpecies([])).toBeNull()
  })
})

describe('mergeOccupations', () => {
  it('QuasiSynonymes_Regroupes', () => {
    expect(mergeOccupations(['Killer', 'Assassin', 'Pupil'])).toEqual(['Assassin', 'Student'])
  })

  it('Dieu_Retire', () => {
    expect(mergeOccupations(['God'])).toBeNull()
  })
})

describe('weaponOccupations', () => {
  it('Armes_CommentIlSeBat', () => {
    expect(weaponOccupations('Buster Sword')).toEqual(['Swordsman'])
    expect(weaponOccupations('AK-47, Desert Eagle')).toEqual(['Marksman'])
    expect(weaponOccupations('Gunblade')).toEqual(['Swordsman', 'Marksman'])
    expect(weaponOccupations('Sniper rifle')).toEqual(["Sniper"])
  })

  it('PasUneArme_Rien', () => {
    expect(weaponOccupations('See equipment')).toEqual([])
  })
})

describe('occupationOrChoice', () => {
  it('SansMetierTrouve_Vide', () => {
    expect(occupationOrChoice(null, ['Fox', 'Animal'])).toBeNull()
    expect(occupationOrChoice(null, ['Human'])).toBeNull()
    expect(occupationOrChoice([], ['Elf'])).toBeNull()
  })

  it('RaceAuChoix_ClasseAuChoix', () => {
    expect(occupationOrChoice(null, ["Player's choice"])).toEqual(["Player's choice"])
  })

  it('MetierConnu_Garde', () => {
    expect(occupationOrChoice(['Plumber'], ['Human'])).toEqual(['Plumber'])
  })
})

describe('hairOrNone', () => {
  it('RobotSansCheveux_NA', () => {
    expect(hairOrNone(null, ['Robot'])).toEqual(['N/A'])
    expect(hairOrNone(null, ['Fox', 'Animal'])).toEqual(['N/A'])
  })

  it('HumainSansCheveux_Vide', () => {
    expect(hairOrNone(null, ['Human'])).toBeNull()
    expect(hairOrNone(null, ['Human', 'Mutant'])).toBeNull()
  })

  it('CheveuxConnus_Gardes', () => {
    expect(hairOrNone(['Blue'], ['Robot'])).toEqual(['Blue'])
  })
})

describe('translateSpecies', () => {
  it('ClassesDeFiction_NomCourt', () => {
    expect(translateSpecies('être humain de fiction')).toBe('Human')
    expect(translateSpecies('anthropomorphic hedgehog')).toBe('Hedgehog')
    expect(translateSpecies('renard anthropomorphe')).toBe('Fox')
    expect(translateSpecies('fée dans une œuvre de fiction')).toBe('Fairy')
    expect(translateSpecies('elfe de la nuit')).toBe('Elf')
    expect(translateSpecies('•Human')).toBe('Human')
  })

  it('PeupleDUneFranchise_GardeTelQuel', () => {
    expect(translateSpecies('Hylien')).toBe('Hylian')
    expect(translateSpecies('Koopa')).toBe('Koopa')
  })

  it('PasUneEspece_NullOuInconnue', () => {
    expect(translateSpecies('deutéragoniste')).toBeNull()
    expect(translateSpecies('truc inconnu')).toBeUndefined()
  })
})

describe('translateGender', () => {
  it('PlusieursVersions_PasTranche', () => {
    expect(translateGender(['Male (3) Female (4)'])).toBeNull()
    expect(translateGender(['Left 4 Dead, Male, Left 4 Dead 2, Male or Female'])).toBeNull()
    expect(translateGender(['Yes'])).toBeNull()
  })

  it('AutresSexes_NosValeurs', () => {
    expect(translateGender(['genre déterminé par le joueur'])).toBe("Player's choice")
    expect(translateGender(['femme trans'])).toBe('Female')
    expect(translateGender(['sexe inconnu'])).toBeNull()
    expect(translateGender([])).toBeNull()
    expect(translateGender(['autre chose'])).toBeUndefined()
  })
})

describe('translateOccupation', () => {
  it('TitresAuPlurielEtInquisiteur', () => {
    expect(translateOccupation('last of the Slayer Kings of Karak Kadrin')).toBe('Royalty')
    expect(translateOccupation('Inquisitor of the Ordo Xenos')).toBe('Detective')
  })

  it('MembreDUneTribu_PasChef', () => {
    expect(translateOccupation('Rank D Fire-attribute Yo-kai of the Charming tribe')).not.toBe('Clan leader')
    expect(translateOccupation('Leader of the Drakebeard Clan')).toBe('Clan leader')
    expect(translateOccupation('Chieftain')).toBe('Clan leader')
  })

  it('MotQuiEnContientUnAutre_PasLeMetier', () => {
    expect(translateOccupation('servants of the Adeptus Mechanicus')).not.toBe('Mechanic')
    expect(translateOccupation('Mechanic')).toBe('Mechanic')
  })

  it('ValeurExacteDesInfobox_Dictionnaire', () => {
    expect(translateOccupation('Weaponsmith')).toBe('Worker')
    expect(translateOccupation('· Weaponsmith')).toBe('Worker')
    expect(translateOccupation('---- Confederate marshal')).toBe('Police officer')
    expect(translateOccupation('Proprieter of the Mikaelsen Ranch')).toBe('Farmer')
  })

  it('RoleDansLHistoire_Retire', () => {
    expect(translateOccupation('Antagonist')).toBeNull()
    expect(translateOccupation('Companion')).toBeNull()
    expect(translateOccupation('God of chaos')).toBeNull()
  })

  it('OccupationsWikidata_NosFamilles', () => {
    expect(translateOccupation('Pratiquant d\'arts martiaux')).toBe('Fighter')
    expect(translateOccupation('Chasseur de primes')).toBe('Bounty hunter')
    expect(translateOccupation('Chasseur de vampires')).toBe('Monster hunter')
    expect(translateOccupation('Agent de sécurité')).toBe('Guard')
    expect(translateOccupation('Agent double')).toBe('Spy')
    expect(translateOccupation('Patron de bar')).toBe('Waiter')
    expect(translateOccupation('Plombier')).toBe('Plumber')
    expect(translateOccupation('Military impostor')).toBeNull()
  })

  it('OccupationsAnglaises_NosFamilles', () => {
    expect(translateOccupation('Bartender')).toBe('Waiter')
    expect(translateOccupation('Leader of the Horde')).toBe('Leader')
    expect(translateOccupation('CEO of Wayne Enterprises')).toBe("Businessperson")
    expect(translateOccupation('Gym Leader')).toBe('Trainer')
    expect(translateOccupation('Chieftain of the Warsong clan')).toBe('Clan leader')
    expect(translateOccupation('Charter Boat Captain')).toBe('Sailor')
    expect(translateOccupation('General Manager at Dondoko Island')).toBe('Leader')
    expect(translateOccupation('Ex-soldier')).toBe('Soldier')
    expect(translateOccupation('Head of Slytherin House')).toBe('Teacher')
    expect(translateOccupation('Legend')).toBeNull()
  })

  it('TraductionsDuWeebdle_NosFamilles', () => {
    expect(translateOccupation('Leader')).toBe('Leader')
    expect(translateOccupation('Mage')).toBe('Mage')
    expect(translateOccupation('Serviteur')).toBe('Servant')
  })
})

describe('translateDeveloper', () => {
  it('DivisionsInternes_StudioConnu', () => {
    expect(translateDeveloper('Nintendo Entertainment Analysis and Development')).toBe('Nintendo')
    expect(translateDeveloper('Ubisoft Montréal')).toBe('Ubisoft')
    expect(translateDeveloper('Naughty Dog')).toBe('Naughty Dog')
  })
})

describe('translateGenre', () => {
  it('GenresWikidata_NosGenres', () => {
    expect(translateGenre('jeu de plateforme en 3D')).toBe('Platformer')
    expect(translateGenre('action-RPG')).toBe('Action RPG')
    expect(translateGenre('jeu de rôle en ligne massivement multijoueur')).toBe('MMO')
    expect(translateGenre('jeu de combat motorisé')).toBe('Racing')
    expect(translateGenre('science fiction horror')).toBe('Horror')
  })

  it('Themes_Retires', () => {
    expect(translateGenre('jeu vidéo avec des personnages LGBT')).toBeNull()
    expect(translateGenre('jeu vidéo postapocalyptique')).toBeNull()
    expect(translateGenre('cozy game')).toBeNull()
    expect(translateGenre('inventory management video game')).toBeNull()
  })

  it('GenresDeNiche_RamenesOuGardes', () => {
    expect(translateGenre('simulateur de vol spatial')).toBe('Simulation')
    expect(translateGenre('jeu vidéo de pêche')).toBe('Simulation')
    expect(translateGenre('jeu de tir')).toBe('FPS')
    expect(translateGenre('Extraction shooter')).toBe('FPS')
    expect(translateGenre('jeu d\'aventure à la troisième personne')).toBe('Adventure')
    expect(translateGenre('jeu vidéo comprenant des éléments d\'énigme')).toBe('Puzzle')
    expect(translateGenre('Immersive sim')).toBe('Immersive sim')
    expect(translateGenre('monster-taming game')).toBe('Monster-taming')
    expect(translateGenre('walking simulator')).toBe('Walking simulator')
  })
})

describe('translateNationality', () => {
  it('PaysHistoriques_PaysActuel', () => {
    expect(translateNationality('République populaire de Chine')).toBe('China')
    expect(translateNationality('royaume de France')).toBe('France')
    expect(translateNationality('Hyrule')).toBe('Hyrule')
  })

  it('Anglais_Traduit', () => {
    expect(translateNationality('Swiss')).toBe('Switzerland')
    expect(translateNationality('Earth')).toBe('Earth')
  })
})

describe('placeCountry', () => {
  it('VilleReelle_SonPays', () => {
    expect(placeCountry('London')).toBe('United Kingdom')
    expect(placeCountry('The Bronx')).toBe('United States')
    expect(placeCountry('Japanese')).toBe('Japan')
  })

  it('LieuDeFiction_Null', () => {
    expect(placeCountry('Night City')).toBeNull()
  })
})

describe('translatePlace', () => {
  it('BruitAutourDuLieu_Retire', () => {
    expect(translatePlace('Likely Japan')).toEqual(['Japan'])
    expect(translatePlace('Raised on Zebes.')).toEqual(['Zebes'])
    expect(translatePlace('\u{E0067}\u{E0062}\u{E0073} Scottish')).toEqual(['United Kingdom'])
  })

  it('PasUnLieu_Retire', () => {
    expect(translatePlace('40-45 Years Old')).toEqual([])
    expect(translatePlace('Hideout')).toEqual([])
    expect(translatePlace('Abrahamic Mythology')).toEqual([])
    expect(translatePlace('*')).toEqual([])
  })

  it('PaysDHistoireEtGentiles_LeLieu', () => {
    expect(translatePlace('Russian Empire')).toEqual(['Russia'])
    expect(translatePlace('Japanese-Portuguese')).toEqual(['Japan', 'Portugal'])
    expect(translatePlace('Plegian')).toEqual(['Plegia'])
  })
})

describe('translatePlace, harmonisation', () => {
  it('EcrituresDUneVille_UneSeule', () => {
    expect(translatePlace('NYC')).toEqual(['New York', 'United States'])
    expect(translatePlace('New York City')).toEqual(['New York', 'United States'])
    expect(translatePlace('The Bronx')).toEqual(['Bronx', 'United States'])
  })

  it('PrefixeOuLogement_LieuSeulOuRetire', () => {
    expect(translatePlace('Town of Onett')).toEqual(['Onett'])
    expect(translatePlace('1276 Fig Leaf Lane')).toEqual([])
    expect(translatePlace('Jackie\'s Garage')).toEqual([])
    expect(translatePlace('Giant\'s Deep')).toEqual(['Giant\'s Deep'])
  })
})

describe('translatePlace, noms à garder', () => {
  it('VillageOuCiteDansLeNom_Garde', () => {
    expect(translatePlace('Village of Dragons')).toEqual(['Village of Dragons'])
    expect(translatePlace('City of Light')).toEqual(['City of Light'])
  })

  it('LibellesFrancaisDeWikidata_EnAnglais', () => {
    expect(translatePlace('Japon')).toEqual(['Japan'])
    expect(translatePlace('Témérie')).toEqual(['Temeria'])
  })
})

describe('isRealPlace', () => {
  it('PaysVilleAstre_Reels', () => {
    expect(isRealPlace('United States')).toBe(true)
    expect(isRealPlace('Soviet Union')).toBe(true)
    expect(isRealPlace('Turkey')).toBe(true)
    expect(isRealPlace('Mars')).toBe(true)
  })

  it('LieuDeFiction_PasReel', () => {
    expect(isRealPlace('Hyrule')).toBe(false)
    expect(isRealPlace('Night City')).toBe(false)
  })
})

describe('franchiseWorld', () => {
  it('MajoriteDansUnLieuReel_Reel', () => {
    expect(franchiseWorld([['United States'], ['Japan'], ['Arcadia Bay'], null])).toBe('real')
  })

  it('AucunLieuReel_AutreMonde', () => {
    expect(franchiseWorld([['Hyrule'], ['Termina'], ['Hyrule'], null])).toBe('other')
  })

  it('MelangeOuTropPeu_NeSaitPas', () => {
    expect(franchiseWorld([['Mushroom Kingdom'], ['Brooklyn', 'United States'], ['Mushroom Kingdom']])).toBeNull()
    expect(franchiseWorld([['Hyrule'], ['Termina']])).toBeNull()
    expect(franchiseWorld([null, null])).toBeNull()
  })
})

describe('withWorld', () => {
  it('PlaceDansNotreMonde_AjouteMondeReel', () => {
    expect(withWorld(['Boston', 'United States'], ['Human'], null)).toEqual(['Boston', 'United States', 'Monde réel'])
    expect(withWorld(['Hyrule'], ['Hylian'], 'other')).toEqual(['Hyrule'])
  })

  it('SansLieu_LeMondeDeLaFranchise', () => {
    expect(withWorld(null, ['Human'], 'real')).toEqual(['Monde réel'])
    expect(withWorld([], ['Hylian'], 'other')).toBeNull()
    expect(withWorld(null, ['Human'], null)).toBeNull()
  })

  it('VenuDAilleursDansLeMondeReel_Vide', () => {
    expect(withWorld(null, ['Demon'], 'real')).toBeNull()
    expect(withWorld(null, ['Sangheili'], 'real')).toBeNull()
    expect(withWorld(null, ['Fox', 'Animal'], 'real')).toEqual(['Monde réel'])
  })

  it('UniversPartages_AjoutesATous', () => {
    expect(withWorld(['Earth'], ['Human'], 'other', ['Lost in the Galaxy'])).toEqual(['Earth', 'Monde réel', 'Lost in the Galaxy'])
    expect(withWorld(null, ['Human'], 'other', ['Lost in the Galaxy'])).toEqual(['Lost in the Galaxy'])
    expect(withWorld(null, ['Human'], null, ['Lost in the Galaxy'])).toEqual(['Lost in the Galaxy'])
    expect(withWorld(['Eschaton', 'Mythe de Cthulhu'], ['Human'], null, ['Mythe de Cthulhu'])).toEqual(['Eschaton', 'Mythe de Cthulhu'])
  })
})

describe('franchiseUniverses', () => {
  it('EspaceEtMytheDeCthulhu', () => {
    expect(franchiseUniverses('Mass Effect')).toEqual(['Lost in the Galaxy'])
    expect(franchiseUniverses('Sundered')).toEqual(['Mythe de Cthulhu'])
    expect(franchiseUniverses('The Legend of Zelda')).toEqual([])
  })
})
