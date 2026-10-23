# 技术可行性报告

- 验证日期：2026-10-23
- 验证机器：Windows 11
- Tabby 安装：`<Tabby 安装目录>\Tabby.exe`
- Tabby 版本：`1.0.238`
- 内置插件版本：`tabby-core` / `tabby-ssh` / `tabby-terminal` / `tabby-settings` 均为 `1.0.231-nightly.0`
- 前端：Angular 15
- 构建工具：Node.js `v24.22.1`、npm `11.19.1`、webpack 5、TypeScript 4.9.5

本报告的依据是本机安装目录中的**真实源码与 `.d.ts`**，不是仅根据文档推断：

```text
<Tabby 安装目录>\resources\builtin-plugins\tabby-core\src
<Tabby 安装目录>\resources\builtin-plugins\tabby-ssh\src
<Tabby 安装目录>\resources\builtin-plugins\tabby-terminal\src
<Tabby 安装目录>\resources\builtin-plugins\tabby-settings\src
<Tabby 安装目录>\resources\app.asar\dist\bundle.js
<Tabby 安装目录>\resources\app.asar\dist\main.js
```

## 1. 插件加载机制

Tabby 插件是普通 npm 包，`package.json` 必须包含 `tabby-plugin` keyword，默认导出必须是 Angular `NgModule`：

```ts
@NgModule({ ... })
export default class MyModule {}
```

加载逻辑位于 `app.asar` 的 `src/plugins.ts`：

- 内置插件从 `resources/builtin-plugins` 加载。
- 用户插件从 `app.getPath('userData')/plugins` 下的 `node_modules` 查找。
- 目录本身含 `package.json` 时可直接作为插件；否则扫描以 `tabby-` / `terminus-` 开头的子目录。
- 使用 `nodeRequire(foundPlugin.path)` 加载，读取 `packageModule.default`。
- `TABBY_PLUGINS` 环境变量额外追加查找路径。

Windows 注意：加载器使用 `process.env.TABBY_PLUGINS.split(':')`，会破坏 `C:\...` 这样的绝对路径。因此开发安装使用目录联接：

```text
%APPDATA%\tabby\plugins\node_modules\tabby-ssh-notes
  -> <仓库目录>\ssh-notes
```

**实际验证结果**：测试实例（独立 `TABBY_CONFIG_DIRECTORY`）成功加载本插件，`window.pluginModules` 中出现 `ssh-notes`，Tabby 设置页出现 `SSH Notes`，日志中无加载错误。

## 2. 功能 A：SSH 连接列表备注

### 2.1 原生连接列表

相关源码：

- `tabby-core/src/components/profileTree.component.ts`
- `tabby-core/src/components/profileTree.component.pug`
- `tabby-core/src/components/selectorModal.component.ts`
- `tabby-core/src/services/profiles.service.ts`

`profileTree.component.pug` 只渲染：

```pug
span.ms-2.no-wrap {{ profile.name }}
```

没有副标题字段、`ng-content`、组件插槽或 `TabContextMenuItemProvider` 查询。欢迎页/侧边栏 Profile Tree 无法由插件追加内容。

连接选择器 `selectorModal` 显示的 `description` 来自：

```ts
description: provider?.getDescription(fullProfile)
```

而 SSH Provider 的 `getDescription()` 固定返回 host：

```ts
getDescription (profile: PartialProfile<SSHProfile>): string {
    return profile.options?.host ?? ''
}
```

没有公开 API 允许插件仅为某个 Provider 追加描述，也不能安全地覆盖 `ProfilesService` 的 `selectorOptionForProfile()`。

### 2.2 结论

**原生连接列表没有安全、稳定的扩展点。**

替代实现：插件自有的 **SSH Notes 管理面板**，通过 `ProfilesService.getProfiles()`、`ProfilesService.launchProfile()` 和原生 `EditProfileModalComponent` 接入真实连接数据与操作。没有使用 DOM 注入、替换内置组件或修改安装目录。

管理面板支持：

- 搜索名称、备注、说明、IP、用户名、项目、负责人、标签。
- 环境/标签筛选。
- 名称、更新时间、环境、项目排序。
- 一键连接。
- 打开原生 SSH 配置。
- 孤立备注查看和删除。

## 3. 功能 B：连接配置中的备注编辑

### 3.1 原生 Profile 编辑弹窗

相关源码：

- `tabby-settings/src/components/editProfileModal.component.ts`
- `tabby-settings/src/components/editProfileModal.component.pug`
- `tabby-ssh/src/profiles.ts`
- `tabby-ssh/src/components/sshProfileSettings.component.pug`

`EditProfileModalComponent` 在 `ngAfterViewInit` 中通过：

```ts
const componentType = this.profileProvider.settingsComponent
const componentFactory = this.componentFactoryResolver.resolveComponentFactory(componentType)
```

创建 Provider 自带的设置组件。SSH Provider 将其固定为：

```ts
settingsComponent = SSHProfileSettingsComponent
```

`sshProfileSettings.component.pug` 没有 `ng-content`，`EditProfileModalComponent` 也没有额外的设置区块 Provider 数组。插件无法在原生弹窗中安全追加一个备注区域。

### 3.2 结论

**原生 SSH Profile 配置弹窗没有公开插槽。**

替代实现：

- 插件自有的完整备注编辑表单。
- 入口：SSH Notes 面板、SSH 终端标签右键菜单。
- 编辑器顶部展示连接名称、host、user、port、分组。
- 提供“打开原生 SSH 配置”按钮，调用真实的 `EditProfileModalComponent`。
- 不覆盖、不修改任何原生 SSH 字段。

如果强行把表单嵌入原生弹窗，只能替换 `SSHProfilesService.settingsComponent` 或直接操作 DOM，这两者都会在 Tabby 升级时破坏，因此未采用。

## 4. 功能 C：终端标签标题

### 4.1 可能的扩展点

源码依据：

- `tabby-terminal/src/api/decorator.ts`：官方 `TerminalDecorator`。
- `tabby-terminal/src/api/baseTerminalTab.component.ts`：
  - `profile` 指向当前 Profile。
  - `frontend.title$` 接收 xterm 标题事件。
  - `disableDynamicTitle` 控制是否接受动态标题。
- `tabby-core/src/components/baseTab.component.ts`：
  - `title` / `customTitle` / `displayTitle`。
  - `setTitle()` 更新标签标题。
- `tabby-terminal/src/middleware/oscProcessing.ts`：OSC 序列透传，不拦截标题。

### 4.2 采用策略

`SSHNotesTerminalDecorator` 只处理：

```ts
profile.type === 'ssh' && profile.id
```

并执行：

1. 记录该标签原始的 `disableDynamicTitle`。
2. 记录最近一次 `frontend.title$`，仅用于恢复。
3. 备注标题生效时，将该标签实例的 `disableDynamicTitle` 设为 `true`，阻止服务器 OSC 覆盖。
4. 调用 `setTitle()` 设置生成标题。
5. 备注变更时重新计算；只有标题变化时才更新。
6. 备注清空、功能关闭或插件禁用时：
   - 恢复原始 `disableDynamicTitle`。
   - 如果原始值为 `true`，恢复 Profile 名称（符合 Tabby 原本“禁用动态标题”的行为）。
   - 如果原始值为 `false`，恢复最后记录的服务端标题。
7. 标签销毁时只恢复原始 `disableDynamicTitle`，不再写回标题。
8. 不使用 `customTitle` 强制覆盖用户手动重命名；用户手动标题仍优先显示。

### 4.3 实际验证

在 Tabby 1.0.238 + 本地测试 SSH 服务器上验证：

- 成功连接后标签显示 `[生产] API 主节点`。
- 服务器发送 `OSC 0;SERVER-OSC-TITLE` 后：
  - `frontend.title$` 收到 `SERVER-OSC-TITLE`。
  - 标签标题仍保持 `[生产] API 主节点`。
- 删除备注后标签恢复 `notes-test-ssh`（原始 `disableDynamicTitle: true`）。
- 断开/重连后标题保持正确。
- 同一 Profile 打开两个 SSH 标签，两个标签都显示备注标题。
- 本地终端标签未受影响。

结论：**功能 C 可以通过公开 API 稳定实现**。

## 5. 本地存储

### 5.1 采用方案

使用 Tabby 官方 `ConfigService`：

```ts
config.store.sshNotes
config.save()
config.changed$
```

实际配置文件：

```text
%APPDATA%\tabby\config.yaml
```

Tabby 主进程 `app:save-config` 使用 `atomically.writeFile`，随后写入 `config.yaml.backup`。插件不假设可以直接写文件系统，也不依赖 Node `fs`。

数据结构：

```ts
interface SSHNotesConfig {
  schemaVersion: 1
  notes: Record<string, SSHNote>
  settings: SSHNotesSettings
  backup: SSHNotesBackup | null
}
```

### 5.2 导入/导出

使用官方 `PlatformService`：

- `startDownload(name, mode, size)`：保存 JSON，Electron 弹出保存对话框。
- `startUpload({ multiple: false })`：选择 JSON 文件。
- `FileUpload.readAll()`：读取内容，限制 2 MB。
- 导入前进行完整校验，并自动创建 `backup` 快照。

插件没有使用 `nodeRequire('fs')`，也没有写入 Tabby 安装目录。

### 5.3 Profile 关联

使用 `Profile.id`：

- 自定义 SSH Profile ID 由 Tabby 生成为 `ssh:custom:<slug>:<uuid>`。
- `ProfilesService.writeProfile()` 在重命名时保留原 `id`。
- 复制 Profile 会生成新 UUID，不会错误继承备注。
- 不使用名称、host、user、port 作为关联依据。

实际验证：将 Profile 名称从 `notes-test-ssh` 改为 `renamed-ssh-test` 后，`id` 不变，备注仍可读取。

已知限制：内置导入 Profile 的 ID 由导入器生成，可能随 `~/.ssh/config` 源变化；这是 Tabby 导入器的行为，不是备注关联设计问题。

## 6. 插件设置页与 UI

`SettingsTabProvider` 是公开扩展点：

```ts
@Injectable()
export class MySettingsTabProvider extends SettingsTabProvider {
  id = 'my-plugin'
  getComponentType () { return MySettingsTabComponent }
}
```

`TabbyCoreModule` 导出 `ToggleComponent`、`ProfileIconComponent`、`TranslateModule` 等，插件复用 Bootstrap 类与 Tabby 主题变量，不引入大型 UI 框架。

## 7. 结论汇总

| 能力 | 可行性 | 实现方式 |
|---|---|---|
| 插件加载 / Angular 注入 | 已验证 | 普通 Tabby npm 插件 + NgModule |
| 稳定 Profile ID | 已验证 | `Profile.id` |
| 原生连接列表备注 | 不可行 | 无公开扩展点；改用自有面板 |
| 原生 SSH 配置内嵌备注 | 不可行 | 无公开插槽；改用自有编辑器 |
| 终端标签备注 | 已验证 | `TerminalDecorator` + `disableDynamicTitle` |
| 本地持久化 | 已验证 | `ConfigService` + `config.yaml` |
| 导入/导出 | 已验证（服务层） | `PlatformService` 文件 API |
| 不修改核心/安装目录 | 满足 | 仅用户插件目录 + 配置节点 |

## 8. 未采用的脆弱方案

以下方案被明确排除：

- 替换内置 `SSHProfilesService` 的 `settingsComponent`。
- 修改 `app.asar` 或 `resources/builtin-plugins`。
- 通过 DOM 选择器向原生连接列表/原生弹窗追加节点。
- 直接修改 Tabby 的内部 Angular 组件实例。
- 将备注写回 SSH Profile 字段。

这些方案可能在当前版本“看起来能用”，但升级后极易失效，也违反项目约束。
