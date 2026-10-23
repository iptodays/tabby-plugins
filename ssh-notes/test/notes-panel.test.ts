import { NotesPanelComponent } from '../src/components/notes-panel.component'
import { SSHNote, createDefaultSettings } from '../src/models'

function note (title: string, overrides: Partial<SSHNote> = {}): SSHNote {
  return {
    title,
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
    ...overrides,
  }
}

function makePanel () {
  const settings = createDefaultSettings()
  const notes = {
    getSettings: () => settings,
    getAllNotes: () => [],
    getAllTags: () => ['生产', 'API'],
  }
  const profileActions = {
    getHost: () => '10.0.0.1',
    getUser: () => 'root',
    getGroupName: () => '',
    getConnectionSummary: () => 'root@10.0.0.1',
  }
  const panel = new NotesPanelComponent(
    notes as any,
    profileActions as any,
    {} as any,
    {} as any,
    {} as any,
  )
  panel.rows = [
    {
      profileId: 'a',
      profile: null,
      note: note('API 主节点', { environment: 'production', tags: ['生产', 'API'], project: 'example-project' }),
      orphan: false,
      name: 'prod-api-01',
      host: '10.0.0.1',
      user: 'root',
      project: 'example-project',
      group: '',
      searchText: 'prod-api-01\n10.0.0.1\napi 主节点\nexample-project\n生产\napi',
    },
    {
      profileId: 'b',
      profile: null,
      note: note('测试 Web', { environment: 'staging', tags: ['测试'], project: 'web' }),
      orphan: false,
      name: 'staging-web-01',
      host: '10.0.0.2',
      user: 'root',
      project: 'web',
      group: '',
      searchText: 'staging-web-01\n10.0.0.2\n测试 web\nweb\n测试',
    },
    {
      profileId: 'c',
      profile: null,
      note: null,
      orphan: false,
      name: 'dev-db-01',
      host: '10.0.0.3',
      user: 'root',
      project: '',
      group: '',
      searchText: 'dev-db-01\n10.0.0.3',
    },
  ]
  return { panel, settings }
}

describe('NotesPanelComponent filtering', () => {
  test('shows all connections by default', () => {
    const { panel } = makePanel()
    panel.applyFilters()
    expect(panel.filteredRows.map(row => row.profileId)).toEqual(['c', 'a', 'b'])
  })

  test('can hide connections without notes', () => {
    const { panel } = makePanel()
    panel.showAll = false
    panel.applyFilters()
    expect(panel.filteredRows.map(row => row.profileId)).toEqual(['a', 'b'])
  })

  test('searches note title, description and project', () => {
    const { panel } = makePanel()
    panel.search = 'example-project'
    panel.applyFilters()
    expect(panel.filteredRows.map(row => row.profileId)).toEqual(['a'])
  })

  test('filters by environment', () => {
    const { panel } = makePanel()
    panel.environmentFilter = 'staging'
    panel.applyFilters()
    expect(panel.filteredRows.map(row => row.profileId)).toEqual(['b'])
  })

  test('filters by tag', () => {
    const { panel } = makePanel()
    panel.tagFilter = 'API'
    panel.applyFilters()
    expect(panel.filteredRows.map(row => row.profileId)).toEqual(['a'])
  })

  test('sorts by updated time descending', () => {
    const { panel } = makePanel()
    panel.rows[0].note!.updatedAt = '2026-10-23T01:00:00.000Z'
    panel.rows[1].note!.updatedAt = '2026-10-23T02:00:00.000Z'
    panel.sortMode = 'updated'
    panel.applyFilters()
    expect(panel.filteredRows.map(row => row.profileId)).toEqual(['b', 'a', 'c'])
  })
})
