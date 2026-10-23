import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  ENVIRONMENT_VALUES,
  SSHNote,
  SSHNoteEnvironment,
  SSHNotesBackup,
  SSHNotesConfig,
  SSHNotesExport,
  SSHNotesSettings,
  createDefaultSettings,
  createEmptyNote,
  isEnvironment,
  isNoteEmpty,
} from './models'

export interface SanitizedSettings {
  settings: SSHNotesSettings
  warnings: string[]
}

export interface SanitizedNote {
  note: SSHNote | null
  warnings: string[]
  skipped: boolean
}

export interface SanitizedNotes {
  notes: Record<string, SSHNote>
  warnings: string[]
  invalidCount: number
  totalCount: number
}

export interface MigratedConfig {
  config: SSHNotesConfig
  warnings: string[]
  migrated: boolean
  futureVersion: number | null
}

export interface ParsedImport {
  document: SSHNotesExport | null
  warnings: string[]
  errors: string[]
  invalidCount: number
  noteCount: number
}

const MAX_TITLE = 120
const MAX_DESCRIPTION = 8000
const MAX_SHORT_TEXT = 100
const MAX_TAGS = 20
const MAX_TAG_LENGTH = 32
const MAX_COLOR = 7

function isRecord (value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isSafeNoteKey (key: string): boolean {
  return key !== '__proto__' && key !== 'prototype' && key !== 'constructor'
}

export function safeString (value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

export function clampInt (value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function truncateUnicode (value: string, maxLength: number): string {
  if (maxLength <= 0) {
    return ''
  }
  const characters = Array.from(value)
  if (characters.length <= maxLength) {
    return value
  }
  return characters.slice(0, Math.max(0, maxLength - 1)).join('') + '…'
}

export function isValidHexColor (value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export function normalizeEnvironment (value: unknown): SSHNoteEnvironment {
  if (typeof value !== 'string') {
    return 'other'
  }
  const normalized = value.trim().toLowerCase()
  const aliases: Record<string, SSHNoteEnvironment> = {
    prod: 'production',
    production: 'production',
    stage: 'staging',
    staging: 'staging',
    dev: 'development',
    development: 'development',
    test: 'staging',
    testing: 'staging',
    other: 'other',
  }
  return aliases[normalized] ?? 'other'
}

export function normalizeTags (value: unknown): { tags: string[], warnings: string[] } {
  const warnings: string[] = []
  if (value === undefined || value === null) {
    return { tags: [], warnings }
  }
  if (!Array.isArray(value)) {
    return { tags: [], warnings: ['标签字段不是数组，已忽略'] }
  }

  const result: string[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    if (typeof raw !== 'string') {
      warnings.push('已忽略非字符串标签')
      continue
    }
    let tag = raw.trim()
    if (!tag) {
      continue
    }
    if (tag.length > MAX_TAG_LENGTH) {
      tag = truncateUnicode(tag, MAX_TAG_LENGTH)
      warnings.push(`标签过长，已截断为“${tag}”`)
    }
    const key = tag.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(tag)
  }

  if (result.length > MAX_TAGS) {
    warnings.push(`标签数量超过 ${MAX_TAGS} 个，多出的标签已忽略`)
  }
  return { tags: result.slice(0, MAX_TAGS), warnings }
}

function normalizeTimestamp (value: unknown, fallback: string): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString()
  }
  return fallback
}

export function sanitizeNote (
  raw: unknown,
  fallbackEnvironment: SSHNoteEnvironment = 'production',
  now: Date = new Date(),
): SanitizedNote {
  const warnings: string[] = []
  const timestamp = now.toISOString()

  if (!isRecord(raw)) {
    return {
      note: null,
      warnings: ['备注条目不是对象'],
      skipped: true,
    }
  }

  let title = safeString(raw.title).trim()
  if (title.length > MAX_TITLE) {
    title = truncateUnicode(title, MAX_TITLE)
    warnings.push('备注标题过长，已截断')
  }

  let description = safeString(raw.description).trim()
  if (description.length > MAX_DESCRIPTION) {
    description = truncateUnicode(description, MAX_DESCRIPTION)
    warnings.push('详细说明过长，已截断')
  }

  const environment = normalizeEnvironment(raw.environment ?? fallbackEnvironment)
  if (raw.environment !== undefined && !isEnvironment(raw.environment) && environment === 'other' && String(raw.environment).toLowerCase() !== 'other') {
    warnings.push(`未知环境“${String(raw.environment)}”，已归为“其他”`)
  }

  let project = safeString(raw.project).trim()
  if (project.length > MAX_SHORT_TEXT) {
    project = truncateUnicode(project, MAX_SHORT_TEXT)
    warnings.push('项目名称过长，已截断')
  }

  let owner = safeString(raw.owner).trim()
  if (owner.length > MAX_SHORT_TEXT) {
    owner = truncateUnicode(owner, MAX_SHORT_TEXT)
    warnings.push('负责人字段过长，已截断')
  }

  const tagResult = normalizeTags(raw.tags)
  warnings.push(...tagResult.warnings)

  let color = safeString(raw.color).trim()
  if (color && !isValidHexColor(color)) {
    warnings.push(`颜色“${color}”格式无效，已清空`)
    color = ''
  }
  if (color.length > MAX_COLOR) {
    color = ''
  }

  let customTerminalTitle = safeString(raw.customTerminalTitle).trim()
  if (customTerminalTitle.length > MAX_TITLE) {
    customTerminalTitle = truncateUnicode(customTerminalTitle, MAX_TITLE)
    warnings.push('自定义终端标题过长，已截断')
  }

  const terminalTitleEnabled = typeof raw.terminalTitleEnabled === 'boolean'
    ? raw.terminalTitleEnabled
    : true

  const createdAt = normalizeTimestamp(raw.createdAt, timestamp)
  const updatedAt = normalizeTimestamp(raw.updatedAt, createdAt)

  const note: SSHNote = {
    title,
    description,
    environment,
    project,
    owner,
    tags: tagResult.tags,
    color,
    customTerminalTitle,
    terminalTitleEnabled,
    createdAt,
    updatedAt: updatedAt < createdAt ? createdAt : updatedAt,
  }

  if (isNoteEmpty(note)) {
    return {
      note: null,
      warnings: [...warnings, '空备注条目已跳过'],
      skipped: true,
    }
  }

  return { note, warnings, skipped: false }
}

export function sanitizeSettings (raw: unknown): SanitizedSettings {
  const warnings: string[] = []
  if (!isRecord(raw)) {
    return { settings: createDefaultSettings(), warnings: ['设置不是对象，已使用默认值'] }
  }

  const defaults = DEFAULT_SETTINGS
  const bool = (key: keyof SSHNotesSettings, fallback: boolean): boolean => {
    const value = raw[key]
    if (typeof value === 'boolean') {
      return value
    }
    if (value !== undefined) {
      warnings.push(`设置 ${String(key)} 不是布尔值，已使用默认值`)
    }
    return fallback
  }

  const defaultEnvironment = isEnvironment(raw.defaultEnvironment)
    ? raw.defaultEnvironment
    : defaults.defaultEnvironment
  if (raw.defaultEnvironment !== undefined && !isEnvironment(raw.defaultEnvironment)) {
    warnings.push('默认环境无效，已使用“生产”')
  }

  const emptyTitleBehavior = raw.emptyTitleBehavior === 'profile-name'
    ? 'profile-name'
    : 'original'
  if (raw.emptyTitleBehavior !== undefined && !['original', 'profile-name'].includes(raw.emptyTitleBehavior)) {
    warnings.push('空备注标题行为无效，已使用“保持原样”')
  }

  const titlePriority = raw.titlePriority === 'note-first'
    ? 'note-first'
    : 'custom-first'
  if (raw.titlePriority !== undefined && !['custom-first', 'note-first'].includes(raw.titlePriority)) {
    warnings.push('标题优先级无效，已使用“自定义终端标题优先”')
  }

  return {
    settings: {
      enabled: bool('enabled', true),
      showListNotes: bool('showListNotes', true),
      showTerminalTitleNotes: bool('showTerminalTitleNotes', true),
      showEnvironmentPrefix: bool('showEnvironmentPrefix', true),
      defaultEnvironment,
      emptyTitleBehavior,
      titlePriority,
      showTags: bool('showTags', true),
      showEnvironmentColor: bool('showEnvironmentColor', true),
      truncateLongTitles: bool('truncateLongTitles', true),
      maxTerminalTitleLength: clampInt(raw.maxTerminalTitleLength, defaults.maxTerminalTitleLength, 20, 200),
      maxListTitleLength: clampInt(raw.maxListTitleLength, defaults.maxListTitleLength, 10, 120),
    },
    warnings,
  }
}

export function sanitizeNotes (
  raw: unknown,
  fallbackEnvironment: SSHNoteEnvironment = 'production',
  now: Date = new Date(),
): SanitizedNotes {
  const warnings: string[] = []
  const notes: Record<string, SSHNote> = {}
  let invalidCount = 0
  let totalCount = 0

  let entries: Array<[string, unknown]> = []
  if (isRecord(raw)) {
    entries = Object.entries(raw)
  } else if (Array.isArray(raw)) {
    entries = raw.map((item, index) => {
      if (isRecord(item) && typeof item.profileId === 'string') {
        return [item.profileId, item] as [string, unknown]
      }
      return [`legacy-${index}`, item] as [string, unknown]
    })
  } else if (raw !== undefined && raw !== null) {
    return { notes, warnings: ['备注集合不是对象或数组'], invalidCount: 1, totalCount: 1 }
  }

  for (const [rawId, value] of entries) {
    totalCount++
    const profileId = String(rawId).trim()
    if (!profileId) {
      invalidCount++
      warnings.push('已跳过空 Profile ID 的备注')
      continue
    }
    if (!isSafeNoteKey(profileId)) {
      invalidCount++
      warnings.push('已跳过不安全的 Profile ID 键名')
      continue
    }
    if (profileId.startsWith('legacy-') && isRecord(value) && typeof value.profileId !== 'string') {
      invalidCount++
      warnings.push('已跳过缺少 profileId 的旧格式备注')
      continue
    }
    const result = sanitizeNote(value, fallbackEnvironment, now)
    warnings.push(...result.warnings.map(x => `${profileId}: ${x}`))
    if (!result.note) {
      invalidCount++
      continue
    }
    notes[profileId] = result.note
  }

  return { notes, warnings, invalidCount, totalCount }
}

export function migrateConfig (raw: unknown, now: Date = new Date()): MigratedConfig {
  const warnings: string[] = []
  const defaults = createDefaultSettings()
  const source = isRecord(raw) ? raw : {}
  const rawVersion = source.schemaVersion
  const version = typeof rawVersion === 'number' && Number.isFinite(rawVersion)
    ? Math.max(0, Math.floor(rawVersion))
    : 0
  const futureVersion = version > CURRENT_SCHEMA_VERSION ? version : null

  if (rawVersion !== undefined && typeof rawVersion !== 'number') {
    warnings.push('数据版本号无效，已按版本 0 处理')
  }
  if (futureVersion) {
    warnings.push(`备注数据版本 ${futureVersion} 高于当前插件支持的版本 ${CURRENT_SCHEMA_VERSION}，插件将进入只读模式。`)
  }

  const settingsResult = sanitizeSettings(source.settings)
  warnings.push(...settingsResult.warnings)

  const notesResult = sanitizeNotes(source.notes, settingsResult.settings.defaultEnvironment, now)
  warnings.push(...notesResult.warnings)

  let backup: SSHNotesBackup | null = null
  if (isRecord(source.backup)) {
    const backupNotes = sanitizeNotes(source.backup.notes, settingsResult.settings.defaultEnvironment, now)
    backup = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt: normalizeTimestamp(source.backup.savedAt, now.toISOString()),
      reason: safeString(source.backup.reason, 'unknown'),
      notes: backupNotes.notes,
    }
    if (backupNotes.invalidCount > 0) {
      warnings.push(`备份中有 ${backupNotes.invalidCount} 条无效备注已忽略`)
    }
  }

  const migrated = version < CURRENT_SCHEMA_VERSION ||
    !isRecord(source.settings) ||
    !isRecord(source.notes)

  return {
    config: {
      schemaVersion: futureVersion ?? CURRENT_SCHEMA_VERSION,
      notes: notesResult.notes,
      settings: settingsResult.settings,
      backup,
    },
    warnings,
    migrated: migrated && !futureVersion,
    futureVersion,
  }
}

export function parseImportDocument (text: string, now: Date = new Date()): ParsedImport {
  const errors: string[] = []
  const warnings: string[] = []
  let raw: unknown
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch (error) {
    return {
      document: null,
      warnings,
      errors: [`JSON 解析失败：${error instanceof Error ? error.message : String(error)}`],
      invalidCount: 0,
      noteCount: 0,
    }
  }

  if (!isRecord(raw)) {
    return {
      document: null,
      warnings,
      errors: ['文件根节点必须是 JSON 对象'],
      invalidCount: 0,
      noteCount: 0,
    }
  }

  if (raw.schemaVersion !== undefined && (typeof raw.schemaVersion !== 'number' || !Number.isFinite(raw.schemaVersion))) {
    errors.push('schemaVersion 必须是数字')
  }
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion > CURRENT_SCHEMA_VERSION) {
    errors.push(`文件版本 ${raw.schemaVersion} 高于当前支持版本 ${CURRENT_SCHEMA_VERSION}`)
  }
  if (raw.notes === undefined || raw.notes === null) {
    errors.push('缺少 notes 字段')
  }
  if (!isRecord(raw.notes) && !Array.isArray(raw.notes)) {
    errors.push('notes 必须是对象或以 profileId 为键的数组')
  }
  if (errors.length) {
    return { document: null, warnings, errors, invalidCount: 0, noteCount: 0 }
  }

  const result = sanitizeNotes(raw.notes, DEFAULT_SETTINGS.defaultEnvironment, now)
  warnings.push(...result.warnings)

  if (result.invalidCount > 0) {
    warnings.push(`${result.invalidCount} 条备注无效，导入时将跳过`)
  }

  const document: SSHNotesExport = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' && !Number.isNaN(Date.parse(raw.exportedAt))
      ? new Date(raw.exportedAt).toISOString()
      : now.toISOString(),
    notes: result.notes,
  }

  return {
    document,
    warnings,
    errors,
    invalidCount: result.invalidCount,
    noteCount: Object.keys(result.notes).length,
  }
}

export function cloneNote (note: SSHNote): SSHNote {
  return {
    ...note,
    tags: [...note.tags],
  }
}

export function cloneNotes (notes: Record<string, SSHNote>): Record<string, SSHNote> {
  const result: Record<string, SSHNote> = {}
  for (const [id, note] of Object.entries(notes)) {
    if (!isSafeNoteKey(id)) {
      continue
    }
    result[id] = cloneNote(note)
  }
  return result
}

export function makeDefaultNote (environment: SSHNoteEnvironment, now = new Date()): SSHNote {
  return createEmptyNote(environment, now)
}

export function isKnownEnvironment (value: unknown): value is SSHNoteEnvironment {
  return isEnvironment(value) && ENVIRONMENT_VALUES.includes(value)
}
