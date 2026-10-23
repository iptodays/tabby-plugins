import { Injectable } from '@angular/core'
import { BehaviorSubject, Subject } from 'rxjs'
import {
  ConfigService,
  FileUpload,
  LogService,
  Logger,
  NotificationsService,
  PlatformService,
} from 'tabby-core'
import {
  CURRENT_SCHEMA_VERSION,
  ImportMode,
  NoteInput,
  PendingImport,
  SSHNote,
  SSHNotesBackup,
  SSHNotesExport,
  SSHNotesSettings,
  createDefaultSettings,
} from '../models'
import {
  cloneNote,
  cloneNotes,
  isSafeNoteKey,
  migrateConfig,
  parseImportDocument,
  sanitizeNote,
  sanitizeSettings,
} from '../validation'

const MAX_IMPORT_BYTES = 2 * 1024 * 1024
const DATA_PATH_SECTION = 'sshNotes'

@Injectable({ providedIn: 'root' })
export class SSHNotesService {
  private logger: Logger
  private root: any = null
  private notes = new Map<string, SSHNote>()
  private settings: SSHNotesSettings = createDefaultSettings()
  private backup: SSHNotesBackup | null = null
  private warnings: string[] = []
  private readOnly = false
  private loaded = false
  private loadPromise: Promise<void> | null = null
  private saveChain: Promise<void> = Promise.resolve()
  private revision = 0
  private savedRevision = 0
  private saving = false
  private reloadTimer: any = null
  private lastErrorMessage: string | null = null

  private readonly changeSubject = new Subject<void>()
  private readonly errorSubject = new BehaviorSubject<string | null>(null)

  constructor (
    private config: ConfigService,
    private platform: PlatformService,
    private notifications: NotificationsService,
    log: LogService,
  ) {
    this.logger = log.create('ssh-notes')
    this.config.changed$.subscribe(() => this.onConfigChanged())
  }

  get changed$ () {
    return this.changeSubject.asObservable()
  }

  get error$ () {
    return this.errorSubject.asObservable()
  }

  get isReadOnly (): boolean {
    return this.readOnly
  }

  get dataWarnings (): string[] {
    return [...this.warnings]
  }

  get lastError (): string | null {
    return this.lastErrorMessage
  }

  async ready (): Promise<void> {
    if (this.loaded) {
      return
    }
    if (!this.loadPromise) {
      this.loadPromise = this.load().catch(error => {
        this.loadPromise = null
        throw error
      })
    }
    await this.loadPromise
  }

  private async load (): Promise<void> {
    await this.config.ready$.toPromise()
    const raw = this.config.store?.sshNotes
    const migrated = migrateConfig(raw)
    this.root = this.config.store?.sshNotes
    if (!this.root) {
      throw new Error('Tabby 配置中没有 sshNotes 数据节点')
    }

    this.settings = migrated.config.settings
    this.notes = new Map(Object.entries(migrated.config.notes))
    this.backup = migrated.config.backup
    this.warnings = migrated.warnings
    this.readOnly = migrated.futureVersion !== null
    this.loaded = true

    if (!this.readOnly) {
      this.writeRoot()
      if (migrated.migrated) {
        this.revision++
        this.persist().catch(error => {
          this.logger.warn('Could not persist migrated notes', error)
        })
      }
    }

    this.emit()
  }

  private onConfigChanged (): void {
    if (!this.loaded || this.saving) {
      return
    }
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer)
    }
    this.reloadTimer = setTimeout(() => {
      this.reloadTimer = null
      this.reloadFromConfig().catch(error => {
        this.logger.warn('Could not reload notes after config change', error)
      })
    }, 100)
  }

  private async reloadFromConfig (): Promise<void> {
    if (this.saving) {
      return
    }
    const raw = this.config.store?.sshNotes
    if (!raw) {
      return
    }
    const migrated = migrateConfig(raw)
    this.root = raw
    this.settings = migrated.config.settings
    this.notes = new Map(Object.entries(migrated.config.notes))
    this.backup = migrated.config.backup
    this.warnings = migrated.warnings
    this.readOnly = migrated.futureVersion !== null
    this.emit()
  }

  private emit (): void {
    this.changeSubject.next()
  }

  private writeRoot (): void {
    if (!this.root || this.readOnly) {
      return
    }
    this.root.schemaVersion = CURRENT_SCHEMA_VERSION
    this.root.notes = this.notesToRecord()
    this.root.backup = this.backup
    const target = this.root.settings
    if (target) {
      for (const key of Object.keys(this.settings) as Array<keyof SSHNotesSettings>) {
        target[key] = this.settings[key]
      }
    }
  }

  private notesToRecord (): Record<string, SSHNote> {
    const result: Record<string, SSHNote> = {}
    for (const [id, note] of this.notes.entries()) {
      if (isSafeNoteKey(id)) {
        result[id] = cloneNote(note)
      }
    }
    return result
  }

  private assertWritable (): void {
    if (this.readOnly) {
      throw new Error('备注数据由更新版本的插件创建，当前处于只读模式，未做任何修改。')
    }
  }

  private async persist (): Promise<void> {
    this.assertWritable()
    this.revision++
    const targetRevision = this.revision
    const run = this.saveChain.then(async () => {
      if (this.savedRevision >= targetRevision) {
        return
      }
      this.saving = true
      try {
        await this.config.save()
        this.savedRevision = targetRevision
        this.lastErrorMessage = null
        this.errorSubject.next(null)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.lastErrorMessage = `保存失败：${message}。备注仍保留在内存中，请检查磁盘空间或配置目录权限后重试。`
        this.errorSubject.next(this.lastErrorMessage)
        this.logger.error('Could not save SSH notes', error)
        throw error
      } finally {
        this.saving = false
      }
    })
    this.saveChain = run.catch(() => undefined)
    return run
  }

  getSettings (): SSHNotesSettings {
    return { ...this.settings }
  }

  getNote (profileId: string): SSHNote | null {
    const note = this.notes.get(profileId)
    return note ? cloneNote(note) : null
  }

  getAllNotes (): Array<{ profileId: string, note: SSHNote }> {
    return [...this.notes.entries()]
      .map(([profileId, note]) => ({ profileId, note: cloneNote(note) }))
      .sort((a, b) => b.note.updatedAt.localeCompare(a.note.updatedAt))
  }

  getAllTags (): string[] {
    const tags = new Map<string, string>()
    for (const note of this.notes.values()) {
      for (const tag of note.tags) {
        const key = tag.toLowerCase()
        if (!tags.has(key)) {
          tags.set(key, tag)
        }
      }
    }
    return [...tags.values()].sort((a, b) => a.localeCompare(b))
  }

  async saveNote (profileId: string, input: NoteInput): Promise<SSHNote | null> {
    await this.ready()
    this.assertWritable()
    if (!profileId) {
      throw new Error('缺少稳定的 SSH Profile ID，无法保存备注。')
    }

    const now = new Date()
    const existing = this.notes.get(profileId)
    const candidate: any = existing
      ? { ...existing }
      : {
          title: '',
          description: '',
          environment: this.settings.defaultEnvironment,
          project: '',
          owner: '',
          tags: [],
          color: '',
          customTerminalTitle: '',
          terminalTitleEnabled: true,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        }
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        candidate[key] = value
      }
    }
    candidate.createdAt = existing?.createdAt ?? now.toISOString()
    candidate.updatedAt = now.toISOString()

    const result = sanitizeNote(candidate, this.settings.defaultEnvironment, now)
    for (const warning of result.warnings) {
      this.logger.warn(warning)
    }

    if (!result.note) {
      this.notes.delete(profileId)
      this.writeRoot()
      this.emit()
      await this.persist()
      return null
    }

    this.notes.set(profileId, result.note)
    this.writeRoot()
    this.emit()
    await this.persist()
    return cloneNote(result.note)
  }

  async deleteNote (profileId: string): Promise<void> {
    await this.ready()
    this.assertWritable()
    if (!this.notes.has(profileId)) {
      return
    }
    this.notes.delete(profileId)
    this.writeRoot()
    this.emit()
    await this.persist()
  }

  async clearAllNotes (): Promise<void> {
    await this.ready()
    this.assertWritable()
    await this.createBackup('before-clear-all')
    this.notes.clear()
    this.writeRoot()
    this.emit()
    await this.persist()
  }

  async updateSettings (patch: Partial<SSHNotesSettings>): Promise<void> {
    await this.ready()
    this.assertWritable()
    const result = sanitizeSettings({ ...this.settings, ...patch })
    this.settings = result.settings
    for (const warning of result.warnings) {
      this.logger.warn(warning)
    }
    this.writeRoot()
    this.emit()
    await this.persist()
  }

  async resetSettings (): Promise<void> {
    await this.ready()
    this.assertWritable()
    this.settings = createDefaultSettings()
    this.writeRoot()
    this.emit()
    await this.persist()
  }

  async createBackup (reason: string): Promise<void> {
    await this.ready()
    this.assertWritable()
    this.backup = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      reason,
      notes: this.notesToRecord(),
    }
    this.writeRoot()
    await this.persist()
  }

  getBackup (): SSHNotesBackup | null {
    if (!this.backup) {
      return null
    }
    return {
      ...this.backup,
      notes: cloneNotes(this.backup.notes),
    }
  }

  async restoreBackup (): Promise<void> {
    await this.ready()
    this.assertWritable()
    if (!this.backup) {
      throw new Error('没有可恢复的备份。')
    }
    this.notes = new Map(Object.entries(cloneNotes(this.backup.notes)))
    this.writeRoot()
    this.emit()
    await this.persist()
  }

  exportDocument (): SSHNotesExport {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      notes: this.notesToRecord(),
    }
  }

  async exportToFile (): Promise<boolean> {
    await this.ready()
    const document = this.exportDocument()
    const text = JSON.stringify(document, null, 2)
    const data = new TextEncoder().encode(text)
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
    const transfer = await this.platform.startDownload(`tabby-ssh-notes_${stamp}.json`, 0o600, data.length)
    if (!transfer) {
      return false
    }
    try {
      await transfer.write(data)
    } finally {
      transfer.close()
    }
    this.notifications.notice('SSH 备注已导出')
    return true
  }

  async pickImportFile (): Promise<PendingImport | null> {
    await this.ready()
    const transfers = await this.platform.startUpload({ multiple: false })
    if (!transfers.length) {
      return null
    }
    const transfer: FileUpload = transfers[0]
    const fileName = transfer.getName()
    try {
      if (transfer.getSize() > MAX_IMPORT_BYTES) {
        return {
          fileName,
          document: null,
          noteCount: 0,
          invalidCount: 0,
          warnings: [],
          errors: [`文件超过 ${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} MB 限制，请缩减后再导入。`],
        }
      }
      const bytes = await transfer.readAll()
      const text = new TextDecoder('utf-8').decode(bytes)
      const parsed = parseImportDocument(text)
      return {
        fileName,
        document: parsed.document,
        noteCount: parsed.noteCount,
        invalidCount: parsed.invalidCount,
        warnings: parsed.warnings,
        errors: parsed.errors,
      }
    } finally {
      transfer.close()
    }
  }

  async applyImport (document: SSHNotesExport, mode: ImportMode): Promise<void> {
    await this.ready()
    this.assertWritable()
    await this.createBackup(`before-import-${mode}`)
    if (mode === 'replace') {
      this.notes = new Map(Object.entries(cloneNotes(document.notes)))
    } else {
      for (const [profileId, note] of Object.entries(document.notes)) {
        const existing = this.notes.get(profileId)
        if (!existing || note.updatedAt >= existing.updatedAt) {
          this.notes.set(profileId, cloneNote(note))
        }
      }
    }
    this.writeRoot()
    this.emit()
    await this.persist()
  }

  getDataPath (): string | null {
    return this.platform.getConfigPath()
  }

  getDataSection (): string {
    return DATA_PATH_SECTION
  }

  async retrySave (): Promise<void> {
    await this.ready()
    await this.persist()
  }
}
