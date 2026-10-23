import {
  SSHNote,
  SSHNotesSettings,
  environmentLabel,
} from './models'
import { truncateUnicode } from './validation'

function prefixFor (note: SSHNote, settings: SSHNotesSettings): string {
  if (!settings.showEnvironmentPrefix) {
    return ''
  }
  if (note.environment === 'other') {
    return ''
  }
  return `[${environmentLabel(note.environment)}] `
}

function noteTitleWithPrefix (note: SSHNote, settings: SSHNotesSettings): string {
  const title = note.title.trim()
  if (!title) {
    return ''
  }
  const prefix = prefixFor(note, settings)
  if (!prefix) {
    return title
  }
  const prefixLabel = prefix.trim()
  if (title.startsWith(prefixLabel)) {
    return title
  }
  return prefix + title
}

/**
 * Returns the title that should be applied to an SSH terminal tab.
 * An empty string means "do not override the original title".
 */
export function formatTerminalTitle (note: SSHNote | null, settings: SSHNotesSettings): string {
  if (!note || !settings.enabled || !settings.showTerminalTitleNotes || !note.terminalTitleEnabled) {
    return ''
  }

  const custom = note.customTerminalTitle.trim()
  const generated = noteTitleWithPrefix(note, settings)

  let title = ''
  if (settings.titlePriority === 'custom-first') {
    title = custom || generated
  } else {
    title = generated || custom
  }

  if (!title) {
    return ''
  }
  if (settings.truncateLongTitles) {
    return truncateUnicode(title, settings.maxTerminalTitleLength)
  }
  return title
}

/**
 * Returns a readable subtitle for the notes panel.
 */
export function formatListTitle (note: SSHNote | null, settings: SSHNotesSettings): string {
  if (!note || !settings.showListNotes) {
    return ''
  }
  const title = note.title.trim() || note.customTerminalTitle.trim()
  if (!title) {
    return ''
  }
  if (settings.truncateLongTitles) {
    return truncateUnicode(title, settings.maxListTitleLength)
  }
  return title
}

export function noteTitlePreview (note: SSHNote | null, settings: SSHNotesSettings): string {
  return formatTerminalTitle(note, settings)
}
