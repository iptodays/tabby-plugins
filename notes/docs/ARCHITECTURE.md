# 架构与数据流

## 1. 总览

```text
Tabby ConfigService
  └─ sshNotes (schemaVersion / notes / settings / backup)
          │
          ▼
   SSHNotesService  ← 单一数据源（内存缓存 + 变更流 + 保存队列）
     │       │                │
     │       │                ├── NotesPanelComponent ──► NoteEditorService ──► NoteFormComponent
     │       │                ├── SSHNotesSettingsTabComponent
     │       │                └── SSHNotesTerminalDecorator
     │       │
     │       └── PlatformService（导出 / 导入文件对话框）
     │
     └── Tabby ProfilesService（真实 SSH Profile 列表 / 连接 / 原生编辑弹窗）
```

插件不维护第二份磁盘数据。所有 UI 和终端标题都通过 `SSHNotesService` 读取同一份内存缓存。

## 2. 模块与文件

```text
src/
  index.ts                         NgModule 与 provider 注册
  config.ts                        ConfigProvider 默认值
  models.ts                        备注/设置/存储类型、环境常量
  validation.ts                    清洗、校验、迁移、导入解析
  title.ts                         终端标题与列表标题生成
  services/
    ssh-notes.service.ts           数据源、保存队列、备份、导入导出
    profile-actions.service.ts     SSH Profile 查询、连接、原生编辑
    note-editor.service.ts         打开备注编辑弹窗
  decorators/
    terminal-title.decorator.ts    C：终端标题
  components/
    notes-tab.component.ts         独立管理面板 Tab
    notes-panel.component.ts       搜索/筛选/排序/详情/操作
    note-form.component.ts         备注表单
    note-editor-modal.component.ts 表单弹窗 + 未保存确认
    notes-settings-tab.component.ts 设置与数据管理
  providers/
    settings-tab.provider.ts       SettingsTabProvider
    toolbar.provider.ts            SSH Notes 工具栏/起始页入口
    context-menu.provider.ts       SSH 标签右键入口
  ui/styles.ts                     共用样式（Tabby 主题变量）
```

## 3. 数据模型

```ts
interface SSHNote {
  title: string
  description: string
  environment: 'production' | 'staging' | 'development' | 'other'
  project: string
  owner: string
  tags: string[]
  color: string              // #RRGGBB 或空
  customTerminalTitle: string
  terminalTitleEnabled: boolean
  createdAt: string          // ISO 8601
  updatedAt: string
}
```

`notes` 的键是 `Profile.id`，不是名称、host、user 或 port。

```ts
interface SSHNotesConfig {
  schemaVersion: 1
  notes: Record<string, SSHNote>
  settings: SSHNotesSettings
  backup: {
    schemaVersion: number
    savedAt: string
    reason: string
    notes: Record<string, SSHNote>
  } | null
}
```

## 4. 数据流

### 4.1 启动

1. `SSHNotesService.ready()` 等待 `ConfigService.ready$`。
2. 读取 `config.store.sshNotes`。
3. `migrateConfig()` 校验 schema、settings、notes 和 backup。
4. 有效备注进入内存 `Map<profileId, SSHNote>`。
5. 未来版本（`schemaVersion > 1`）进入只读模式，不覆盖原始数据。
6. 迁移发生时写回一次；普通启动不进行磁盘写入。
7. 发出 `changed$`，面板/设置页/终端装饰器读取缓存。

### 4.2 保存备注

```text
NoteForm.save()
  → SSHNotesService.saveNote(profileId, input)
  → sanitizeNote()
  → 更新内存 Map
  → writeRoot()（写入 ConfigProxy）
  → emit changed$
  → 保存队列串行 config.save()
  → 成功：清除错误；失败：保留内存数据并显示“保存失败 + 原因”
```

保存队列使用 revision 计数，避免并发保存丢更新。UI 在显式点击“保存”时等待结果。

### 4.3 终端标题

```text
Tabby 新 SSH 终端
  → TerminalDecorator.attach(terminal)
  → 记录原始 disableDynamicTitle / 原始标题
  → notes.ready()
  → apply()
      ├─ 有可用标题：disableDynamicTitle = true; setTitle(格式化标题)
      └─ 无可用标题：恢复原始状态和标题
  → 订阅 notes.changed$
  → 订阅 terminal.frontend.title$（仅记录服务端标题，用于恢复）
```

标题格式化：

```text
titlePriority = custom-first:
  customTerminalTitle || ([环境] + title) || 原始标题
titlePriority = note-first:
  ([环境] + title) || customTerminalTitle || 原始标题
```

`other` 环境默认不添加前缀；`showEnvironmentPrefix` 可关闭。

当备注没有标题、只填写了说明或标签时，`emptyTitleBehavior` 决定终端标题：`original` 保持 Tabby 原始标题，`profile-name` 显示 SSH 连接名称。没有任何备注的终端不会被插件修改。

### 4.4 导入

```text
Settings → 导入
  → PlatformService.startUpload()
  → 2 MB 限制
  → parseImportDocument()
  → 预览：有效条数 / 无效条数 / 警告 / 错误
  → 用户选择“合并”或“替换”
  → 自动写 internal backup
  → 应用 notes
  → config.save()
```

合并在 Profile ID 相同时比较 `updatedAt`，保留较新的备注。导入只改 `sshNotes.notes`，不触碰 `profiles` 或凭据。

### 4.5 外部配置变化

`ConfigService.changed$` 可能来自原生 Profile 编辑、其他窗口或手动 Config 编辑。服务在 100 ms 防抖后重新读取 `config.store.sshNotes`，更新缓存并发出 `changed$`。自身保存期间跳过重载，避免覆盖正在写入的内存状态。

## 5. 并发与一致性

- 内存缓存是 UI 的读取来源，避免每次终端输出读取磁盘。
- 所有写操作串行进入 `saveChain`。
- 保存失败不丢弃内存状态，UI 显示错误并提供重试。
- `config.save()` 由 Tabby 使用原子写入并生成 `config.yaml.backup`。
- 导入/清空前创建内部快照。
- 多窗口场景通过 `ConfigService.changed$` 重新加载，不缓存过期数据。

## 6. 安全边界

- 备注只作为 Angular 插值文本渲染，不调用 `innerHTML`，不执行。
- 不读取 `PasswordStorageService`、private key 或 vault。
- 不发起网络请求。
- 导入 JSON 校验根节点、schemaVersion、notes 类型、字段类型、颜色、标签数量。
- 导入数据只写入备注节点。
- 本地文件路径来自 `PlatformService.getConfigPath()`，不自行猜测或拼接敏感路径。

## 7. 性能

- 启动时一次读取 + 校验，之后全部走内存。
- 面板搜索是内存字符串匹配；标签去重使用 `Map`。
- 标题更新前比较 `appliedTitle`，重复事件不重复 `setTitle`。
- 终端装饰器只订阅 `frontend.title$` 和 `notes.changed$`，不订阅每个输出 chunk。
- 大量 Profile 下，面板的筛选/排序为 O(n log n)，n 为 SSH Profile 数量，通常远小于终端输出事件量。

## 8. 扩展点选择

| 需求 | 扩展点 | 原因 |
|---|---|---|
| 设置页 | `SettingsTabProvider` | 官方公开 |
| 工具栏/起始页 | `ToolbarButtonProvider` | 官方公开 |
| SSH 标签右键 | `TabContextMenuItemProvider` | 官方公开 |
| 终端标题 | `TerminalDecorator` | 官方公开 |
| 连接 | `ProfilesService.launchProfile()` | 官方公开 |
| 原生 SSH 配置 | `EditProfileModalComponent` + `ProfilesService` | 官方导出组件 |
| 存储 | `ConfigService` | 官方持久化 |
| 文件导入/导出 | `PlatformService` | 官方文件 API |

未使用的脆弱扩展点：替换内置 Provider、DOM 注入、修改 `app.asar`。
