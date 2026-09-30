# AGENTS.md — Edtib Console 后台项目 AI 执行规范

> 本文件是所有 AI 编程代理（Copilot、Claude、Cursor、WorkBuddy 等）在本仓库工作时必须遵守的强制执行规范。
> 任何 AI 在修改本仓库代码前，必须阅读本文件并严格遵守全部条款。

---

## 0. 最高优先级：严禁 Git 提交

**任何 AI 在本仓库中严禁执行任何 Git 写操作（提交类变更）。**

禁止的命令（包括但不限于）：

| 禁止操作 | 示例命令 |
|---|---|
| 暂存 | `git add`、`git stage` |
| 提交 | `git commit`、`git commit --amend` |
| 推送 | `git push`、`git push --force` |
| 打标签 | `git tag` |
| 合并/变基 | `git merge`、`git rebase` |
| 回退/重置 | `git reset`、`git revert` |
| 切换/恢复 | `git checkout <branch> / <file>`、`git switch`、`git restore` |
| 暂存栈 | `git stash` |
| 清理 | `git clean`、`git rm` |
| 移动/删除跟踪文件 | `git mv`、`git rm --cached` |

硬性要求：

1. 严禁通过脚本、子进程、Shell 别名、包管理器钩子或任何间接方式规避上述约束。
2. 允许的 Git 只读命令：`git status`、`git diff`、`git log`、`git show`、`git branch`、`git ls-files`、`git ls-tree`。
3. 文件移动 / 重命名请使用系统文件操作（`mv` 等），是否纳入版本控制由项目负责人人工决定。
4. 所有改动完成后，只需汇报改动清单与验证结果，**不要**执行提交，**不要**建议代为提交。
5. Git 提交由项目负责人人工执行，任何 AI 不得代替。
