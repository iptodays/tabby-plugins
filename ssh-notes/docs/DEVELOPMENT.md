# 开发指南

## 1. 环境要求

实际验证环境：

- Windows 11
- Tabby `1.0.238`（`<Tabby 安装目录>\Tabby.exe`）
- Node.js `v24.22.1`
- npm `11.19.1`
- Angular 15（由 Tabby 提供）
- 内置插件 `1.0.231-nightly.0`

开发依赖固定为：

```text
tabby-core@1.0.231-nightly.0
tabby-settings@1.0.231-nightly.0
tabby-terminal@1.0.231-nightly.0
@angular/*@15.2.10
typescript@4.9.5
webpack@5.89.0
```

`tabby-*` 没有 `1.0.238` 的 npm 版本；`1.0.231-nightly.0` 与本机内置插件一致。TypeScript 低于 5.0 是因为 Angular 15 的 `@angular/compiler-cli` peer 要求。

## 2. 安装依赖

```powershell
cd <仓库目录>\ssh-notes
npm install
```

## 3. 开发模式加载

不推荐依赖 `TABBY_PLUGINS`：Tabby 的 Windows 加载器用 `:` 分割该变量，会破坏 `C:\...` 绝对路径。

使用脚本创建目录联接：

```powershell
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-dev.ps1
```

它创建：

```text
%APPDATA%\tabby\plugins\node_modules\tabby-ssh-notes
  -> 当前项目目录
```

完全退出 Tabby 后重新启动。启动时使用 `--debug` 可以打开 DevTools：

```powershell
& "<Tabby 安装目录>\Tabby.exe" --debug
```

插件日志输出到：

```text
%APPDATA%\tabby\log.txt
```

也可以在 Tabby 内 **Settings → Application → Open DevTools** 查看渲染进程 console。

修改代码后：

```powershell
npm run build
```

然后重新启动 Tabby。Tabby 不会热重载插件入口模块。

卸载开发联接：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/uninstall-dev.ps1
```

该脚本只删除指向本项目的 Junction，不删除备注。

## 4. 常用命令

```powershell
npm run typecheck    # TypeScript 类型检查
npm test             # Jest 自动化测试
npm run build        # 生产构建，输出 dist/index.js
npm run build:dev    # 开发构建，不压缩
npm run pack         # 构建并生成 tabby-ssh-notes-0.1.0.tgz
npm run doctor       # 运行诊断脚本
```

`npm run build` 会先清理 `dist/`，然后由 webpack 生成 CommonJS bundle。入口必须是默认导出的 Angular `NgModule`。

如果 Tabby 不在默认安装位置，可把路径传给诊断脚本：

```powershell
npm run doctor -- -TabbyExe "<Tabby 安装目录>\Tabby.exe"
```

## 5. 调试

### 5.1 加载失败

1. 查看 `%APPDATA%\tabby\log.txt` 中是否有 `Could not load ssh-notes` 或 `Angular bootstrapping error`。
2. 检查插件目录：

   ```powershell
   Get-ChildItem "$env:APPDATA\tabby\plugins\node_modules\tabby-ssh-notes"
   ```

3. 确认 `dist/index.js` 存在。
4. 确认 `package.json` 有 `tabby-plugin` keyword，且 `main` 指向 `dist/index.js`。
5. 运行：

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/diagnose.ps1
   ```

### 5.2 插件已加载但界面不出现

- 检查 `window.pluginModules` 是否包含 `ssh-notes`。
- 检查设置页是否出现 `SSH Notes`。
- 检查是否有 Angular 模板错误（DevTools console）。

### 5.3 终端标题不变化

- 确认备注存在且 `terminalTitleEnabled` 为 true。
- 确认设置中“启用 SSH Notes”和“启用终端标签备注”均开启。
- 确认终端是 SSH 连接，不是本地终端。
- 如果用户手动重命名了标签，`customTitle` 会优先；右键标签清除自定义标题，或重新打开终端。
- 查看 `BaseTerminalTabComponent.disableDynamicTitle` 是否为 true；插件会在有备注时强制为 true。

### 5.4 导入/导出

导入/导出使用 Tabby 官方的 `PlatformService.startUpload()` / `startDownload()`。在 Electron 中会弹出系统文件对话框。若对话框未出现，检查是否有其他模态窗口阻塞。

### 5.5 数据恢复

- `%APPDATA%\tabby\config.yaml.backup`：Tabby 上一次保存的完整配置备份。
- `sshNotes.backup`：插件在导入/清空前创建的内部快照，可在设置页恢复。
- 设置页可导出 JSON。
- 数据损坏时插件会在界面显示警告；不会静默覆盖无效数据。

## 6. 发布构建

```powershell
npm run pack
```

生成 `tabby-ssh-notes-0.1.0.tgz`。包内包含：

```text
dist/index.js
dist/index.js.map
package.json
README.md
LICENSE
CHANGELOG.md
docs/*.md
```

安装到 Tabby：

```powershell
$pluginRoot = Join-Path $env:APPDATA 'tabby\plugins'
New-Item -ItemType Directory -Force (Join-Path $pluginRoot 'node_modules') | Out-Null
npm install --prefix $pluginRoot --no-save --legacy-peer-deps .\tabby-ssh-notes-0.1.0.tgz
```

或手动解包 `package/` 到 `%APPDATA%\tabby\plugins\node_modules\tabby-ssh-notes`。

## 7. 测试实例隔离

开发时建议使用独立配置目录，避免影响日常 Tabby 配置：

```powershell
$configDir = Join-Path $env:TEMP 'tabby-ssh-notes-test\AppData\Roaming\tabby'
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = '<Tabby 安装目录>\Tabby.exe'
$psi.Arguments = '--remote-debugging-port=9222'
$psi.UseShellExecute = $false
$psi.EnvironmentVariables['TABBY_CONFIG_DIRECTORY'] = $configDir
$psi.EnvironmentVariables['TABBY_SSH_NOTES_DEBUG'] = '1'
[System.Diagnostics.Process]::Start($psi)
```

`TABBY_SSH_NOTES_DEBUG=1` 会把 `SSHNotesService`、`ConfigService`、`AppService`、`ProfilesService` 暴露为 `window.sshNotesDebug`，仅用于本地调试。不要在生产环境设置该变量。

本地 SSH 测试服务器（仅测试用，依赖 devDependency `ssh2`）：

```powershell
node test/integration/ssh-server.mjs
```

监听 `127.0.0.1:2222`，用户名/密码均为 `test`。测试 Profile 可设置：

```yaml
options:
  host: 127.0.0.1
  port: 2222
  user: test
  auth: password
  password: test
ssh:
  verifyHostKeys: false
```

这只是测试配置；插件本身不读取或保存该密码。

## 8. 代码风格

- 所有用户界面文字为中文。
- 标识符、类型名、文件名使用英文。
- 不引入大型 UI 框架；复用 Bootstrap 类与 Tabby 主题变量。
- 备注内容只通过 Angular 插值渲染。
- 数据层逻辑放在 `validation.ts` / `ssh-notes.service.ts`，便于单元测试。
- 修改标题前比较上一次值，避免重复更新。
