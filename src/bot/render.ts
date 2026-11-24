import { EmbedBuilder } from 'discord.js'
import { type AttributeResult, type Feedback, formatValue } from '../engine/compare.js'
import type { Game, Guess } from '../engine/game.js'
import { displayName } from '../engine/search.js'

const FEEDBACK_EMOJI: Record<Feedback, string> = {
  correct: '🟩',
  partial: '🟨',
  wrong: '🟥',
  higher: '⬆️',
  lower: '⬇️',
  unknown: '❔',
}

const COLOR_PLAYING = 0x5865f2
const COLOR_WON = 0x57f287
const COLOR_LOST = 0xed4245

const LEGEND = '🟩 juste · 🟨 en partie · 🟥 faux · ⬆️ c\'est plus · ⬇️ c\'est moins · ❔ inconnu pour la réponse'

// « Pokédle du jour »
function gameTitle(game: Game): string {
  return `${game.subject.name} du jour`
}

export function renderStart(game: Game): EmbedBuilder {
  const limit = game.remainingGuesses === null ? 'Essais illimités' : `${game.remainingGuesses} essais`
  return new EmbedBuilder()
    .setColor(COLOR_PLAYING)
    .setTitle(`🔎 ${gameTitle(game)}`)
    .setDescription(`${game.subject.description} ! Écris un nom dans le salon, ou utilise \`/guess\` pour avoir l'autocomplétion.\n${limit}.\n\nIndices : ${game.subject.attributes.map(a => a.label).join(', ')}\n${LEGEND}`)
}

// En partie juste : les valeurs en commun avec la cible en gras (« **Action** / Romance »)
function formatResult(result: AttributeResult): string {
  const { attribute, value, feedback, common } = result
  if (feedback !== 'partial' || attribute.format || !Array.isArray(value))
    return formatValue(attribute, value)
  return (value as readonly (string | number)[]).map(item => common.includes(item) ? `**${item}**` : String(item)).join(' / ')
}

export function renderGuess(game: Game, guess: Guess): EmbedBuilder {
  const lines = guess.results.map(result => `${FEEDBACK_EMOJI[result.feedback]} **${result.attribute.label}** : ${formatResult(result)}`)
  const embed = new EmbedBuilder()
    .setColor(guess.correct ? COLOR_WON : COLOR_PLAYING)
    .setTitle(`#${game.guesses.length} · ${displayName(game.subject, guess.entry)}`)
    .setDescription(`Proposé par <@${guess.playerId}>\n\n${lines.join('\n')}`)
  if (guess.entry.image)
    embed.setThumbnail(guess.entry.image)
  if (guess.correct)
    embed.addFields({ name: '🎉 Trouvé !', value: `En ${game.guesses.length} essai${game.guesses.length > 1 ? 's' : ''}.` })
  else if (game.status === 'lost')
    embed.addFields({ name: '💀 Perdu', value: `C'était **${displayName(game.subject, game.target, true)}**.` })
  else if (game.remainingGuesses !== null)
    embed.setFooter({ text: `Encore ${game.remainingGuesses} essai${game.remainingGuesses > 1 ? 's' : ''}` })
  return embed
}

// Une ligne d'emojis par proposition, la plus récente en haut (comme sur les sites -dle)
export function renderBoard(game: Game): EmbedBuilder {
  const header = game.subject.attributes.map(a => a.label).join(' · ')
  const lines = [...game.guesses].reverse().map(guess => `${guess.results.map(r => FEEDBACK_EMOJI[r.feedback]).join('')} ${displayName(game.subject, guess.entry)}`)
  // une description d'embed est limitée à 4096 caractères
  let description = lines.length ? lines.join('\n') : 'Aucune proposition pour le moment.'
  if (description.length > 4000)
    description = `${description.slice(0, 4000)}\n…`
  return new EmbedBuilder()
    .setColor(COLOR_PLAYING)
    .setTitle(`🔎 ${gameTitle(game)} · ${game.guesses.length} proposition${game.guesses.length > 1 ? 's' : ''}`)
    .setDescription(`*${header}*\n\n${description}`)
}

// La réponse donnée, toujours avec son univers (franchise, anime) : on sait d'où sort le perso
export function renderReveal(game: Game): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLOR_LOST)
    .setTitle('🏳️ Abandon')
    .setDescription(`C'était **${displayName(game.subject, game.target, true)}**, après ${game.guesses.length} proposition${game.guesses.length > 1 ? 's' : ''}.`)
  if (game.target.image)
    embed.setThumbnail(game.target.image)
  return embed
}
