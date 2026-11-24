import { InteractionContextType, SlashCommandBuilder, type SlashCommandSubcommandBuilder } from 'discord.js'
import { manualSubjectIds } from '../subjects/manual.js'
import { getSubject, subjects } from '../subjects/registry.js'

export const COMMAND_NAME = 'quiz'
export const GUESS_COMMAND_NAME = 'guess'
export const DEBUG_COMMAND_NAME = 'quizdebug'

export const quizCommand = new SlashCommandBuilder()
  .setName(COMMAND_NAME)
  .setDescription('Guess the mystery item of the day')
  .setContexts(InteractionContextType.Guild)

// Une sous-commande par sujet, nommée d'après son id : /quiz pokedle, /quiz animedle...
for (const subject of subjects)
  quizCommand.addSubcommand(sub => sub.setName(subject.id).setDescription(`Play today's ${subject.name} in this channel (same answer for everyone)`))

quizCommand
  .addSubcommand(sub => sub.setName('board').setDescription('Show every guess so far'))
  .addSubcommand(sub => sub.setName('giveup').setDescription('Give up and reveal the answer'))

// Commande à part pour qu'elle soit courte à taper : /guess pika…
export const guessCommand = new SlashCommandBuilder()
  .setName(GUESS_COMMAND_NAME)
  .setDescription('Make a guess in this channel\'s quiz')
  .setContexts(InteractionContextType.Guild)
  .addStringOption(option => option.setName('name').setDescription('Your guess').setRequired(true).setAutocomplete(true))

// Debug, à virer plus tard : enregistrée seulement sur le serveur de test (DISCORD_GUILD_ID), et le bot ne l'accepte
// que dans le salon DISCORD_DEBUG_CHANNEL_ID. Visible de tous sur ce serveur : pour la cacher ailleurs,
// Paramètres du serveur > Intégrations > le bot > /quizdebug, et ne l'autoriser que dans ce salon.
export const debugCommand = new SlashCommandBuilder()
  .setName(DEBUG_COMMAND_NAME)
  .setDescription('Debug tools (debug channel only)')
  .setContexts(InteractionContextType.Guild)
  .addSubcommand(sub => sub.setName('reset').setDescription('Draw new answers for today and forget every game'))
  .addSubcommand(sub => addEntryOptions(sub.setName('remove').setDescription('Remove an entry from a quiz for good (saved in data/<subject>-manual.json)')))
  .addSubcommand(sub => addEntryOptions(sub.setName('edit').setDescription('Change or fill an attribute of an entry (saved in data/<subject>-manual.json)'))
    .addStringOption(option => option.setName('attribute').setDescription('Attribute to change').setRequired(true).addChoices(...correctableAttributes()))
    .addStringOption(option => option.setName('value').setDescription('New value. Several: "Blancs, Noirs". Empty: "-". Not applicable: "n/a"').setRequired(true)))

// Sujet (ceux qui ont un fichier de corrections) + entrée, avec l'autocomplétion
function addEntryOptions(sub: SlashCommandSubcommandBuilder): SlashCommandSubcommandBuilder {
  return sub
    .addStringOption(option => option.setName('subject').setDescription('Quiz').setRequired(true)
      .addChoices(...manualSubjectIds.map(id => ({ name: getSubject(id)?.name ?? id, value: id }))))
    .addStringOption(option => option.setName('name').setDescription('Entry').setRequired(true).setAutocomplete(true))
}

// Les attributs des sujets corrigeables (Animedle et Weebdle partagent les mêmes)
function correctableAttributes(): { name: string, value: string }[] {
  const attributes = new Map(manualSubjectIds.flatMap(id => getSubject(id)?.attributes ?? []).map(attribute => [attribute.key, attribute.label]))
  return [...attributes].map(([key, label]) => ({ name: label, value: key }))
}
