import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import nodemailer from 'nodemailer'

// state/ à la racine, même chemin relatif depuis src/bot et dist/bot
const CRASH_FILE = new URL('../../state/last-crash.json', import.meta.url)

// Un plantage moins de 10 min après le précédent veut dire que le redémarrage a raté : on reste arrêté
const FAILED_RESTART_WINDOW_MS = 10 * 60_000

// Listé dans stop_exit_codes de ecosystem.config.cjs : pm2 ne relance pas le bot quand il sort avec ce code
const STOP_EXIT_CODE = 78

const MAIL_TIMEOUT_MS = 10_000

let crashing = false

// Arrête le bot proprement : log, mail d'alerte, puis sortie. pm2 relance après un premier plantage,
// mais pas si le bot replante dans les 10 min qui suivent
export async function crash(reason: string, error?: unknown): Promise<void> {
  if (crashing)
    return
  crashing = true

  const details = error instanceof Error ? error.stack ?? error.message : error === undefined ? '' : String(error)
  console.error(`Arrêt du bot : ${reason}`, details)

  const now = Date.now()
  const previous = readLastCrash()
  const giveUp = previous !== undefined && now - previous < FAILED_RESTART_WINDOW_MS
  writeLastCrash(now)

  const next = giveUp
    ? 'Il avait déjà planté il y a moins de 10 min : pm2 ne le relancera pas. Après correction : pm2 restart quizdle'
    : 'pm2 va le relancer. S\'il replante dans les 10 min, il restera arrêté.'
  await sendAlert(`Quizdle ${giveUp ? 'arrêté' : 'a planté'} : ${reason}`, `${reason}\n\n${next}\n\n${details}`)

  process.exit(giveUp ? STOP_EXIT_CODE : 1)
}

function readLastCrash(): number | undefined {
  try {
    const { at } = JSON.parse(readFileSync(CRASH_FILE, 'utf8')) as { at?: unknown }
    return typeof at === 'number' ? at : undefined
  } catch {
    return undefined
  }
}

function writeLastCrash(at: number): void {
  try {
    mkdirSync(new URL('.', CRASH_FILE), { recursive: true })
    writeFileSync(CRASH_FILE, JSON.stringify({ at }))
  } catch (error) {
    console.error('Impossible d\'enregistrer le plantage', error)
  }
}

// SMTP à remplir dans le .env, sinon le plantage est seulement loggé
async function sendAlert(subject: string, text: string): Promise<void> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_EMAIL } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('Mail d\'alerte non envoyé : SMTP_HOST, SMTP_USER ou SMTP_PASS manquant dans le .env')
    return
  }

  const port = Number(SMTP_PORT || 465)
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: MAIL_TIMEOUT_MS,
    greetingTimeout: MAIL_TIMEOUT_MS,
    socketTimeout: MAIL_TIMEOUT_MS,
  })
  try {
    await transport.sendMail({ from: SMTP_USER, to: ALERT_EMAIL || SMTP_USER, subject, text })
    console.log(`Mail d'alerte envoyé à ${ALERT_EMAIL || SMTP_USER}`)
  } catch (error) {
    console.error('Échec de l\'envoi du mail d\'alerte', error)
  }
}
