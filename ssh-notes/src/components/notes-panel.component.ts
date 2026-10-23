import { Component, OnInit } from '@angular/core'
import {
  BaseComponent,
  NotificationsService,
  PartialProfile,
  PlatformService,
  Profile,
} from 'tabby-core'
import {
  ENVIRONMENT_OPTIONS,
  SSHNote,
  SSHNoteEnvironment,
  SSHNotesSettings,
  createDefaultSettings,
  environmentColor,
  environmentLabel,
} from '../models'
import { SSHNotesService } from '../services/ssh-notes.service'
import { ProfileActionsService } from '../services/profile-actions.service'
import { NoteEditorService } from '../services/note-editor.service'
import { formatListTitle } from '../title'
import { SSH_NOTES_STYLES } from '../ui/styles'

interface NoteRow {
  profileId: string
  profile: PartialProfile<Profile> | null
  note: SSHNote | null
  orphan: boolean
  name: string
  host: string
  user: string
  project: string
  group: string
  searchText: string
}

type SortMode = 'name' | 'updated' | 'environment' | 'project'

@Component({
  selector: 'ssh-notes-panel',
  styles: [SSH_NOTES_STYLES],
  template: `
    <div class="ssh-notes-page">
      <div class="ssh-notes-toolbar">
        <div class="input-group input-group-sm search">
          <span class="input-group-text"><span class="fa fa-search"></span></span>
          <input
            class="form-control"
            type="search"
            placeholder="搜索连接名称、备注、IP、项目或标签"
            [(ngModel)]="search"
            (ngModelChange)="applyFilters()"
          >
        </div>

        <select class="form-select form-select-sm" [(ngModel)]="environmentFilter" (ngModelChange)="applyFilters()" title="按环境筛选">
          <option value="all">全部环境</option>
          <option *ngFor="let option of environmentOptions" [ngValue]="option.value">{{ option.label }}</option>
        </select>

        <select class="form-select form-select-sm" [(ngModel)]="sortMode" (ngModelChange)="applyFilters()" title="排序">
          <option value="name">按连接名称</option>
          <option value="updated">按更新时间</option>
          <option value="environment">按环境</option>
          <option value="project">按项目</option>
        </select>

        <label class="form-check form-check-inline mb-0">
          <input class="form-check-input" type="checkbox" [(ngModel)]="showAll" (ngModelChange)="applyFilters()">
          <span class="form-check-label small">显示无备注连接</span>
        </label>

        <button type="button" class="btn btn-sm btn-secondary" (click)="reload(true)" title="刷新">
          <span class="fa fa-sync"></span>
        </button>
      </div>

      <div class="ssh-notes-toolbar" *ngIf="allTags.length">
        <input
          class="form-control form-control-sm"
          style="max-width: 14rem;"
          type="search"
          placeholder="搜索标签"
          [(ngModel)]="tagSearch"
          (ngModelChange)="applyFilters()"
        >
        <div class="ssh-note-tags">
          <button
            type="button"
            class="ssh-note-tag"
            *ngFor="let tag of filteredTagOptions()"
            [class.active]="tagFilter === tag"
            (click)="toggleTagFilter(tag)"
          >{{ tag }}</button>
        </div>
        <button type="button" class="btn btn-sm btn-link" *ngIf="tagFilter" (click)="clearTagFilter()">清除标签筛选</button>
      </div>

      <div class="ssh-notes-banner" *ngIf="notes.isReadOnly">
        备注数据由更新版本的插件创建，当前处于只读模式。请升级 Tabby SSH Notes 后再编辑。
      </div>
      <div class="ssh-notes-banner" *ngFor="let warning of notes.dataWarnings">{{ warning }}</div>
      <div class="ssh-notes-error" *ngIf="errorMessage">
        {{ errorMessage }}
        <button type="button" class="btn btn-sm btn-link" (click)="retry()">重试</button>
      </div>

      <div class="ssh-notes-layout">
        <div class="ssh-notes-list">
          <div class="ssh-notes-empty" *ngIf="loading">
            <span class="fa fa-spinner fa-spin"></span>
            <span>正在加载 SSH 连接与备注…</span>
          </div>

          <div class="ssh-notes-empty" *ngIf="!loading && !filteredRows.length">
            <span class="fa fa-note-sticky"></span>
            <strong>还没有可显示的备注</strong>
            <span>点击“显示无备注连接”，选择一条 SSH 连接后添加备注。</span>
            <button type="button" class="btn btn-sm btn-primary" (click)="showAll = true; applyFilters()">
              显示全部 SSH 连接
            </button>
          </div>

          <button
            type="button"
            class="ssh-note-row"
            *ngFor="let row of filteredRows; trackBy: trackByRow"
            [class.active]="row.profileId === selectedId"
            (click)="select(row)"
          >
            <span class="ssh-note-color" [style.background]="rowColor(row)"></span>
            <span class="ssh-note-row-main">
              <span class="ssh-note-row-title" [title]="row.note?.title || row.name">{{ listTitle(row) }}</span>
              <span class="ssh-note-row-sub" *ngIf="row.note">
                {{ row.name }}<span *ngIf="row.host"> · {{ row.host }}</span>
              </span>
              <span class="ssh-note-row-sub" *ngIf="!row.note">{{ row.host || '尚未添加备注' }}</span>
              <span class="ssh-note-tags" *ngIf="row.note && settings.showTags && row.note.tags.length">
                <span class="ssh-note-tag" *ngFor="let tag of row.note.tags">{{ tag }}</span>
              </span>
            </span>
            <span class="ssh-note-row-side" *ngIf="row.note">
              <span class="ssh-note-env-badge" [style.color]="badgeColor(row.note)">
                {{ environmentLabel(row.note.environment) }}
              </span>
            </span>
          </button>
        </div>

        <div class="ssh-note-detail" *ngIf="selectedRow; else noSelection">
          <div class="ssh-note-detail-head">
            <div>
              <h3>{{ selectedRow.name }}</h3>
              <div class="text-muted">
                {{ connectionSummary(selectedRow) }}
                <span *ngIf="selectedRow.group"> · {{ selectedRow.group }}</span>
              </div>
            </div>
            <div class="ssh-note-detail-actions">
              <button type="button" class="btn btn-sm btn-primary" [disabled]="!selectedRow.profile" (click)="connect(selectedRow)">
                <span class="fa fa-play me-1"></span>连接
              </button>
              <button type="button" class="btn btn-sm btn-secondary" (click)="edit(selectedRow)">
                <span class="fa fa-pen me-1"></span>{{ selectedRow.note ? '编辑备注' : '添加备注' }}
              </button>
              <button type="button" class="btn btn-sm btn-secondary" [disabled]="!selectedRow.profile" (click)="openProfile(selectedRow)">
                原生 SSH 配置
              </button>
              <button type="button" class="btn btn-sm btn-outline-danger" *ngIf="selectedRow.note" (click)="remove(selectedRow)">
                删除备注
              </button>
            </div>
          </div>

          <div class="ssh-notes-banner" *ngIf="selectedRow.orphan">
            这条备注对应的 SSH Profile 已不存在（ID：{{ selectedRow.profileId }}）。备注仍保留，可导出或删除。
          </div>

          <ng-container *ngIf="selectedRow.note; else noNote">
            <div class="ssh-note-title">{{ selectedRow.note.title || selectedRow.note.customTerminalTitle || '（无标题）' }}</div>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <span class="ssh-note-env-badge" [style.color]="badgeColor(selectedRow.note)">
                {{ environmentLabel(selectedRow.note.environment) }}
              </span>
              <span class="badge text-bg-secondary" *ngIf="selectedRow.note.project">{{ selectedRow.note.project }}</span>
              <span class="badge text-bg-secondary" *ngIf="selectedRow.note.owner">负责人：{{ selectedRow.note.owner }}</span>
            </div>

            <div class="ssh-note-tags" *ngIf="settings.showTags && selectedRow.note.tags.length">
              <button
                type="button"
                class="ssh-note-tag"
                *ngFor="let tag of selectedRow.note.tags"
                (click)="filterByTag(tag)"
                title="按此标签筛选"
              >{{ tag }}</button>
            </div>

            <div class="ssh-note-description" *ngIf="selectedRow.note.description">{{ selectedRow.note.description }}</div>
            <div class="text-muted" *ngIf="!selectedRow.note.description">没有详细说明。</div>

            <div class="ssh-note-meta">
              <div>
                <span class="ssh-note-meta-label">备注标题</span>
                <span>{{ selectedRow.note.title || '未填写' }}</span>
              </div>
              <div>
                <span class="ssh-note-meta-label">自定义终端标题</span>
                <span>{{ selectedRow.note.customTerminalTitle || '未填写' }}</span>
              </div>
              <div>
                <span class="ssh-note-meta-label">终端备注</span>
                <span>{{ selectedRow.note.terminalTitleEnabled ? '已启用' : '已关闭' }}</span>
              </div>
              <div>
                <span class="ssh-note-meta-label">创建时间</span>
                <span>{{ formatDate(selectedRow.note.createdAt) }}</span>
              </div>
              <div>
                <span class="ssh-note-meta-label">更新时间</span>
                <span>{{ formatDate(selectedRow.note.updatedAt) }}</span>
              </div>
              <div>
                <span class="ssh-note-meta-label">Profile ID</span>
                <span class="ssh-notes-data-path">{{ selectedRow.profileId }}</span>
              </div>
            </div>
          </ng-container>

          <ng-template #noNote>
            <div class="ssh-notes-empty">
              <span class="fa fa-note-sticky"></span>
              <strong>这条 SSH 连接还没有备注</strong>
              <span>可以记录生产/测试环境、用途、负责人和标签。</span>
              <button type="button" class="btn btn-sm btn-primary" (click)="edit(selectedRow)">添加备注</button>
            </div>
          </ng-template>
        </div>

        <ng-template #noSelection>
          <div class="ssh-note-detail ssh-notes-empty">
            <span class="fa fa-hand-pointer"></span>
            <strong>选择左侧的一条 SSH 连接</strong>
            <span>查看备注详情、连接服务器或打开原生 SSH 配置。</span>
          </div>
        </ng-template>
      </div>
    </div>
  `,
})
export class NotesPanelComponent extends BaseComponent implements OnInit {
  rows: NoteRow[] = []
  filteredRows: NoteRow[] = []
  selectedId = ''
  search = ''
  environmentFilter: 'all' | SSHNoteEnvironment = 'all'
  tagFilter = ''
  tagSearch = ''
  sortMode: SortMode = 'name'
  showAll = false
  loading = true
  errorMessage = ''
  allTags: string[] = []
  environmentOptions = ENVIRONMENT_OPTIONS
  panelSettings: SSHNotesSettings = createDefaultSettings()

  constructor (
    public notes: SSHNotesService,
    private profileActions: ProfileActionsService,
    private noteEditor: NoteEditorService,
    private platform: PlatformService,
    private notifications: NotificationsService,
  ) {
    super()
  }

  async ngOnInit (): Promise<void> {
    this.subscribeUntilDestroyed(this.notes.changed$, () => {
      this.reload(false).catch(error => this.setError(error))
    })
    this.subscribeUntilDestroyed(this.notes.error$, error => {
      if (error) {
        this.errorMessage = error
      }
    })
    await this.reload(true)
  }

  get settings (): SSHNotesSettings {
    return this.panelSettings
  }

  get selectedRow (): NoteRow | null {
    return this.rows.find(row => row.profileId === this.selectedId) ?? null
  }

  async reload (showLoading = false): Promise<void> {
    if (showLoading) {
      this.loading = true
    }
    this.errorMessage = ''
    try {
      await this.notes.ready()
      this.panelSettings = this.notes.getSettings()
      const profiles = await this.profileActions.getSSHProfiles()
      const notes = new Map(this.notes.getAllNotes().map(item => [item.profileId, item.note]))
      const rows: NoteRow[] = profiles.map(profile => {
        const note = notes.get(profile.id) ?? null
        notes.delete(profile.id)
        return this.makeRow(profile, note, false)
      })
      for (const [profileId, note] of notes.entries()) {
        rows.push({
          profileId,
          profile: null,
          note,
          orphan: true,
          name: note.title || '（连接已删除）',
          host: '',
          user: '',
          project: note.project,
          group: '',
          searchText: this.makeSearchText(profileId, null, note),
        })
      }
      this.rows = rows
      this.allTags = this.notes.getAllTags()
      if (!this.selectedId || !this.rows.some(row => row.profileId === this.selectedId)) {
        this.selectedId = this.filteredRows[0]?.profileId ?? this.rows[0]?.profileId ?? ''
      }
      this.applyFilters()
    } catch (error) {
      this.setError(error)
    } finally {
      this.loading = false
    }
  }

  private makeRow (profile: PartialProfile<Profile> & { id: string }, note: SSHNote | null, orphan: boolean): NoteRow {
    return {
      profileId: profile.id,
      profile,
      note,
      orphan,
      name: profile.name || profile.id,
      host: this.profileActions.getHost(profile),
      user: this.profileActions.getUser(profile),
      project: note?.project ?? '',
      group: this.profileActions.getGroupName(profile),
      searchText: this.makeSearchText(profile.id, profile, note),
    }
  }

  private makeSearchText (profileId: string, profile: PartialProfile<Profile> | null, note: SSHNote | null): string {
    const parts = [
      profileId,
      profile?.name ?? '',
      profile?.options?.host ?? '',
      profile?.options?.user ?? '',
      note?.title ?? '',
      note?.description ?? '',
      note?.project ?? '',
      note?.owner ?? '',
      ...(note?.tags ?? []),
    ]
    return parts.join('\n').toLowerCase()
  }

  private setError (error: unknown): void {
    this.errorMessage = error instanceof Error ? error.message : String(error)
    this.loading = false
  }

  async retry (): Promise<void> {
    await this.reload(true)
    if (this.notes.lastError) {
      this.errorMessage = this.notes.lastError
    }
  }

  applyFilters (): void {
    const query = this.search.trim().toLowerCase()
    const rows = this.rows.filter(row => {
      if (!this.showAll && !row.note) {
        return false
      }
      if (this.environmentFilter !== 'all' && row.note?.environment !== this.environmentFilter) {
        return false
      }
      if (this.tagFilter && !row.note?.tags.some(tag => tag.toLowerCase() === this.tagFilter.toLowerCase())) {
        return false
      }
      if (query && !row.searchText.includes(query)) {
        return false
      }
      return true
    })

    rows.sort((a, b) => {
      switch (this.sortMode) {
        case 'updated':
          return (b.note?.updatedAt ?? '').localeCompare(a.note?.updatedAt ?? '') || a.name.localeCompare(b.name)
        case 'environment': {
          const order: Record<string, number> = { production: 0, staging: 1, development: 2, other: 3 }
          return (order[a.note?.environment ?? 'other'] ?? 4) - (order[b.note?.environment ?? 'other'] ?? 4) || a.name.localeCompare(b.name)
        }
        case 'project':
          return (a.note?.project ?? '').localeCompare(b.note?.project ?? '') || a.name.localeCompare(b.name)
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    this.filteredRows = rows
    if (this.selectedId && !rows.some(row => row.profileId === this.selectedId)) {
      this.selectedId = rows[0]?.profileId ?? ''
    }
  }

  filteredTagOptions (): string[] {
    const query = this.tagSearch.trim().toLowerCase()
    return this.allTags
      .filter(tag => !query || tag.toLowerCase().includes(query))
      .slice(0, 30)
  }

  toggleTagFilter (tag: string): void {
    this.tagFilter = this.tagFilter.toLowerCase() === tag.toLowerCase() ? '' : tag
    this.applyFilters()
  }

  clearTagFilter (): void {
    this.tagFilter = ''
    this.applyFilters()
  }

  filterByTag (tag: string): void {
    this.tagFilter = tag
    this.applyFilters()
  }

  select (row: NoteRow): void {
    this.selectedId = row.profileId
  }

  listTitle (row: NoteRow): string {
    return formatListTitle(row.note, this.settings) || row.name
  }

  rowColor (row: NoteRow): string {
    if (!this.settings.showEnvironmentColor || !row.note) {
      return ''
    }
    return row.note.color || environmentColor(row.note.environment)
  }

  badgeColor (note: SSHNote | null): string {
    if (!note || !this.settings.showEnvironmentColor) {
      return ''
    }
    return environmentColor(note.environment)
  }

  environmentLabel = environmentLabel

  environmentColor = environmentColor

  connectionSummary (row: NoteRow): string {
    if (!row.profile) {
      return 'SSH Profile 已不存在'
    }
    return this.profileActions.getConnectionSummary(row.profile)
  }

  formatDate (value: string): string {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return value
    }
    return date.toLocaleString()
  }

  async edit (row: NoteRow): Promise<void> {
    try {
      const result = await this.noteEditor.open(row.profileId, row.profile, row.note)
      if (result === undefined) {
        return
      }
      if (result === null) {
        this.notifications.notice('备注已清空')
      } else {
        this.notifications.notice('备注已保存')
      }
      await this.reload(false)
    } catch (error) {
      this.setError(error)
    }
  }

  async connect (row: NoteRow): Promise<void> {
    if (!row.profile) {
      return
    }
    try {
      await this.profileActions.connect(row.profile)
    } catch (error) {
      this.setError(error)
    }
  }

  async openProfile (row: NoteRow): Promise<void> {
    if (!row.profile) {
      return
    }
    try {
      await this.profileActions.openNativeProfileSettings(row.profile)
      await this.reload(false)
    } catch (error) {
      this.setError(error)
    }
  }

  async remove (row: NoteRow): Promise<void> {
    if (!row.note) {
      return
    }
    const result = await this.platform.showMessageBox({
      type: 'warning',
      message: '删除这条备注？',
      detail: `连接：${row.name}\n删除后终端标题将恢复为 Tabby 原始行为。此操作无法撤销。`,
      buttons: ['删除备注', '取消'],
      defaultId: 1,
      cancelId: 1,
    })
    if (result.response !== 0) {
      return
    }
    try {
      await this.notes.deleteNote(row.profileId)
      this.notifications.notice('备注已删除')
      await this.reload(false)
    } catch (error) {
      this.setError(error)
    }
  }

  trackByRow (_index: number, row: NoteRow): string {
    return row.profileId
  }
}
