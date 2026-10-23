# Tabby SSH Notes

为 [Tabby Terminal](https://github.com/Eugeny/tabby) 的 SSH 连接提供**本地备注、标签、环境标识和终端标题集成**的 Windows 插件。

> 实际验证环境：**Tabby 1.0.238**（内置 `tabby-core` / `tabby-ssh` / `tabby-terminal` 为 `1.0.231-nightly.0`，Angular 15），Windows 11。
>
> 本项目不修改 Tabby 核心源码、不修改安装目录文件，也不使用 DOM 注入伪装原生界面。

## 功能

- **SSH Notes 管理面板**
  - 搜索连接名称、备注标题、说明、IP、用户名、项目、负责人、标签和 Profile ID。
  - 按环境筛选，按标签筛选（标签列表可再搜索）。
  - 按连接名称、更新时间、环境、项目排序。
  - 一键连接、编辑或添加备注、打开原生 SSH 配置。
  - 可切换“显示无备注连接”，列出全部 SSH Profile。
  - 显示孤立备注（对应 Profile 已删除）并提供删除入口。
  - 支持空状态、加载状态、错误重试和只读提示。
- **备注编辑器**
  - 备注标题、详细说明、环境、项目、负责人、标签、颜色。
  - 自定义终端标题、终端标题开关和实时标题预览。
  - 自动生成创建 / 更新时间。
  - 标签自动去空格、去重，并限制数量与长度。
  - 未保存关闭时提示确认；支持清空备注。
- **终端标签标题**
  - 只影响有备注的 SSH 终端，普通本地终端不受影响。
  - 标题优先级可切换：自定义终端标题优先（默认）或备注标题优先。
  - 环境前缀可关闭；环境为“其他”时不添加前缀。
  - 备注没有标题时，可选择保持 Tabby 原始标题或显示 SSH 连接名称。
  - 标题最大长度和超长截断可配置。
  - 防止服务器 OSC 标题覆盖；备注清空或功能关闭时恢复原始行为。
- **设置页**
  - 常规、显示、数据管理三个区域。
  - 显示真实本地数据路径，并可直接打开所在文件夹。
  - 导出备注 JSON；导入前预览、校验并自动创建快照，支持合并导入和替换导入。
  - 手动创建 / 恢复内部快照、重置设置、二次确认清除全部备注。
  - 数据版本高于当前插件支持的版本时进入只读模式。
- **本地优先**
  - 备注写入 Tabby 配置 `sshNotes` 节点，不上传云端。
  - 不保存 SSH 密码、私钥或访问令牌。
  - 无遥测、无网络请求、不执行备注内容。

## 设置项

设置位于 **Settings → SSH Notes**。

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| 启用 SSH Notes | 开启 | 关闭后不再修改终端标题，但本地面板中的备注数据仍会保留。 |
| 启用连接列表备注 | 开启 | 在 SSH Notes 面板中显示备注副标题；Tabby 原生连接列表没有公开扩展点，因此不会写入原生列表。 |
| 启用终端标签备注 | 开启 | 仅对带有备注的 SSH 终端生效。 |
| 显示环境前缀 | 开启 | 例如 `[生产] API 主节点`；关闭后只显示备注标题。 |
| 默认环境 | 生产 | 新建备注时默认选中的环境。 |
| 空备注时的终端标题 | 保持 Tabby 原始标题 | 备注没有标题时，保持原始标题或显示 SSH 连接名称。 |
| 备注标题优先级 | 自定义终端标题优先 | 当自定义终端标题与备注标题同时存在时使用哪一个，可改为“备注标题优先”。 |
| 在面板中显示标签 | 开启 | 控制管理面板中的标签显示。 |
| 显示环境颜色 | 开启 | 颜色仅作为辅助信息，环境文字始终显示。 |
| 截断过长标题 | 开启 | 避免超长备注标题占满终端标签或列表。 |
| 终端标题最大长度 | 80 | 可设置 20–200 个字符，超出时截断并添加省略号。 |
| 列表标题最大长度 | 48 | 可设置 10–120 个字符，仅影响面板列表的截断显示。 |

## 数据限制

| 字段 / 操作 | 限制 |
| --- | --- |
| 备注标题 | 120 个字符 |
| 详细说明 | 8000 个字符 |
| 项目、负责人 | 各 100 个字符 |
| 自定义终端标题 | 120 个字符 |
| 标签 | 最多 20 个，每个 32 个字符；自动去首尾空格并去重 |
| 颜色 | `#RRGGBB` 格式，留空表示不设置 |
| 导入 JSON 文件 | 2 MB |

## 重要限制（请先阅读）

Tabby 当前稳定版没有提供以下两个原生扩展点：

1. **欢迎页 / 连接选择器的原生连接列表**只由内置 `ProfileTreeComponent` 渲染，没有插件插槽；连接选择器的描述由 `ProfileProvider` 固定提供。
   因此备注显示在**插件自有的 SSH Notes 面板**中，而不是原生连接列表里。
2. **原生 SSH Profile 配置弹窗**通过 `profileProvider.settingsComponent` 创建，没有 `ng-content` 或额外的设置区块扩展机制。
   因此备注编辑器是**插件自有表单**，可从 SSH Notes 面板和 SSH 终端标签右键菜单打开，并提供“打开原生 SSH 配置”按钮。

我们**没有**通过替换内置组件、修改 `app.asar`、注入 DOM 或伪造原生列表来规避这些限制。详细调研见 [docs/TECHNICAL_FEASIBILITY.md](docs/TECHNICAL_FEASIBILITY.md)。

其他已知限制：

- 内置导入的 SSH Profile（例如来自 `~/.ssh/config`）如果导入源重新排序或删除，Tabby 生成的 Profile ID 可能变化，备注会变成孤立备注。
- 用户通过 Tabby 双击标签设置的 `customTitle`（手动重命名）优先级高于插件标题；清除手动标题后插件标题会恢复显示。
- 环境为“其他”时默认不添加环境前缀，仅显示备注标题。
- 备注数据来自更新版本的插件时，当前插件进入只读模式，不能编辑备注或修改设置。
- 本版本只在 Tabby 1.0.238 上完成实际集成验证；其他版本请先查看 [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)。

## 尚未实现或未自动化验证

- **原生连接列表内嵌备注**：受 Tabby 扩展点限制，未实现；使用 SSH Notes 面板替代。
- **原生 SSH 配置弹窗内嵌备注**：受 Tabby 扩展点限制，未实现；使用插件自有编辑器。
- **原生文件选择 / 保存对话框的自动化端到端测试**：服务层导入 / 导出已通过单元测试，系统对话框需要人工点选。
- **多窗口同时编辑备注的竞态压力测试**：未自动化；当前实现包含外部配置变更重载和串行保存队列。
- **Tabby 大版本升级兼容矩阵**：未覆盖；提供诊断脚本和安全模式恢复说明。
- **SSH Profile 删除后自动重建关联**：不实现；删除后备注作为孤立备注保留，可导出或删除。

## 安装

### 发布包安装

先构建并生成 npm 包（`pack` 会自动执行生产构建）：

```powershell
npm install
npm run pack
```

生成 `tabby-ssh-notes-0.1.0.tgz` 后，安装到 Tabby 用户插件目录：

```powershell
$pluginRoot = Join-Path $env:APPDATA 'tabby\plugins'
New-Item -ItemType Directory -Force (Join-Path $pluginRoot 'node_modules') | Out-Null
npm install --prefix $pluginRoot --no-save --legacy-peer-deps .\tabby-ssh-notes-0.1.0.tgz
```

然后完全退出并重新启动 Tabby，打开 **Settings → SSH Notes**。

如果 npm 安装遇到网络 / peer 依赖问题，也可以手动解包：

```powershell
tar -xf .\tabby-ssh-notes-0.1.0.tgz
Copy-Item .\package (Join-Path $env:APPDATA 'tabby\plugins\node_modules\tabby-ssh-notes') -Recurse -Force
```

卸载：

```powershell
Remove-Item (Join-Path $env:APPDATA 'tabby\plugins\node_modules\tabby-ssh-notes') -Recurse -Force
```

卸载**不会**删除 `config.yaml` 中的备注数据。需要彻底删除时，先导出备注，再手动移除 `sshNotes` 节点。

### 开发模式安装

开发时推荐使用目录联接，避免 Tabby 在 Windows 上分割 `TABBY_PLUGINS` 绝对路径的问题：

```powershell
npm install
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-dev.ps1
```

或使用 npm 脚本：

```powershell
npm run dev:install
```

脚本会在：

```text
%APPDATA%\tabby\plugins\node_modules\tabby-ssh-notes
```

创建指向当前项目目录的 Junction。重启 Tabby 即可加载。卸载开发联接：

```powershell
npm run dev:uninstall
```

## 使用

1. 打开 **Settings → SSH Notes**，确认“启用 SSH Notes”和“启用终端标签备注”已开启。
2. 点击工具栏或起始页的 **SSH Notes** 按钮，打开管理面板。
3. 勾选“显示无备注连接”，选择一条 SSH 连接，点击“添加备注”。
4. 填写标题、说明、环境、项目、负责人、标签等并保存。
5. 点击“连接”打开 SSH 终端，标签应显示类似 `[生产] API 主节点` 的标题。
6. 通过环境、标签、搜索框和排序筛选服务器。

编辑已有备注：

- 在管理面板选中连接后点击“编辑备注”。
- 或在 SSH 终端标签上右键 → “编辑此连接的 SSH 备注…”。
- 也可以在终端标签右键菜单中打开 SSH Notes 面板。

## 数据与备份

- 默认位置：`%APPDATA%\tabby\config.yaml` 的 `sshNotes` 节点。
- Tabby 保存配置时会同时写入 `config.yaml.backup`。
- 插件在导入或清除全部备注前，会在 `sshNotes.backup` 中自动创建内部快照；设置页也可以“立即创建快照”。
- 设置页提供“导出备注 JSON”“导入备注 JSON”“恢复此备份”“重置插件设置”“清除全部备注”。
- 导入前会显示有效 / 无效条数和警告；确认后可选择：
  - **合并导入**：按 Profile ID 和更新时间保留较新的备注。
  - **替换全部备注**：用文件内容替换现有全部备注。
- 导入限制 2 MB，会校验 JSON 结构、字段类型、颜色格式、标签数量和重复项。
- 数据版本为 `schemaVersion: 1`；插件升级时保留向后兼容迁移。数据版本更高时进入只读模式。

## 开发与验证

```powershell
npm install
npm run typecheck
npm test
npm run build
npm run pack
```

查看诊断信息：

```powershell
npm run doctor
```

如果 Tabby 不在默认安装位置：

```powershell
npm run doctor -- -TabbyExe "<Tabby 安装目录>\Tabby.exe"
```

日志位置：`%APPDATA%\tabby\log.txt`。启动 `Tabby.exe --debug` 可打开 DevTools。

自动化测试覆盖数据层、标签规则、标题规则、导入校验和表单 / 面板核心逻辑。实际 Tabby 集成测试结果见 [docs/TESTING.md](docs/TESTING.md)。

## 安全说明

- 不读取、不保存 SSH 密码、私钥或访问令牌。
- 不发起网络请求，不增加遥测。
- 备注内容仅作为文本渲染，不执行、不拼接 Shell 命令。
- JSON 导入只写入 `sshNotes`，不会覆盖 SSH Profile 或凭据。
- 写入失败时保留内存数据并在界面显示错误，不静默丢弃。
- 不需要关闭 Windows Defender，不需要修改 PowerShell 执行策略（开发脚本使用 `-ExecutionPolicy Bypass` 仅作用于单次脚本进程）。

## 文档

- [技术可行性](docs/TECHNICAL_FEASIBILITY.md)
- [架构与数据流](docs/ARCHITECTURE.md)
- [开发指南](docs/DEVELOPMENT.md)
- [测试策略与验证结果](docs/TESTING.md)
- [兼容性](docs/COMPATIBILITY.md)
- [变更记录](CHANGELOG.md)

## 许可证

MIT，见 [LICENSE](LICENSE)。
