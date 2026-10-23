import { createDefaultSettings, SSHNote } from '../src/models'
import { formatListTitle, formatTerminalTitle } from '../src/title'

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

describe('terminal title rules', () => {
  test('uses environment prefix and note title by default', () => {
    const settings = createDefaultSettings()
    expect(formatTerminalTitle(note(), settings)).toBe('[生产] API 主节点')
  })

  test('uses a custom terminal title first by default', () => {
    const settings = createDefaultSettings()
    expect(formatTerminalTitle(note({ customTerminalTitle: '生产 / API / example-project' }), settings))
      .toBe('生产 / API / example-project')
  })

  test('supports note-first priority', () => {
    const settings = createDefaultSettings()
    settings.titlePriority = 'note-first'
    expect(formatTerminalTitle(note({ customTerminalTitle: 'custom' }), settings))
      .toBe('[生产] API 主节点')
  })

  test('can hide the environment prefix', () => {
    const settings = createDefaultSettings()
    settings.showEnvironmentPrefix = false
    expect(formatTerminalTitle(note(), settings)).toBe('API 主节点')
  })

  test('does not duplicate an existing environment prefix', () => {
    const settings = createDefaultSettings()
    expect(formatTerminalTitle(note({ title: '[生产] API 主节点' }), settings))
      .toBe('[生产] API 主节点')
  })

  test('does not add a prefix for other environment', () => {
    const settings = createDefaultSettings()
    expect(formatTerminalTitle(note({ environment: 'other', title: '临时机器' }), settings))
      .toBe('临时机器')
  })

  test('returns empty when terminal notes are disabled globally or per note', () => {
    const settings = createDefaultSettings()
    settings.showTerminalTitleNotes = false
    expect(formatTerminalTitle(note(), settings)).toBe('')
    settings.showTerminalTitleNotes = true
    expect(formatTerminalTitle(note({ terminalTitleEnabled: false }), settings)).toBe('')
  })

  test('truncates long titles with an ellipsis', () => {
    const settings = createDefaultSettings()
    settings.maxTerminalTitleLength = 10
    const result = formatTerminalTitle(note({ title: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' }), settings)
    expect(result.endsWith('…')).toBe(true)
    expect(Array.from(result).length).toBe(10)
  })

  test('returns empty for a note without title or custom title', () => {
    const settings = createDefaultSettings()
    expect(formatTerminalTitle(note({ title: '', customTerminalTitle: '' }), settings)).toBe('')
  })

  test('formats a list subtitle with the configured list length', () => {
    const settings = createDefaultSettings()
    settings.maxListTitleLength = 6
    expect(formatListTitle(note(), settings)).toBe('API 主…')
  })
})
