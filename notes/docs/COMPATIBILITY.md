# 兼容性说明

## 1. 实际验证版本

| 项目 | 版本 |
|---|---|
| Tabby Desktop | `1.0.238` |
| 应用 | `<Tabby 安装目录>\Tabby.exe` |
| `tabby-core` | `1.0.231-nightly.0` |
| `tabby-ssh` | `1.0.231-nightly.0` |
| `tabby-terminal` | `1.0.231-nightly.0` |
| `tabby-settings` | `1.0.231-nightly.0` |
| Angular | 15 |
| Electron | 43.7.0 |
| 操作系统 | Windows 11 |
| 构建 Node | v24.22.1 |

Tabby 应用版本为 `1.0.238`，但其内置插件目录中的 `package.json` 版本为 `1.0.231-nightly.0`。插件开发依赖使用后者，以匹配实际加载的 `.d.ts` 与运行时。

npm 上没有 `tabby-core@1.0.238`。不要为了“版本号一致”而使用不存在的版本。

## 2. 支持的 Tabby 范围

本版本**只声明在 Tabby 1.0.238 上完成实际验证**。

插件使用的公开扩展点：

- `ConfigProvider`
- `SettingsTabProvider`
- `ToolbarButtonProvider`
- `TabContextMenuItemProvider`
- `TerminalDecorator`
- `ProfilesService`
- `EditProfileModalComponent`（`tabby-settings` 导出）
- `PlatformService` 文件导入/导出

这些扩展点在 1.0.231-nightly / 1.0.238 的源码中确认存在。不同 Tabby 版本可能改变：

- Angular 版本或 DI 行为。
- `BaseTerminalTabComponent` 的标题字段/事件。
- `SettingsTabProvider` 接口。
- `Profile.id` 生成规则。
- `PlatformService` 文件 API。
- 插件加载目录或打包要求。

在其他版本上请先运行 `npm run typecheck` / `npm run build`，并在测试实例中验证，不要直接用于生产。

## 3. 已知兼容性限制

### 3.1 原生连接列表

Tabby 当前版本没有公开的 Profile Tree / 连接选择器扩展点。备注显示在插件自有面板中。这是功能 A 的受支持替代实现，不是原生列表注入。

### 3.2 原生 SSH 配置弹窗

Tabby 通过 `SSHProfilesService.settingsComponent` 固定原生表单，没有插件插槽。备注编辑器是插件自有表单，不嵌入原生弹窗。

### 3.3 内置导入 Profile

通过 `~/.ssh/config` 等导入器生成的 Profile ID 由 Tabby 生成。如果导入源重新排序、删除或修改，ID 可能变化，备注会成为孤立备注。

自定义 Profile 的 ID 为 `ssh:custom:<slug>:<uuid>`，重命名不会改变 ID。

### 3.4 用户手动标签标题

用户通过 Tabby 双击标签设置 `customTitle` 后，`customTitle` 优先于插件标题。插件不会强行覆盖。清除手动标题后，备注标题恢复显示。

### 3.5 环境前缀

“其他”环境默认不添加 `[其他]` 前缀，只显示备注标题。生产/测试/开发会添加中文前缀。前缀可通过设置关闭。

### 3.6 同名/同主机 Profile

备注按 `Profile.id` 关联。即使两个 Profile 的 host、user、port、name 相同，只要 ID 不同，备注就独立。反过来，如果 Profile 被删除后以相同名称/主机重新创建，由于 ID 是新的，旧备注不会自动附加。

## 4. 插件加载失败诊断

1. 查看 `%APPDATA%\tabby\log.txt`：

   ```text
   Could not load ssh-notes:
   Angular bootstrapping error:
   ```

2. Tabby 启动失败时会尝试安全模式；选择安全模式并进入 **Settings → Plugins** 禁用 `SSH Notes`。
3. 运行：

   ```powershell
   npm run doctor
   ```

   或：

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/diagnose.ps1
   ```

4. 确认插件目录：

   ```text
   %APPDATA%\tabby\plugins\node_modules\tabby-ssh-notes
   ```

5. 确认 `dist/index.js` 存在，且 `package.json` 含 `tabby-plugin` keyword。

6. 如升级后无法加载，安装与本机 Tabby 版本匹配的插件构建，不要修改 `app.asar`。

## 5. 升级与数据兼容

- 数据版本：`sshNotes.schemaVersion`，当前为 `1`。
- `migrateConfig()` 支持缺少 schemaVersion 的旧结构、数组形式 notes、缺失 settings。
- 高于当前版本的 schema 进入只读模式，不覆盖原数据；需升级插件。
- 导入前自动创建 `sshNotes.backup` 快照。
- Tabby 自身保存配置时生成 `config.yaml.backup`。

升级步骤：

1. 先导出备注 JSON 作为外部备份。
2. 退出 Tabby。
3. 替换 `%APPDATA%\tabby\plugins\node_modules\tabby-ssh-notes`。
4. 重启 Tabby。
5. 打开 SSH Notes，检查备注和设置；如异常，恢复 JSON 或内部快照。

## 6. 卸载

```powershell
Remove-Item (Join-Path $env:APPDATA 'tabby\plugins\node_modules\tabby-ssh-notes') -Recurse -Force
```

卸载不会删除 `config.yaml` 中的 `sshNotes`。需要清理数据时：

1. 先导出 JSON。
2. 退出 Tabby。
3. 备份 `config.yaml`。
4. 手动删除 `sshNotes` 根节点。
5. 重启 Tabby。

不要删除整个 `config.yaml`，其中还有 SSH Profile、分组、热键等配置。

## 7. 安全与权限

- 不需要管理员权限。
- 不需要关闭 Windows Defender。
- 不需要修改 PowerShell 执行策略；开发脚本通过单次 `-ExecutionPolicy Bypass` 运行。
- 插件不读取 SSH 密码、私钥或 vault。
- 插件只写入 Tabby 配置文件和用户选择的导出文件。
