import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core'
import { PlatformService, Profile, PartialProfile } from 'tabby-core'
import {
  SSHNote,
  createEmptyNote,
  environmentColor,
  isNoteEmpty,
} from '../models'
import { SSHNotesService } from '../services/ssh-notes.service'
import { ProfileActionsService } from '../services/profile-actions.service'
import { formatTerminalTitle } from '../title'
import { isValidHexColor } from '../validation'
import { SSH_NOTES_STYLES } from '../ui/styles'

interface NoteDraft {
  title: string
  description: string
  environment: SSHNote['environment']
  project: string
  owner: string
  tags: string[]
  color: string
  customTerminalTitle: string
  terminalTitleEnabled: boolean
}

@Component({
  selector: 'ssh-note-form',
  styles: [SSH_NOTES_STYLES],
  template: `
    <div class="ssh-notes-form">
      <div class="ssh-notes-connection" *ngIf="profile">
        <strong>{{ profile.name }}</strong>
        <span *ngIf="connectionSummary"> · {{ connectionSummary }}</span>
        <button type="button" class="btn btn-sm btn-link ms-2" (click)="openProfile.emit()">
          打开原生 SSH 配置
        </button>
      </div>

      <div class="ssh-notes-error" *ngIf="errorMessage">{{ errorMessage }}</div>

      <div class="ssh-notes-form-grid">
        <div class="field">
          <label for="ssh-note-title">备注标题</label>
          <input
            id="ssh-note-title"
            class="form-control"
            type="text"
            maxlength="120"
            placeholder="例如：API 主节点"
            [(ngModel)]="draft.title"
            (ngModelChange)="markDirty()"
          >
          <span class="hint">显示在 SSH Notes 面板和 SSH 终端标签中。</span>
        </div>

        <div class="field">
          <label for="ssh-note-environment">环境</label>
          <select
            id="ssh-note-environment"
            class="form-select"
            [(ngModel)]="draft.environment"
            (ngModelChange)="onEnvironmentChange()"
          >
            <option *ngFor="let option of environmentOptions" [ngValue]="option.value">
              {{ option.label }}
            </option>
          </select>
          <span class="hint">用于筛选和可选的终端标题前缀。</span>
        </div>

        <div class="field">
          <label for="ssh-note-project">所属项目</label>
          <input
            id="ssh-note-project"
            class="form-control"
            type="text"
            maxlength="100"
            placeholder="例如：示例项目"
            [(ngModel)]="draft.project"
            (ngModelChange)="markDirty()"
          >
        </div>

        <div class="field">
          <label for="ssh-note-owner">负责人</label>
          <input
            id="ssh-note-owner"
            class="form-control"
            type="text"
            maxlength="100"
            placeholder="例如：运维"
            [(ngModel)]="draft.owner"
            (ngModelChange)="markDirty()"
          >
        </div>

        <div class="field">
          <label for="ssh-note-color">显示颜色</label>
          <div class="d-flex gap-2 align-items-center">
            <input
              type="color"
              class="form-control form-control-color"
              [ngModel]="draft.color || environmentFallbackColor"
              (ngModelChange)="setColor($event)"
              title="选择颜色"
            >
            <input
              id="ssh-note-color"
              class="form-control"
              type="text"
              maxlength="7"
              placeholder="#E05252"
              [(ngModel)]="draft.color"
              (ngModelChange)="markDirty()"
            >
            <button type="button" class="btn btn-sm btn-secondary" (click)="clearColor()">清除</button>
          </div>
          <span class="hint">可选，仅作为辅助标识，不替代环境文字。</span>
        </div>

        <div class="field">
          <label for="ssh-note-custom-title">自定义终端标题</label>
          <input
            id="ssh-note-custom-title"
            class="form-control"
            type="text"
            maxlength="120"
            placeholder="例如：生产 / API / 示例项目"
            [(ngModel)]="draft.customTerminalTitle"
            (ngModelChange)="markDirty()"
          >
          <span class="hint">非空时按标题优先级使用；留空则使用环境前缀 + 备注标题。</span>
        </div>
      </div>

      <div class="field">
        <label for="ssh-note-description">详细说明</label>
        <textarea
          id="ssh-note-description"
          class="form-control"
          rows="5"
          maxlength="8000"
          placeholder="记录用途、注意事项、访问方式等。"
          [(ngModel)]="draft.description"
          (ngModelChange)="markDirty()"
        ></textarea>
        <span class="hint">支持多行；内容不会被当作命令执行。</span>
      </div>

      <div class="field">
        <span class="field-label">标签</span>
        <div class="ssh-note-tags" *ngIf="draft.tags.length">
          <span class="ssh-note-tag" *ngFor="let tag of draft.tags">
            {{ tag }}
            <button type="button" class="btn btn-sm btn-link p-0 ms-1" (click)="removeTag(tag)" title="删除标签">×</button>
          </span>
        </div>
        <div class="input-group input-group-sm">
          <input
            class="form-control"
            type="text"
            maxlength="32"
            placeholder="输入标签后按回车"
            [(ngModel)]="tagDraft"
            (keydown.enter)="addTag(); $event.preventDefault()"
          >
          <button type="button" class="btn btn-secondary" (click)="addTag()">添加</button>
        </div>
        <div class="ssh-note-tags mt-2" *ngIf="filteredSuggestions().length">
          <button
            type="button"
            class="ssh-note-tag"
            *ngFor="let tag of filteredSuggestions()"
            (click)="addSuggestedTag(tag)"
          >+ {{ tag }}</button>
        </div>
        <span class="hint">最多 20 个标签，自动忽略首尾空格并防止重复。</span>
      </div>

      <div class="form-line d-flex align-items-center gap-3">
        <div class="header">
          <div class="title">启用终端备注</div>
          <div class="description">仅对当前 SSH 连接的终端标签生效。</div>
        </div>
        <toggle [(ngModel)]="draft.terminalTitleEnabled" (ngModelChange)="markDirty()"></toggle>
      </div>

      <div class="ssh-notes-connection">
        <span class="text-muted">终端标题预览：</span>
        <strong>{{ titlePreview || '（不覆盖原始标题）' }}</strong>
      </div>

      <div class="ssh-notes-form-actions">
        <button type="button" class="btn btn-primary" [disabled]="saving || !profileId" (click)="save()">
          <span class="fa fa-save me-1"></span>{{ saving ? '保存中…' : '保存' }}
        </button>
        <button type="button" class="btn btn-secondary" [disabled]="saving" (click)="cancel()">取消</button>
        <span class="spacer"></span>
        <button type="button" class="btn btn-outline-danger" *ngIf="note" [disabled]="saving" (click)="clear()">
          清空备注
        </button>
      </div>
    </div>
  `,
})
export class NoteFormComponent implements OnInit, OnChanges {
  @Input() profileId = ''
  @Input() profile: PartialProfile<Profile> | null = null
  @Input() note: SSHNote | null = null

  @Output() saved = new EventEmitter<SSHNote | null>()
  @Output() cancelled = new EventEmitter<void>()
  @Output() dirtyChange = new EventEmitter<boolean>()
  @Output() openProfile = new EventEmitter<void>()

  draft: NoteDraft = {
    title: '',
    description: '',
    environment: 'production',
    project: '',
    owner: '',
    tags: [],
    color: '',
    customTerminalTitle: '',
    terminalTitleEnabled: true,
  }
  tagDraft = ''
  allTags: string[] = []
  saving = false
  dirty = false
  errorMessage = ''
  environmentOptions = [
    { value: 'production' as const, label: '生产' },
    { value: 'staging' as const, label: '测试' },
    { value: 'development' as const, label: '开发' },
    { value: 'other' as const, label: '其他' },
  ]

  constructor (
    private notes: SSHNotesService,
    private profileActions: ProfileActionsService,
    private platform: PlatformService,
  ) {}

  ngOnInit (): void {
    this.reset()
  }

  ngOnChanges (changes: SimpleChanges): void {
    if (changes['note'] || changes['profileId']) {
      this.reset()
    }
  }

  get connectionSummary (): string {
    return this.profileActions.getConnectionSummary(this.profile)
  }

  get environmentFallbackColor (): string {
    return environmentColor(this.draft.environment)
  }

  get titlePreview (): string {
    const note = this.toNote()
    if (!note || isNoteEmpty(note)) {
      return ''
    }
    return formatTerminalTitle(note, this.notes.getSettings())
  }

  private reset (): void {
    const source = this.note ?? createEmptyNote(this.notes.getSettings().defaultEnvironment)
    this.draft = {
      title: source.title,
      description: source.description,
      environment: source.environment,
      project: source.project,
      owner: source.owner,
      tags: [...source.tags],
      color: source.color,
      customTerminalTitle: source.customTerminalTitle,
      terminalTitleEnabled: source.terminalTitleEnabled,
    }
    this.tagDraft = ''
    this.allTags = this.notes.getAllTags()
    this.errorMessage = ''
    this.setDirty(false)
  }

  private toNote (): SSHNote | null {
    const now = new Date().toISOString()
    const base = this.note
    return {
      title: this.draft.title.trim(),
      description: this.draft.description.trim(),
      environment: this.draft.environment,
      project: this.draft.project.trim(),
      owner: this.draft.owner.trim(),
      tags: [...this.draft.tags],
      color: this.draft.color.trim(),
      customTerminalTitle: this.draft.customTerminalTitle.trim(),
      terminalTitleEnabled: this.draft.terminalTitleEnabled,
      createdAt: base?.createdAt ?? now,
      updatedAt: now,
    }
  }

  markDirty (): void {
    this.setDirty(true)
  }

  private setDirty (value: boolean): void {
    if (this.dirty === value) {
      return
    }
    this.dirty = value
    this.dirtyChange.emit(value)
  }

  onEnvironmentChange (): void {
    if (!this.draft.color) {
      this.draft.color = environmentColor(this.draft.environment)
    }
    this.markDirty()
  }

  setColor (value: string): void {
    this.draft.color = value
    this.markDirty()
  }

  clearColor (): void {
    this.draft.color = ''
    this.markDirty()
  }

  addTag (): void {
    const tag = this.tagDraft.trim()
    if (!tag) {
      return
    }
    if (tag.length > 32) {
      this.errorMessage = '标签不能超过 32 个字符。'
      return
    }
    if (this.draft.tags.some(existing => existing.toLowerCase() === tag.toLowerCase())) {
      this.tagDraft = ''
      this.errorMessage = '该标签已存在，已忽略重复项。'
      return
    }
    if (this.draft.tags.length >= 20) {
      this.errorMessage = '最多只能添加 20 个标签。'
      return
    }
    this.draft.tags = [...this.draft.tags, tag]
    this.tagDraft = ''
    this.errorMessage = ''
    this.markDirty()
  }

  addSuggestedTag (tag: string): void {
    this.tagDraft = tag
    this.addTag()
  }

  removeTag (tag: string): void {
    this.draft.tags = this.draft.tags.filter(item => item !== tag)
    this.markDirty()
  }

  filteredSuggestions (): string[] {
    const query = this.tagDraft.trim().toLowerCase()
    return this.allTags
      .filter(tag => !this.draft.tags.some(existing => existing.toLowerCase() === tag.toLowerCase()))
      .filter(tag => !query || tag.toLowerCase().includes(query))
      .slice(0, 8)
  }

  validate (): boolean {
    const errors: string[] = []
    if (this.draft.title.length > 120) {
      errors.push('备注标题不能超过 120 个字符。')
    }
    if (this.draft.description.length > 8000) {
      errors.push('详细说明不能超过 8000 个字符。')
    }
    if (this.draft.project.length > 100 || this.draft.owner.length > 100) {
      errors.push('项目名称和负责人不能超过 100 个字符。')
    }
    if (this.draft.color && !isValidHexColor(this.draft.color)) {
      errors.push('颜色必须是 #RRGGBB 格式。')
    }
    if (this.draft.customTerminalTitle.length > 120) {
      errors.push('自定义终端标题不能超过 120 个字符。')
    }
    if (!this.profileId) {
      errors.push('缺少稳定的 SSH Profile ID，无法保存备注。')
    }
    if (errors.length) {
      this.errorMessage = errors.join(' ')
      return false
    }
    this.errorMessage = ''
    return true
  }

  async save (): Promise<void> {
    if (this.saving || !this.validate()) {
      return
    }
    this.saving = true
    try {
      const result = await this.notes.saveNote(this.profileId, {
        title: this.draft.title,
        description: this.draft.description,
        environment: this.draft.environment,
        project: this.draft.project,
        owner: this.draft.owner,
        tags: this.draft.tags,
        color: this.draft.color,
        customTerminalTitle: this.draft.customTerminalTitle,
        terminalTitleEnabled: this.draft.terminalTitleEnabled,
      })
      this.note = result
      this.setDirty(false)
      this.saved.emit(result)
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error)
    } finally {
      this.saving = false
    }
  }

  async clear (): Promise<void> {
    if (this.saving) {
      return
    }
    if (!await this.confirm('清空备注', '清空后该连接将恢复 Tabby 原始标题，且无法撤销。', '清空备注')) {
      return
    }
    this.saving = true
    try {
      await this.notes.deleteNote(this.profileId)
      this.note = null
      this.setDirty(false)
      this.saved.emit(null)
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error)
    } finally {
      this.saving = false
    }
  }

  async cancel (): Promise<void> {
    if (await this.canDeactivate()) {
      this.cancelled.emit()
    }
  }

  async canDeactivate (): Promise<boolean> {
    if (!this.dirty) {
      return true
    }
    return this.confirm('放弃未保存的修改？', '关闭编辑界面后，本次未保存的内容将丢失。', '放弃修改')
  }

  private async confirm (message: string, detail: string, confirmLabel: string): Promise<boolean> {
    const result = await this.platform.showMessageBox({
      type: 'warning',
      message,
      detail,
      buttons: [confirmLabel, '继续编辑'],
      defaultId: 1,
      cancelId: 1,
    })
    return result.response === 0
  }
}
