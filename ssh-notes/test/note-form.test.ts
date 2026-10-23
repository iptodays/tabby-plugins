import { NoteFormComponent } from '../src/components/note-form.component'
import { SSHNote, createDefaultSettings } from '../src/models'

function makeForm (overrides: { note?: SSHNote | null, saveResult?: SSHNote | null } = {}) {
  const settings = createDefaultSettings()
  const notes = {
    getSettings: () => settings,
    getAllTags: () => ['生产', 'API', '数据库'],
    saveNote: jest.fn(async () => overrides.saveResult ?? {
      title: '保存后的标题',
      description: '',
      environment: 'production',
      project: '',
      owner: '',
      tags: [],
      color: '',
      customTerminalTitle: '',
      terminalTitleEnabled: true,
      createdAt: '2026-10-23T00:00:00.000Z',
      updatedAt: '2026-10-23T00:00:00.000Z',
    }),
    deleteNote: jest.fn(async () => undefined),
  }
  const actions = {
    getConnectionSummary: () => 'test@127.0.0.1:22',
  }
  const platform = {
    showMessageBox: jest.fn(async () => ({ response: 0 })),
  }
  const form = new NoteFormComponent(notes as any, actions as any, platform as any)
  form.profileId = 'ssh:custom:test:1'
  form.note = overrides.note ?? null
  form.ngOnInit()
  return { form, notes, platform }
}

describe('NoteFormComponent', () => {
  test('saves a new note through the service and emits the result', async () => {
    const { form, notes } = makeForm()
    form.draft.title = 'API 主节点'
    form.draft.tags = ['生产']
    let saved: SSHNote | null | undefined
    form.saved.subscribe(value => { saved = value })
    await form.save()
    expect(notes.saveNote).toHaveBeenCalledWith('ssh:custom:test:1', expect.objectContaining({
      title: 'API 主节点',
      tags: ['生产'],
    }))
    expect(saved!.title).toBe('保存后的标题')
  })

  test('validates color format and does not call the service', async () => {
    const { form, notes } = makeForm()
    form.draft.color = 'red'
    await form.save()
    expect(notes.saveNote).not.toHaveBeenCalled()
    expect(form.errorMessage).toContain('#RRGGBB')
  })

  test('de-duplicates tags case-insensitively and trims input', () => {
    const { form } = makeForm()
    form.tagDraft = ' API '
    form.addTag()
    form.tagDraft = 'api'
    form.addTag()
    expect(form.draft.tags).toEqual(['API'])
    expect(form.errorMessage).toContain('已存在')
  })

  test('limits tags to 20 entries', () => {
    const { form } = makeForm()
    for (let i = 0; i < 20; i++) {
      form.tagDraft = `tag-${i}`
      form.addTag()
    }
    form.tagDraft = 'tag-20'
    form.addTag()
    expect(form.draft.tags).toHaveLength(20)
    expect(form.errorMessage).toContain('20')
  })

  test('asks for confirmation before discarding dirty edits', async () => {
    const { form, platform } = makeForm()
    form.markDirty()
    let cancelled = false
    form.cancelled.subscribe(() => { cancelled = true })
    await form.cancel()
    expect(platform.showMessageBox).toHaveBeenCalled()
    expect(cancelled).toBe(true)
  })

  test('does not ask for confirmation when there are no changes', async () => {
    const { form, platform } = makeForm()
    const canLeave = await form.canDeactivate()
    expect(canLeave).toBe(true)
    expect(platform.showMessageBox).not.toHaveBeenCalled()
  })

  test('clears an existing note after confirmation', async () => {
    const note: SSHNote = {
      title: '旧备注',
      description: '',
      environment: 'production',
      project: '',
      owner: '',
      tags: [],
      color: '',
      customTerminalTitle: '',
      terminalTitleEnabled: true,
      createdAt: '2026-10-23T00:00:00.000Z',
      updatedAt: '2026-10-23T00:00:00.000Z',
    }
    const { form, notes } = makeForm({ note })
    let saved: SSHNote | null | undefined
    form.saved.subscribe(value => { saved = value })
    await form.clear()
    expect(notes.deleteNote).toHaveBeenCalledWith('ssh:custom:test:1')
    expect(saved).toBeNull()
  })

  test('previews the terminal title from the draft', () => {
    const { form } = makeForm()
    form.draft.title = 'API 主节点'
    expect(form.titlePreview).toBe('[生产] API 主节点')
  })
})
