import { of, Subject } from 'rxjs'
import { SSHNotesService } from '../src/services/ssh-notes.service'
import { createDefaultSettings, SSHNotesConfig } from '../src/models'

class FakeConfig {
  store: any
  ready$ = of(true)
  changed$ = new Subject<void>()
  save = jest.fn(async () => {
    this.changed$.next()
  })

  constructor () {
    this.store = {
      sshNotes: {
        schemaVersion: 1,
        notes: {},
        settings: createDefaultSettings(),
        backup: null,
      } as SSHNotesConfig,
    }
  }
}

function createService () {
  const config = new FakeConfig()
  const platform = {
    getConfigPath: () => 'C:\\Users\\test\\AppData\\Roaming\\tabby\\config.yaml',
    startDownload: jest.fn(async () => null),
    startUpload: jest.fn(async () => []),
  }
  const notifications = {
    notice: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  }
  const log = {
    create: () => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    }),
  }
  const service = new SSHNotesService(config as any, platform as any, notifications as any, log as any)
  return { service, config, platform, notifications }
}

describe('SSHNotesService', () => {
  test('creates, updates and deletes a note', async () => {
    const { service } = createService()
    await service.ready()

    const created = await service.saveNote('ssh:custom:a:1111', {
      title: '  API 主节点 ',
      description: '生产环境',
      environment: 'production',
      tags: [' 生产 ', '生产', 'API'],
    })
    expect(created).not.toBeNull()
    expect(created!.title).toBe('API 主节点')
    expect(created!.tags).toEqual(['生产', 'API'])
    expect(service.getNote('ssh:custom:a:1111')!.title).toBe('API 主节点')

    const updated = await service.saveNote('ssh:custom:a:1111', { title: 'API 主节点 2' })
    expect(updated!.createdAt).toBe(created!.createdAt)
    expect(updated!.title).toBe('API 主节点 2')

    await service.deleteNote('ssh:custom:a:1111')
    expect(service.getNote('ssh:custom:a:1111')).toBeNull()
  })

  test('returns null for a missing note', async () => {
    const { service } = createService()
    await service.ready()
    expect(service.getNote('missing')).toBeNull()
  })

  test('keeps notes separate for different profiles with the same host', async () => {
    const { service } = createService()
    await service.ready()
    await service.saveNote('ssh:custom:a:1111', { title: 'A' })
    await service.saveNote('ssh:custom:b:2222', { title: 'B' })
    expect(service.getNote('ssh:custom:a:1111')!.title).toBe('A')
    expect(service.getNote('ssh:custom:b:2222')!.title).toBe('B')
  })

  test('does not depend on the profile name after a rename', async () => {
    const { service } = createService()
    await service.ready()
    await service.saveNote('ssh:custom:old-name:1111', { title: '保留备注' })
    // The profile may be renamed; the stable ID is unchanged.
    expect(service.getNote('ssh:custom:old-name:1111')!.title).toBe('保留备注')
  })

  test('clears a note when all note content is empty', async () => {
    const { service } = createService()
    await service.ready()
    await service.saveNote('id', { title: 'x' })
    const result = await service.saveNote('id', {
      title: '',
      description: '',
      project: '',
      owner: '',
      tags: [],
      customTerminalTitle: '',
    })
    expect(result).toBeNull()
    expect(service.getNote('id')).toBeNull()
  })

  test('exports and imports notes', async () => {
    const { service } = createService()
    await service.ready()
    await service.saveNote('id', { title: '导出测试', tags: ['导入'] })
    const document = service.exportDocument()
    expect(document.schemaVersion).toBe(1)
    expect(document.notes.id.title).toBe('导出测试')

    await service.deleteNote('id')
    await service.applyImport(document, 'replace')
    expect(service.getNote('id')!.title).toBe('导出测试')
    expect(service.getBackup()).not.toBeNull()
  })

  test('merges imported notes by updatedAt', async () => {
    const { service } = createService()
    await service.ready()
    await service.saveNote('id', { title: '本地' })
    const document = service.exportDocument()
    document.notes.id = {
      ...document.notes.id,
      title: '导入较新',
      updatedAt: new Date(Date.now() + 60_000).toISOString(),
    }
    await service.applyImport(document, 'merge')
    expect(service.getNote('id')!.title).toBe('导入较新')
  })

  test('backs up and restores notes', async () => {
    const { service } = createService()
    await service.ready()
    await service.saveNote('id', { title: '备份内容' })
    await service.createBackup('test')
    await service.deleteNote('id')
    expect(service.getNote('id')).toBeNull()
    await service.restoreBackup()
    expect(service.getNote('id')!.title).toBe('备份内容')
  })

  test('clears all notes and keeps a backup', async () => {
    const { service } = createService()
    await service.ready()
    await service.saveNote('a', { title: 'A' })
    await service.saveNote('b', { title: 'B' })
    await service.clearAllNotes()
    expect(service.getAllNotes()).toEqual([])
    expect(service.getBackup()).not.toBeNull()
    expect(Object.keys(service.getBackup()!.notes)).toHaveLength(2)
  })

  test('reports save failures and retains the in-memory note', async () => {
    const { service, config } = createService()
    await service.ready()
    config.save.mockRejectedValueOnce(new Error('disk full'))
    await expect(service.saveNote('id', { title: '未落盘' })).rejects.toThrow('disk full')
    expect(service.getNote('id')!.title).toBe('未落盘')
    expect(service.lastError).toContain('保存失败')
    expect(service.lastError).toContain('disk full')
  })

  test('reads an import file and returns a preview', async () => {
    const { service, platform } = createService()
    await service.ready()
    const text = JSON.stringify({
      schemaVersion: 1,
      notes: { id: { title: '文件中的备注', environment: 'staging' } },
    })
    const close = jest.fn()
    platform.startUpload.mockResolvedValueOnce([{
      getName: () => 'notes.json',
      getSize: () => text.length,
      readAll: async () => new TextEncoder().encode(text),
      close,
    }] as any)
    const preview = await service.pickImportFile()
    expect(preview).not.toBeNull()
    expect(preview!.fileName).toBe('notes.json')
    expect(preview!.noteCount).toBe(1)
    expect(preview!.errors).toEqual([])
    expect(close).toHaveBeenCalled()
  })

  test('exports notes through the platform download API', async () => {
    const { service, platform } = createService()
    await service.ready()
    await service.saveNote('id', { title: '导出到文件' })
    const write = jest.fn(async (_data: Uint8Array) => undefined)
    const close = jest.fn()
    platform.startDownload.mockResolvedValueOnce({ write, close } as any)
    const result = await service.exportToFile()
    expect(result).toBe(true)
    expect(write).toHaveBeenCalledTimes(1)
    const bytes = write.mock.calls[0][0] as Uint8Array
    const document = JSON.parse(new TextDecoder().decode(bytes))
    expect(document.notes.id.title).toBe('导出到文件')
    expect(close).toHaveBeenCalled()
  })

  test('returns settings and updates them with validation', async () => {
    const { service } = createService()
    await service.ready()
    await service.updateSettings({ maxTerminalTitleLength: 999, showEnvironmentPrefix: false })
    expect(service.getSettings().maxTerminalTitleLength).toBe(200)
    expect(service.getSettings().showEnvironmentPrefix).toBe(false)
  })

  test('exposes the config path', async () => {
    const { service } = createService()
    await service.ready()
    expect(service.getDataPath()).toContain('config.yaml')
    expect(service.getDataSection()).toBe('sshNotes')
  })
})
