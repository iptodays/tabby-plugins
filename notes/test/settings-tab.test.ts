import { SSHNotesSettingsTabComponent } from '../src/components/notes-settings-tab.component'
import { PendingImport, SSHNotesSettings, createDefaultSettings } from '../src/models'

function makeSettingsTab (overrides: { pending?: PendingImport } = {}) {
  const settings: SSHNotesSettings = createDefaultSettings()
  const notes = {
    isReadOnly: false,
    changed$: { subscribe: () => ({ unsubscribe: () => undefined }) },
    error$: { subscribe: () => ({ unsubscribe: () => undefined }) },
    getSettings: () => ({ ...settings }),
    getDataPath: () => 'C:\\Users\\test\\AppData\\Roaming\\tabby\\config.yaml',
    getDataSection: () => 'sshNotes',
    getBackup: () => null,
    ready: async () => undefined,
    updateSettings: jest.fn(async () => undefined),
    resetSettings: jest.fn(async () => undefined),
    clearAllNotes: jest.fn(async () => undefined),
    createBackup: jest.fn(async () => undefined),
    restoreBackup: jest.fn(async () => undefined),
    applyImport: jest.fn(async () => undefined),
    pickImportFile: jest.fn(async () => overrides.pending ?? null),
    exportToFile: jest.fn(async () => true),
  }
  const platform = {
    showItemInFolder: jest.fn(),
    showMessageBox: jest.fn(async () => ({ response: 0 })),
  }
  const notifications = { notice: jest.fn() }
  const app = { openNewTabRaw: jest.fn() }
  const tab = new SSHNotesSettingsTabComponent(notes as any, platform as any, notifications as any, app as any)
  return { tab, notes, platform, notifications }
}

describe('SSHNotesSettingsTabComponent', () => {
  test('shows an explicit error for an invalid import file', async () => {
    const { tab } = makeSettingsTab({
      pending: {
        fileName: 'bad.json',
        document: null,
        noteCount: 0,
        invalidCount: 0,
        warnings: [],
        errors: ['JSON 解析失败：Unexpected token'],
      },
    })
    await tab.chooseImport()
    expect(tab.pendingImport!.errors[0]).toContain('JSON 解析失败')
    expect(tab.errorMessage).toContain('校验未通过')
  })

  test('applies a previewed import only after the user chooses a mode', async () => {
    const document = {
      schemaVersion: 1,
      exportedAt: '2026-10-23T00:00:00.000Z',
      notes: {},
    }
    const { tab, notes } = makeSettingsTab({
      pending: {
        fileName: 'notes.json',
        document,
        noteCount: 0,
        invalidCount: 0,
        warnings: [],
        errors: [],
      },
    })
    await tab.chooseImport()
    await tab.applyImport('replace')
    expect(notes.applyImport).toHaveBeenCalledWith(document, 'replace')
    expect(tab.pendingImport).toBeNull()
  })

  test('requires two confirmations before clearing all notes', async () => {
    const { tab, notes, platform } = makeSettingsTab()
    await tab.clearAllNotes()
    expect(platform.showMessageBox).toHaveBeenCalledTimes(2)
    expect(notes.clearAllNotes).toHaveBeenCalledTimes(1)
  })

  test('does not clear notes if the second confirmation is cancelled', async () => {
    const { tab, notes, platform } = makeSettingsTab()
    platform.showMessageBox
      .mockResolvedValueOnce({ response: 0 })
      .mockResolvedValueOnce({ response: 1 })
    await tab.clearAllNotes()
    expect(notes.clearAllNotes).not.toHaveBeenCalled()
  })

  test('resets only settings, not notes', async () => {
    const { tab, notes, platform } = makeSettingsTab()
    await tab.resetSettings()
    expect(platform.showMessageBox).toHaveBeenCalled()
    expect(notes.resetSettings).toHaveBeenCalled()
    expect(notes.clearAllNotes).not.toHaveBeenCalled()
  })
})
