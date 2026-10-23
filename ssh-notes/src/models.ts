export const CURRENT_SCHEMA_VERSION = 1

export type SSHNoteEnvironment = 'production' | 'staging' | 'development' | 'other'

export const ENVIRONMENT_VALUES: SSHNoteEnvironment[] = [
  'production',
  'staging',
  'development',
  'other',
]

export const ENVIRONMENT_LABELS: Record<SSHNoteEnvironment, string> = {
  production: '生产',
  staging: '测试',
  development: '开发',
  other: '其他',
}

export const ENVIRONMENT_COLORS: Record<SSHNoteEnvironment, string> = {
  production: '#E05252',
  staging: '#3B82F6',
  development: '#22A06B',
  other: '#8B95A1',
}

export interface EnvironmentOption {
  value: SSHNoteEnvironment
  label: string
  color: string
}

export const ENVIRONMENT_OPTIONS: EnvironmentOption[] = ENVIRONMENT_VALUES.map(value => ({
  value,
  label: ENVIRONMENT_LABELS[value],
  color: ENVIRONMENT_COLORS[value],
}))

export type TitlePriority = 'custom-first' | 'note-first'
export type EmptyTitleBehavior = 'original' | 'profile-name'

export interface SSHNote {
  title: string
  description: string
  environment: SSHNoteEnvironment
  project: string
  owner: string
  tags: string[]
  color: string
  customTerminalTitle: string
  terminalTitleEnabled: boolean
  createdAt: string
  updatedAt: string
}

export interface NoteInput {
  title?: string
  description?: string
  environment?: SSHNoteEnvironment
  project?: string
  owner?: string
  tags?: string[]
  color?: string
  customTerminalTitle?: string
  terminalTitleEnabled?: boolean
}

export interface SSHNotesSettings {
  enabled: boolean
  showListNotes: boolean
  showTerminalTitleNotes: boolean
  showEnvironmentPrefix: boolean
  defaultEnvironment: SSHNoteEnvironment
  emptyTitleBehavior: EmptyTitleBehavior
  titlePriority: TitlePriority
  showTags: boolean
  showEnvironmentColor: boolean
  truncateLongTitles: boolean
  maxTerminalTitleLength: number
  maxListTitleLength: number
}

export interface SSHNotesBackup {
  schemaVersion: number
  savedAt: string
  reason: string
  notes: Record<string, SSHNote>
}

export interface SSHNotesConfig {
  schemaVersion: number
  notes: Record<string, SSHNote>
  settings: SSHNotesSettings
  backup: SSHNotesBackup | null
}

export interface SSHNotesExport {
  schemaVersion: number
  exportedAt: string
  notes: Record<string, SSHNote>
}

export interface PendingImport {
  fileName: string
  document: SSHNotesExport | null
  noteCount: number
  invalidCount: number
  warnings: string[]
  errors: string[]
}

export type ImportMode = 'merge' | 'replace'

export const DEFAULT_SETTINGS: SSHNotesSettings = {
  enabled: true,
  showListNotes: true,
  showTerminalTitleNotes: true,
  showEnvironmentPrefix: true,
  defaultEnvironment: 'production',
  emptyTitleBehavior: 'original',
  titlePriority: 'custom-first',
  showTags: true,
  showEnvironmentColor: true,
  truncateLongTitles: true,
  maxTerminalTitleLength: 80,
  maxListTitleLength: 48,
}

export function createDefaultSettings (): SSHNotesSettings {
  return { ...DEFAULT_SETTINGS }
}

export function isEnvironment (value: unknown): value is SSHNoteEnvironment {
  return typeof value === 'string' && (ENVIRONMENT_VALUES as string[]).includes(value)
}

export function environmentLabel (environment: SSHNoteEnvironment): string {
  return ENVIRONMENT_LABELS[environment] ?? ENVIRONMENT_LABELS.other
}

export function environmentColor (environment: SSHNoteEnvironment): string {
  return ENVIRONMENT_COLORS[environment] ?? ENVIRONMENT_COLORS.other
}

export function isNoteEmpty (note: Pick<SSHNote, 'title' | 'description' | 'project' | 'owner' | 'tags' | 'customTerminalTitle'>): boolean {
  return !note.title.trim() &&
    !note.description.trim() &&
    !note.project.trim() &&
    !note.owner.trim() &&
    !note.customTerminalTitle.trim() &&
    note.tags.length === 0
}

export function createEmptyNote (environment: SSHNoteEnvironment, now = new Date()): SSHNote {
  const timestamp = now.toISOString()
  return {
    title: '',
    description: '',
    environment,
    project: '',
    owner: '',
    tags: [],
    color: '',
    customTerminalTitle: '',
    terminalTitleEnabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
