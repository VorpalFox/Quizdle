import { type AutocompleteInteraction, type ChatInputCommandInteraction, type Interaction, type Message, MessageFlags } from 'discord.js'
import { formatValue } from '../engine/compare.js'
import { type Game, GameError } from '../engine/game.js'
import { findEntry, searchEntries } from '../engine/search.js'
import type { Subject } from '../engine/types.js'
import { hasManual, manualFileName } from '../subjects/manual.js'
import { getSubject, subjects } from '../subjects/registry.js'
import { COMMAND_NAME, DEBUG_COMMAND_NAME, GUESS_COMMAND_NAME } from './commands.js'
import { editAttribute, removeEntry, resolveEntry } from './corrections.js'
import { renderBoard, renderGuess, renderReveal, renderStart } from './render.js'
import type { GameStore } from './store.js'

// Au-delà, un message n'est sûrement pas un nom : on ne cherche même pas
const MAX_MESSAGE_GUESS_LENGTH = 50

// « `/quiz pokedle` ou `/quiz animedle` »
const START_HINT = subjects.map(subject => `\`/${COMMAND_NAME} ${subject.id}\``).join(' ou ')

// File d'attente par salon : deux propositions simultanées sont traitées l'une après l'autre
const queues = new Map<string, Promise<void>>()

function inQueue(channelId: string, task: () => Promise<void>): Promise<void> {
  const run = (queues.get(channelId) ?? Promise.resolve()).then(task)
  queues.set(channelId, run.catch(() => {}))
  return run
}

export async function handleInteraction(interaction: Interaction, store: GameStore): Promise<void> {
  if (interaction.isAutocomplete() && interaction.commandName === GUESS_COMMAND_NAME)
    return handleAutocomplete(interaction, store) // pas de file : Discord laisse 3 s pour répondre, et ça ne modifie rien
  if (interaction.isAutocomplete() && interaction.commandName === DEBUG_COMMAND_NAME)
    return handleDebugAutocomplete(interaction)
  if (!interaction.isChatInputCommand())
    return
  if (interaction.commandName === COMMAND_NAME)
    await inQueue(interaction.channelId, () => handleCommand(interaction, () => runCommand(interaction, store)))
  else if (interaction.commandName === GUESS_COMMAND_NAME)
    await inQueue(interaction.channelId, () => handleCommand(interaction, () => runGuessCommand(interaction, store)))
  else if (interaction.commandName === DEBUG_COMMAND_NAME)
    await handleCommand(interaction, () => runDebugCommand(interaction, store))
}

// Un nom tapé directement dans le salon pendant une partie. Tout ce qui n'est pas un nom du quiz
// est de la discussion normale : on l'ignore sans rien dire.
export async function handleMessage(message: Message, store: GameStore): Promise<void> {
  if (message.author.bot || !message.inGuild() || message.content.length > MAX_MESSAGE_GUESS_LENGTH)
    return
  const game = store.get(message.channelId)
  if (game?.status !== 'playing' || !findEntry(game.subject, message.content))
    return
  await inQueue(message.channelId, async () => {
    // la partie a pu finir pendant l'attente dans la file
    const current = store.get(message.channelId)
    if (current?.status !== 'playing')
      return
    try {
      const guess = current.guess(message.content, message.author.id)
      await message.reply({ embeds: [renderGuess(current, guess)], allowedMentions: { repliedUser: false } })
    } catch (error) {
      if (!(error instanceof GameError))
        throw error
      await message.reply({ content: `⚠️ ${error.message}`, allowedMentions: { repliedUser: false } })
    }
  })
}

async function handleCommand(interaction: ChatInputCommandInteraction, run: () => Promise<void>): Promise<void> {
  try {
    await run()
  } catch (error) {
    if (!(error instanceof GameError))
      throw error
    const message = { content: `⚠️ ${error.message}`, flags: MessageFlags.Ephemeral } as const
    await (interaction.replied || interaction.deferred ? interaction.followUp(message) : interaction.reply(message))
  }
}

async function runCommand(interaction: ChatInputCommandInteraction, store: GameStore): Promise<void> {
  const channelId = interaction.channelId
  const current = store.get(channelId)

  switch (interaction.options.getSubcommand()) {
    case 'board':
      if (!current)
        throw new GameError(`Aucune partie dans ce salon. Lance-en une avec ${START_HINT}.`)
      await interaction.reply({ embeds: [renderBoard(current)] })
      return
    case 'giveup': {
      const game = playingGame(current)
      game.abandon()
      await interaction.reply({ embeds: [renderReveal(game)] })
      return
    }
    // les autres sous-commandes sont les sujets : /quiz pokedle...
    default: {
      if (current?.status === 'playing')
        throw new GameError('Une partie est déjà en cours dans ce salon (`/quiz giveup` pour l\'arrêter).')
      const subject = getSubject(interaction.options.getSubcommand())
      if (!subject)
        throw new GameError('Sujet inconnu.')
      if (store.playedToday(channelId, subject.id))
        throw new GameError(`Le ${subject.name} du jour a déjà été joué dans ce salon. Rendez-vous demain !`)
      const game = store.startDaily(channelId, subject)
      await interaction.reply({ embeds: [renderStart(game)] })
    }
  }
}

async function runGuessCommand(interaction: ChatInputCommandInteraction, store: GameStore): Promise<void> {
  const game = playingGame(store.get(interaction.channelId))
  const guess = game.guess(interaction.options.getString('name', true), interaction.user.id)
  await interaction.reply({ embeds: [renderGuess(game, guess)] })
}

// Le debug n'est accepté que dans un salon précis du serveur de test : tous ceux qui peuvent y écrire peuvent s'en servir
function inDebugChannel(interaction: ChatInputCommandInteraction | AutocompleteInteraction): boolean {
  const { DISCORD_GUILD_ID, DISCORD_DEBUG_CHANNEL_ID } = process.env
  return Boolean(DISCORD_GUILD_ID && DISCORD_DEBUG_CHANNEL_ID)
    && interaction.guildId === DISCORD_GUILD_ID && interaction.channelId === DISCORD_DEBUG_CHANNEL_ID
}

async function runDebugCommand(interaction: ChatInputCommandInteraction, store: GameStore): Promise<void> {
  if (!inDebugChannel(interaction))
    throw new GameError('Commande réservée au salon de debug.')
  const reply = (content: string) => interaction.reply({ content, flags: MessageFlags.Ephemeral })

  switch (interaction.options.getSubcommand()) {
    case 'reset':
      store.reset()
      await reply('🔄 Nouveau tirage du jour, et toutes les parties sont effacées (sur tous les serveurs).')
      return
    case 'remove': {
      const subject = correctableSubject(interaction.options.getString('subject', true))
      const entry = resolveEntry(subject, interaction.options.getString('name', true))
      const { redrawn } = removeEntry(subject, entry, store)
      await reply(`🗑️ **${entry.name}** est retiré du ${subject.name} (\`${manualFileName(subject.id)}\`).`
        + (redrawn ? '\nC\'était la réponse du jour : nouveau tirage pour les prochaines parties (celles en cours gardent leur réponse).' : ''))
      return
    }
    case 'edit': {
      const subject = correctableSubject(interaction.options.getString('subject', true))
      const entry = resolveEntry(subject, interaction.options.getString('name', true))
      const key = interaction.options.getString('attribute', true)
      const attribute = subject.attributes.find(candidate => candidate.key === key)
      if (!attribute)
        throw new GameError(`Le ${subject.name} n'a pas d'attribut « ${key} ».`)
      const { value, unseen, known } = editAttribute(subject, entry, attribute, interaction.options.getString('value', true))
      const warning = unseen.length === 0 ? '' : `\n⚠️ ${unseen.map(item => `« ${item} »`).join(', ')} : aucun autre personnage n'a cette valeur. `
        + `Les plus courantes : ${known.slice(0, 15).join(', ') || 'aucune'}.`
      await reply(`✏️ **${entry.name}** : ${attribute.label} → ${formatValue(attribute, value)}${warning}`)
    }
  }
}

function correctableSubject(id: string): Subject {
  const subject = getSubject(id)
  if (!subject || !hasManual(id))
    throw new GameError(`Le sujet « ${id} » ne se corrige pas avec cette commande.`)
  return subject
}

// L'entrée à corriger : le nom, avec l'anime entre parenthèses pour ne pas confondre deux homonymes
async function handleDebugAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
  const subjectId = interaction.options.getString('subject')
  const subject = subjectId ? getSubject(subjectId) : undefined
  if (!inDebugChannel(interaction) || !subject || !hasManual(subject.id))
    return interaction.respond([])
  const found = searchEntries(subject, interaction.options.getFocused(), 25)
  await interaction.respond(found.map(entry => {
    const anime = entry.attributes.anime
    return { name: (typeof anime === 'string' ? `${entry.name} (${anime})` : entry.name).slice(0, 100), value: entry.id }
  }))
}

function playingGame(game: Game | undefined): Game {
  if (game?.status !== 'playing')
    throw new GameError(`Aucune partie en cours dans ce salon. Lance-en une avec ${START_HINT}.`)
  return game
}

async function handleAutocomplete(interaction: AutocompleteInteraction, store: GameStore): Promise<void> {
  const game = store.get(interaction.channelId)
  if (game?.status !== 'playing')
    return interaction.respond([])
  const found = searchEntries(game.subject, interaction.options.getFocused(), 25, game.guessedIds)
  await interaction.respond(found.map(entry => ({ name: entry.name, value: entry.name })))
}
