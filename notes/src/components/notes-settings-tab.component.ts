import { Component, OnInit } from '@angular/core'
import {
  AppService,
  BaseComponent,
  NotificationsService,
  PlatformService,
} from 'tabby-core'
import {
  ENVIRONMENT_OPTIONS,
  ImportMode,
  PendingImport,
  SSHNotesBackup,
  SSHNotesSettings,
  createDefaultSettings,
} from '../models'
import { SSHNotesService } from '../services/ssh-notes.service'
import { NotesTabComponent } from './notes-tab.component'
import { SSH_NOTES_STYLES } from '../ui/styles'

type SettingsSection = 'general' | 'display' | 'data'

@Component({
  selector: 'ssh-notes-settings-tab',
  styles: [SSH_NOTES_STYLES],
  template: `
    <div class="ssh-notes-page">
      <div class="ssh-notes-settings-tabs">
        <button type="button" class="btn btn-sm" [class.btn-primary]="section === 'general'" (click)="section = 'general'">常规</button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="section === 'display'" (click)="section = 'display'">显示</button>
        <button type="button" class="btn btn-sm" [class.btn-primary]="section === 'data'" (click)="section = 'data'">数据管理</button>
        <span class="ms-auto"></span>
        <button type="button" class="btn btn-sm btn-secondary" (click)="openManager()">
          <span class="fa fa-list me-1"></span>打开备注管理面板
        </button>
      </div>

      <div class="ssh-notes-banner" *ngIf="notes.isReadOnly">
        备注数据由更新版本的插件创建，当前处于只读模式，不能修改设置或备注。
      </div>
      <div class="ssh-notes-error" *ngIf="errorMessage">
        {{ errorMessage }}
        <button type="button" class="btn btn-sm btn-link" (click)="errorMessage = ''">关闭</button>
      </div>

      <ng-container *ngIf="section === 'general'">
        <div class="ssh-notes-section">
          <h4>常规设置</h4>
          <div class="section-desc">控制 SSH Notes 是否启用，以及终端标签标题的行为。</div>

          <div class="form-line d-flex align-items-center gap-3">
            <div class="header">
              <div class="title">启用 SSH Notes</div>
              <div class="description">关闭后不再修改终端标题，但本地面板中的备注数据仍会保留。</div>
            </div>
            <toggle [ngModel]="settings.enabled" (ngModelChange)="updateSetting('enabled', $event)" [disabled]="notes.isReadOnly"></toggle>
          </div>

          <div class="form-line d-flex align-items-center gap-3">
            <div class="header">
              <div class="title">启用连接列表备注</div>
              <div class="description">在 SSH Notes 面板中显示备注副标题。Tabby 原生连接列表没有公开扩展点，因此不会写入原生列表。</div>
            </div>
            <toggle [ngModel]="settings.showListNotes" (ngModelChange)="updateSetting('showListNotes', $event)" [disabled]="notes.isReadOnly"></toggle>
          </div>

          <div class="form-line d-flex align-items-center gap-3">
            <div class="header">
              <div class="title">启用终端标签备注</div>
              <div class="description">仅对带有备注的 SSH 终端生效，普通本地终端不受影响。</div>
            </div>
            <toggle [ngModel]="settings.showTerminalTitleNotes" (ngModelChange)="updateSetting('showTerminalTitleNotes', $event)" [disabled]="notes.isReadOnly"></toggle>
          </div>

          <div class="form-line d-flex align-items-center gap-3">
            <div class="header">
              <div class="title">显示环境前缀</div>
              <div class="description">例如：[生产] API 主节点。关闭后只显示备注标题。</div>
            </div>
            <toggle [ngModel]="settings.showEnvironmentPrefix" (ngModelChange)="updateSetting('showEnvironmentPrefix', $event)" [disabled]="notes.isReadOnly"></toggle>
          </div>

          <div class="form-line">
            <div class="header">
              <div class="title">默认环境</div>
              <div class="description">新建备注时默认选中的环境。</div>
            </div>
            <select class="form-select" [ngModel]="settings.defaultEnvironment" (ngModelChange)="updateSetting('defaultEnvironment', $event)" [disabled]="notes.isReadOnly">
              <option *ngFor="let option of environmentOptions" [ngValue]="option.value">{{ option.label }}</option>
            </select>
          </div>

          <div class="form-line">
            <div class="header">
              <div class="title">空备注时的终端标题</div>
              <div class="description">备注没有标题、只填写了说明/标签时，如何处理终端标题。</div>
            </div>
            <select class="form-select" [ngModel]="settings.emptyTitleBehavior" (ngModelChange)="updateSetting('emptyTitleBehavior', $event)" [disabled]="notes.isReadOnly">
              <option value="original">保持 Tabby 原始标题</option>
              <option value="profile-name">显示 SSH 连接名称</option>
            </select>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="section === 'display'">
        <div class="ssh-notes-section">
          <h4>标题与显示</h4>
          <div class="section-desc">这些设置只影响显示，不会修改 SSH 连接参数或凭据。</div>

          <div class="form-line">
            <div class="header">
              <div class="title">备注标题优先级</div>
              <div class="description">当自定义终端标题与备注标题同时存在时使用哪一个。</div>
            </div>
            <select class="form-select" [ngModel]="settings.titlePriority" (ngModelChange)="updateSetting('titlePriority', $event)" [disabled]="notes.isReadOnly">
              <option value="custom-first">自定义终端标题优先</option>
              <option value="note-first">备注标题优先</option>
            </select>
          </div>

          <div class="form-line d-flex align-items-center gap-3">
            <div class="header">
              <div class="title">在面板中显示标签</div>
            </div>
            <toggle [ngModel]="settings.showTags" (ngModelChange)="updateSetting('showTags', $event)" [disabled]="notes.isReadOnly"></toggle>
          </div>

          <div class="form-line d-flex align-items-center gap-3">
            <div class="header">
              <div class="title">显示环境颜色</div>
              <div class="description">颜色只作为辅助信息，环境文字始终显示。</div>
            </div>
            <toggle [ngModel]="settings.showEnvironmentColor" (ngModelChange)="updateSetting('showEnvironmentColor', $event)" [disabled]="notes.isReadOnly"></toggle>
          </div>

          <div class="form-line d-flex align-items-center gap-3">
            <div class="header">
              <div class="title">截断过长标题</div>
              <div class="description">避免超长备注标题占满终端标签。</div>
            </div>
            <toggle [ngModel]="settings.truncateLongTitles" (ngModelChange)="updateSetting('truncateLongTitles', $event)" [disabled]="notes.isReadOnly"></toggle>
          </div>

          <div class="form-line">
            <div class="header">
              <div class="title">终端标题最大长度</div>
              <div class="description">20–200 个字符，超出时截断并添加省略号。</div>
            </div>
            <input class="form-control" type="number" min="20" max="200" [ngModel]="settings.maxTerminalTitleLength" (ngModelChange)="updateNumberSetting('maxTerminalTitleLength', $event)" [disabled]="notes.isReadOnly">
          </div>

          <div class="form-line">
            <div class="header">
              <div class="title">列表标题最大长度</div>
              <div class="description">10–120 个字符，仅影响面板列表的截断显示。</div>
            </div>
            <input class="form-control" type="number" min="10" max="120" [ngModel]="settings.maxListTitleLength" (ngModelChange)="updateNumberSetting('maxListTitleLength', $event)" [disabled]="notes.isReadOnly">
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="section === 'data'">
        <div class="ssh-notes-section">
          <h4>本地数据</h4>
          <div class="section-desc">
            备注保存在 Tabby 配置文件的 <strong>{{ dataSection }}</strong> 节点中。Tabby 保存配置时会生成
            <strong>config.yaml.backup</strong>；本插件在导入或清空前还会创建内部快照。
          </div>
          <div class="ssh-notes-data-path">{{ dataPath || '无法取得 Tabby 配置路径' }}</div>
          <div class="d-flex flex-wrap gap-2 mt-2">
            <button type="button" class="btn btn-sm btn-secondary" [disabled]="!dataPath" (click)="openDataFolder()">
              <span class="fa fa-folder-open me-1"></span>打开所在文件夹
            </button>
            <button type="button" class="btn btn-sm btn-primary" [disabled]="exporting" (click)="exportNotes()">
              <span class="fa fa-download me-1"></span>{{ exporting ? '导出中…' : '导出备注 JSON' }}
            </button>
            <button type="button" class="btn btn-sm btn-secondary" [disabled]="importing || notes.isReadOnly" (click)="chooseImport()">
              <span class="fa fa-upload me-1"></span>{{ importing ? '读取中…' : '导入备注 JSON' }}
            </button>
          </div>

          <div class="ssh-notes-import-preview" *ngIf="pendingImport">
            <h4>导入预览：{{ pendingImport.fileName }}</h4>
            <div class="ssh-notes-error" *ngIf="pendingImport.errors.length">
              <div *ngFor="let error of pendingImport.errors">{{ error }}</div>
            </div>
            <div *ngIf="!pendingImport.errors.length">
              有效备注 <strong>{{ pendingImport.noteCount }}</strong> 条；
              无效/跳过 <strong>{{ pendingImport.invalidCount }}</strong> 条。
            </div>
            <ul *ngIf="pendingImport.warnings.length">
              <li *ngFor="let warning of pendingImport.warnings">{{ warning }}</li>
            </ul>
            <div class="small text-muted">
              导入前会自动创建当前备注的快照。合并模式按 Profile ID 和更新时间保留较新的备注；替换模式会用文件内容替换全部备注。
            </div>
            <div class="d-flex flex-wrap gap-2 mt-2">
              <button type="button" class="btn btn-sm btn-primary" [disabled]="!pendingImport.document || importing" (click)="applyImport('merge')">合并导入</button>
              <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="!pendingImport.document || importing" (click)="applyImport('replace')">替换全部备注</button>
              <button type="button" class="btn btn-sm btn-secondary" [disabled]="importing" (click)="cancelImport()">取消</button>
            </div>
          </div>
        </div>

        <div class="ssh-notes-section">
          <h4>备份与恢复</h4>
          <div class="section-desc">内部快照保存在同一配置文件中，不包含 SSH 密码或私钥。</div>
          <div *ngIf="backup; else noBackup">
            最近备份：{{ formatDate(backup.savedAt) }}（{{ backup.reason }}，{{ backupNoteCount(backup) }} 条备注）
            <div class="mt-2">
              <button type="button" class="btn btn-sm btn-secondary" [disabled]="notes.isReadOnly" (click)="createBackup()">立即创建快照</button>
              <button type="button" class="btn btn-sm btn-outline-danger ms-2" [disabled]="notes.isReadOnly" (click)="restoreBackup()">恢复此备份</button>
            </div>
          </div>
          <ng-template #noBackup>
            <div class="text-muted">还没有内部快照。</div>
            <button type="button" class="btn btn-sm btn-secondary mt-2" [disabled]="notes.isReadOnly" (click)="createBackup()">立即创建快照</button>
          </ng-template>
        </div>

        <div class="ssh-notes-section">
          <h4>重置与清除</h4>
          <div class="section-desc">重置设置不会删除备注；清除备注不会修改任何 SSH Profile 或凭据。</div>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-sm btn-secondary" [disabled]="notes.isReadOnly" (click)="resetSettings()">重置插件设置</button>
            <button type="button" class="btn btn-sm btn-outline-danger" [disabled]="notes.isReadOnly" (click)="clearAllNotes()">清除全部备注…</button>
          </div>
        </div>
      </ng-container>
    </div>
  `,
})
export class SSHNotesSettingsTabComponent extends BaseComponent implements OnInit {
  section: SettingsSection = 'general'
  settings: SSHNotesSettings = createDefaultSettings()
  environmentOptions = ENVIRONMENT_OPTIONS
  dataPath: string | null = null
  dataSection = 'sshNotes'
  pendingImport: PendingImport | null = null
  backup: SSHNotesBackup | null = null
  importing = false
  exporting = false
  errorMessage = ''

  constructor (
    public notes: SSHNotesService,
    private platform: PlatformService,
    private notifications: NotificationsService,
    private app: AppService,
  ) {
    super()
  }

  async ngOnInit (): Promise<void> {
    await this.notes.ready()
    this.sync()
    this.subscribeUntilDestroyed(this.notes.changed$, () => this.sync())
    this.subscribeUntilDestroyed(this.notes.error$, error => {
      if (error) {
        this.errorMessage = error
      }
    })
  }

  private sync (): void {
    this.settings = this.notes.getSettings()
    this.dataPath = this.notes.getDataPath()
    this.dataSection = this.notes.getDataSection()
    this.backup = this.notes.getBackup()
  }

  async updateSetting<K extends keyof SSHNotesSettings> (key: K, value: SSHNotesSettings[K]): Promise<void> {
    if (this.notes.isReadOnly) {
      return
    }
    this.settings = { ...this.settings, [key]: value }
    try {
      await this.notes.updateSettings({ [key]: value })
      this.errorMessage = ''
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : String(error)
      this.sync()
    }
  }

  async updateNumberSetting (key: 'maxTerminalTitleLength' | 'maxListTitleLength', value: unknown): Promise<void> {
    const number = typeof value === 'number' ? value : parseInt(String(value), 10)
    if (!Number.isFinite(number)) {
      return
    }
    await this.updateSetting(key, number)
  }

  openManager (): void {
    const existing = this.app.tabs.find(tab => tab instanceof NotesTabComponent)
    if (existing) {
      this.app.selectTab(existing)
      return
    }
    this.app.openNewTabRaw({ type: NotesTabComponent })
  }

  openDataFolder (): void {
    if (!this.dataPath) {
      return
    }
    this.platform.showItemInFolder(this.dataPath)
  }

  async exportNotes (): Promise<void> {
    if (this.exporting) {
      return
    }
    this.exporting = true
    this.errorMessage = ''
    try {
      await this.notes.exportToFile()
    } catch (error) {
      this.errorMessage = `导出失败：${error instanceof Error ? error.message : String(error)}`
    } finally {
      this.exporting = false
    }
  }

  async chooseImport (): Promise<void> {
    this.importing = true
    this.errorMessage = ''
    try {
      this.pendingImport = await this.notes.pickImportFile()
      if (this.pendingImport?.errors.length) {
        this.errorMessage = '导入文件校验未通过，请查看下方原因。'
      }
    } catch (error) {
      this.errorMessage = `读取导入文件失败：${error instanceof Error ? error.message : String(error)}`
    } finally {
      this.importing = false
    }
  }

  async applyImport (mode: ImportMode): Promise<void> {
    if (!this.pendingImport?.document || this.importing) {
      return
    }
    this.importing = true
    this.errorMessage = ''
    try {
      await this.notes.applyImport(this.pendingImport.document, mode)
      this.notifications.notice(mode === 'replace' ? '备注已替换导入' : '备注已合并导入')
      this.pendingImport = null
      this.sync()
    } catch (error) {
      this.errorMessage = `导入失败：${error instanceof Error ? error.message : String(error)}`
    } finally {
      this.importing = false
    }
  }

  cancelImport (): void {
    this.pendingImport = null
  }

  async createBackup (): Promise<void> {
    try {
      await this.notes.createBackup('manual')
      this.notifications.notice('已创建备注快照')
      this.sync()
    } catch (error) {
      this.errorMessage = `创建快照失败：${error instanceof Error ? error.message : String(error)}`
    }
  }

  async restoreBackup (): Promise<void> {
    const result = await this.platform.showMessageBox({
      type: 'warning',
      message: '恢复上次备注快照？',
      detail: '当前备注会被快照内容替换。SSH Profile 和凭据不会被修改。',
      buttons: ['恢复', '取消'],
      defaultId: 1,
      cancelId: 1,
    })
    if (result.response !== 0) {
      return
    }
    try {
      await this.notes.restoreBackup()
      this.notifications.notice('备注快照已恢复')
      this.sync()
    } catch (error) {
      this.errorMessage = `恢复失败：${error instanceof Error ? error.message : String(error)}`
    }
  }

  async resetSettings (): Promise<void> {
    if (this.notes.isReadOnly) {
      return
    }
    const result = await this.platform.showMessageBox({
      type: 'warning',
      message: '重置 SSH Notes 设置？',
      detail: '只恢复显示和标题设置，不会删除任何备注，也不会修改 SSH Profile 或凭据。',
      buttons: ['重置设置', '取消'],
      defaultId: 1,
      cancelId: 1,
    })
    if (result.response !== 0) {
      return
    }
    try {
      await this.notes.resetSettings()
      this.notifications.notice('SSH Notes 设置已重置')
      this.sync()
    } catch (error) {
      this.errorMessage = `重置失败：${error instanceof Error ? error.message : String(error)}`
    }
  }

  async clearAllNotes (): Promise<void> {
    if (this.notes.isReadOnly) {
      return
    }
    const first = await this.platform.showMessageBox({
      type: 'warning',
      message: '清除全部 SSH 备注？',
      detail: '这会删除所有连接备注，并恢复相关终端标题。操作前会自动创建内部快照。',
      buttons: ['继续', '取消'],
      defaultId: 1,
      cancelId: 1,
    })
    if (first.response !== 0) {
      return
    }
    const second = await this.platform.showMessageBox({
      type: 'warning',
      message: '最后确认：清除全部备注？',
      detail: 'SSH Profile、密码、私钥和连接参数不会被修改。备注删除后只能从备份恢复。',
      buttons: ['清除全部备注', '取消'],
      defaultId: 1,
      cancelId: 1,
    })
    if (second.response !== 0) {
      return
    }
    try {
      await this.notes.clearAllNotes()
      this.notifications.notice('全部 SSH 备注已清除')
      this.sync()
    } catch (error) {
      this.errorMessage = `清除失败：${error instanceof Error ? error.message : String(error)}`
    }
  }

  backupNoteCount (backup: SSHNotesBackup): number {
    return Object.keys(backup.notes).length
  }

  formatDate (value: string): string {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
  }
}
