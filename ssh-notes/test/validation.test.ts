import {
  DEFAULT_SETTINGS,
  SSHNote,
  SSHNotesConfig,
} from '../src/models'
import {
  migrateConfig,
  normalizeTags,
  parseImportDocument,
  sanitizeNote,
  sanitizeNotes,
  sanitizeSettings,
  truncateUnicode,
} from '../src/validation'

function note (overrides: Partial<SSHNote> = {}): SSHNote {
  return {
    title: 'API 主节点',
    description: '生产环境 API 服务',
    environment: 'production',
    project: 'example-project',
    owner: '运维',
    tags: ['生产', 'API'],
    color: '#E05252',
    customTerminalTitle: '',
    terminalTitleEnabled: true,
    createdAt: '2026-10-23T00:00:00.000Z',
    updatedAt: '2026-10-23T00:00:00.000Z',
    ...overrides,
  }
}

describe('validation', () => {
  test('normalizes tags by trimming and de-duplicating case-insensitively', () => {
    const result = normalizeTags([' 生产 ', 'API', 'api', '', '  ', 'API '])
    expect(result.tags).toEqual(['生产', 'API'])
  })

  test('rejects non-array tags without throwing', () => {
    const result = normalizeTags('not-an-array')
    expect(result.tags).toEqual([])
    expect(result.warnings.length).toBe(1)
  })

  test('truncates unicode strings without splitting surrogate pairs', () => {
    expect(truncateUnicode('😀😀😀😀', 3)).toBe('😀😀…')
    expect(truncateUnicode('abc', 5)).toBe('abc')
  })

  test('sanitizes a valid note and preserves timestamps', () => {
    const result = sanitizeNote(note())
    expect(result.note).not.toBeNull()
    expect(result.note!.title).toBe('API 主节点')
    expect(result.note!.tags).toEqual(['生产', 'API'])
    expect(result.note!.createdAt).toBe('2026-10-23T00:00:00.000Z')
  })

  test('drops a completely empty note', () => {
    const result = sanitizeNote({
      title: '',
      description: '',
      project: '',
      owner: '',
      tags: [],
      customTerminalTitle: '',
    })
    expect(result.note).toBeNull()
    expect(result.skipped).toBe(true)
  })

  test('normalizes unknown environments to other', () => {
    const result = sanitizeNote(note({ environment: 'qa' as any }))
    expect(result.note!.environment).toBe('other')
    expect(result.warnings.some(w => w.includes('未知环境'))).toBe(true)
  })

  test('clears invalid colors and keeps valid ones', () => {
    expect(sanitizeNote(note({ color: 'red' })).note!.color).toBe('')
    expect(sanitizeNote(note({ color: '#aabbcc' })).note!.color).toBe('#aabbcc')
  })

  test('sanitizes settings with bounds and defaults', () => {
    const result = sanitizeSettings({
      enabled: 'yes',
      maxTerminalTitleLength: 9999,
      maxListTitleLength: -1,
      defaultEnvironment: 'nope',
    })
    expect(result.settings.enabled).toBe(true)
    expect(result.settings.maxTerminalTitleLength).toBe(200)
    expect(result.settings.maxListTitleLength).toBe(10)
    expect(result.settings.defaultEnvironment).toBe('production')
  })

  test('migrates a schema 0 store without losing notes', () => {
    const raw: any = {
      notes: {
        'ssh:custom:x:1': note(),
      },
      settings: {
        showEnvironmentPrefix: false,
      },
    }
    const result = migrateConfig(raw)
    expect(result.migrated).toBe(true)
    expect(result.config.schemaVersion).toBe(1)
    expect(result.config.notes['ssh:custom:x:1'].title).toBe('API 主节点')
    expect(result.config.settings.showEnvironmentPrefix).toBe(false)
  })

  test('marks future schema versions as read-only candidates', () => {
    const config: SSHNotesConfig = {
      schemaVersion: 99,
      notes: {},
      settings: { ...DEFAULT_SETTINGS },
      backup: null,
    }
    const result = migrateConfig(config)
    expect(result.futureVersion).toBe(99)
    expect(result.migrated).toBe(false)
  })

  test('parses a valid import document and reports invalid entries', () => {
    const text = JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-10-23T00:00:00.000Z',
      notes: {
        good: note(),
        bad: { title: 42 },
      },
    })
    const result = parseImportDocument(text)
    expect(result.errors).toEqual([])
    expect(result.noteCount).toBe(1)
    expect(result.invalidCount).toBe(1)
    expect(result.document!.notes.good.title).toBe('API 主节点')
  })

  test('rejects malformed JSON with an explicit error', () => {
    const result = parseImportDocument('{not json')
    expect(result.document).toBeNull()
    expect(result.errors[0]).toContain('JSON 解析失败')
  })

  test('does not accept prototype-pollution keys as note IDs', () => {
    const raw = JSON.parse('{"__proto__":{"title":"evil"},"constructor":{"title":"evil"}}')
    const result = sanitizeNotes(raw)
    expect(Object.keys(result.notes)).toEqual([])
    expect(result.invalidCount).toBe(2)
  })

  test('rejects future import schema versions', () => {
    const result = parseImportDocument(JSON.stringify({ schemaVersion: 2, notes: {} }))
    expect(result.document).toBeNull()
    expect(result.errors.some(e => e.includes('高于当前支持版本'))).toBe(true)
  })

  test('rejects import files without notes', () => {
    const result = parseImportDocument(JSON.stringify({ schemaVersion: 1 }))
    expect(result.document).toBeNull()
    expect(result.errors.some(e => e.includes('缺少 notes'))).toBe(true)
  })
})
