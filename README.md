# Tabby Plugins

面向 [Tabby Terminal](https://github.com/Eugeny/tabby) 的插件集合，当前在 Windows 上开发和验证。

## 插件

| 插件 | 版本 | 说明 |
| --- | --- | --- |
| [tabby-ssh-notes](notes/README.md) | 0.1.0 | 为 SSH 连接提供本地备注、环境与标签管理、终端标签标题集成，以及 JSON 导入导出。 |

当前仓库只包含 `tabby-ssh-notes`，后续插件会以独立目录加入。

## 仓库结构

```text
tabby-plugins/
├─ notes/                  # tabby-ssh-notes 插件
│  ├─ src/                 # 插件源码（Angular 15 + TypeScript）
│  ├─ test/                # Jest 单元测试与本地 SSH 测试服务
│  ├─ docs/                # 架构、开发、测试、兼容性文档
│  ├─ scripts/             # Windows 安装 / 卸载 / 诊断脚本
│  └─ README.md            # 插件使用说明
├─ README.md
└─ LICENSE
```

## 快速开始

环境要求：

- Windows 10/11（实际验证 Windows 11）
- Tabby 1.0.238（内置 `tabby-core` / `tabby-ssh` / `tabby-terminal` 为 `1.0.231-nightly.0`，Angular 15）
- Node.js 18+（实际验证 v24.22.1）与 npm

```powershell
cd notes
npm install
npm run build
npm run dev:install
```

完全退出并重新启动 Tabby，然后打开 **Settings → SSH Notes**。详细使用说明见 [notes/README.md](notes/README.md)。

## 开发命令

在 `notes/` 目录下执行：

| 命令 | 说明 |
| --- | --- |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm test` | 运行 Jest 测试 |
| `npm run build` | 生产构建，输出 `dist/index.js` |
| `npm run build:dev` | 开发构建，不压缩 |
| `npm run pack` | 构建并生成 `tabby-ssh-notes-0.1.0.tgz` |
| `npm run dev:install` | 创建开发用目录联接 |
| `npm run dev:uninstall` | 移除开发用目录联接 |
| `npm run doctor` | 运行诊断脚本 |

## 文档

- [SSH Notes 使用说明](notes/README.md)
- [技术可行性](notes/docs/TECHNICAL_FEASIBILITY.md)
- [架构与数据流](notes/docs/ARCHITECTURE.md)
- [开发指南](notes/docs/DEVELOPMENT.md)
- [测试策略与验证结果](notes/docs/TESTING.md)
- [兼容性](notes/docs/COMPATIBILITY.md)
- [变更记录](notes/CHANGELOG.md)

## 许可证

MIT，见 [LICENSE](LICENSE)。
