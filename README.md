# UI Restore Skills

本仓库用于管理 UI 设计还原与走查相关 Skill。

## 内容说明

本次上传包含两类 Skill 包：

1. `skills/`：从 `ui-restore-full-skill.zip` 解压得到的完整源码目录，适合直接在 Git 上维护、阅读和迭代。
2. `packages/individual-skill-zips/`：从 `ui-restore-individual-skill.zip` 解出的 10 个独立 Skill 压缩包，适合按工具/开发类型单独分发。
3. `packages/original-uploaded-archives/`：保留本次上传的两个原始压缩包，便于追溯。

## Skill 列表

- `ui-restore-designer-audit-skill`：设计师 UI 走查 Skill
- `ui-restore-cursor-skill`：Cursor 场景 Skill
- `ui-restore-vscode-codex-skill`：VS Code / Codex 场景 Skill
- `ui-restore-claude-code-skill`：Claude Code 场景 Skill
- `ui-restore-terminal-skill`：Terminal 场景 Skill
- `ui-restore-h5-web-skill`：H5 / Web 开发 Skill
- `ui-restore-mini-program-skill`：小程序开发 Skill
- `ui-restore-native-ios-skill`：Native iOS 开发 Skill
- `ui-restore-native-android-skill`：Native Android 开发 Skill
- `ui-restore-rn-flutter-skill`：RN / Flutter 开发 Skill

## 维护原则

1. 每个独立 Skill 都必须完整内置 `checklists/restore-audit.md`。
2. `checklists/addendum.md` 只能做专项补充，不能替代原始走查要求。
3. 修改 Skill 时，不得删减原始 UI 走查要求。
4. 新增工具/开发专项规则时，优先新增独立 Skill 或补充 `addendum.md`。
5. `original/` 目录用于保留原始内容快照，便于对比和回滚。

## 建议使用方式

- 团队协作和持续迭代：优先使用 `skills/` 目录。
- 单独发给某个开发或设计师：使用 `packages/individual-skill-zips/` 中对应的压缩包。
- 做版本比对或归档：参考 `packages/original-uploaded-archives/`。
