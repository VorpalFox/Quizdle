import { EmbedBuilder } from 'discord.js'
import { type Feedback, formatValue } from '../engine/compare.js'
import type { Game, Guess } from '../engine/game.js'

const FEEDBACK_EMOJI: Record<Feedback, string> = {
  correct: '🟩',
  partial: '🟨',
  wrong: '🟥',
  higher: '⬆️',
  lower: '⬇️',
}

const COLOR_PLAYING = 0x5865f2
const COLOR_WON = 0x57f287
const COLOR_LOST = 0xed4245

const LEGEND = '🟩 juste · 🟨 en partie · 🟥 faux · ⬆️ c\'est plus · ⬇️ c\'est moins'

// « Pokédle du jour » ou « Pokédle » pour une partie libre
function gameTitle(game: Game): string {
  return game.day ? `${game.subject.name} du jour` : game.subject.name
}

export function renderStart(game: Game): EmbedBuilder {
  const limit = game.remainingGuesses === null ? 'Essais illimités' : `${game.remainingGuesses} essais`
  return new EmbedBuilder()
    .setColor(COLOR_PLAYING)
    .setTitle(`🔎 ${gameTitle(game)}`)
    .setDescription(`${game.subject.description} ! Propose avec \`/quiz guess\`.\n${limit}.\n\nIndices : ${game.subject.attributes.map(a => a.label).join(', ')}\n${LEGEND}`)
}

export function renderGuess(game: Game, guess: Guess): EmbedBuilder {
  const lines = guess.results.map(result => `${FEEDBACK_EMOJI[result.feedback]} **${result.attribute.label}** : ${formatValue(result.attribute, result.value)}`)
  const embed = new EmbedBuilder()
    .setColor(guess.correct ? COLOR_WON : COLOR_PLAYING)
    .setTitle(`#${game.guesses.length} · ${guess.entry.name}`)
    .setDescription(`Proposé par <@${guess.playerId}>\n\n${lines.join('\n')}`)
  if (guess.entry.image)
    embed.setThumbnail(guess.entry.image)
  if (guess.correct)
    embed.addFields({ name: '🎉 Trouvé !', value: `En ${game.guesses.length} essai${game.guesses.length > 1 ? 's' : ''}.` })
  else if (game.status === 'lost')
    embed.addFields({ name: '💀 Perdu', value: `C'était **${game.target.name}**.` })
  else if (game.remainingGuesses !== null)
    embed.setFooter({ text: `Encore ${game.remainingGuesses} essai${game.remainingGuesses > 1 ? 's' : ''}` })
  return embed
}

// Une ligne d'emojis par proposition, la plus récente en haut (comme sur les sites -dle)
export function renderBoard(game: Game): EmbedBuilder {
  const header = game.subject.attributes.map(a => a.label).join(' · ')
  const lines = [...game.guesses].reverse().map(guess => `${guess.results.map(r => FEEDBACK_EMOJI[r.feedback]).join('')} ${guess.entry.name}`)
  // une description d'embed est limitée à 4096 caractères
  let description = lines.length ? lines.join('\n') : 'Aucune proposition pour le moment.'
  if (description.length > 4000)
    description = `${description.slice(0, 4000)}\n…`
  return new EmbedBuilder()
    .setColor(COLOR_PLAYING)
    .setTitle(`🔎 ${gameTitle(game)} · ${game.guesses.length} proposition${game.guesses.length > 1 ? 's' : ''}`)
    .setDescription(`*${header}*\n\n${description}`)
}

export function renderReveal(game: Game): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLOR_LOST)
    .setTitle('🏳️ Abandon')
    .setDescription(`C'était **${game.target.name}**, après ${game.guesses.length} proposition${game.guesses.length > 1 ? 's' : ''}.`)
  if (game.target.image)
    embed.setThumbnail(game.target.image)
  return embed
}
