# 参与开发

感谢你对《尘途问仙》的兴趣。本文说明本仓库的开发约定。

## 分支

**请不要直接在 `main` 上提交。** `main` 是集成分支，只接受经由短命分支合入的改动。

新改动请开短命分支：

    feat/<简短描述>    新功能
    fix/<简短描述>     缺陷修复
    docs/<简短描述>    文档
    test/<简短描述>    测试
    chore/<简短描述>   构建、依赖、杂项

克隆本仓库后只有 `origin`。若尚未添加过上游仓库，先添加一次：

    git remote add upstream https://github.com/hickercf/dust-path.git

之后每次开始前，同步上游并把本地提交重放到上游最新提交之上：

    git fetch upstream
    git rebase upstream/main

冲突请手工解决，不要用 `git rebase --skip` 或 `--force` 掩盖。rebase 会改写 `main` 的提交 SHA，推送到 fork 自己的 `origin` 时用 `git push --force-with-lease origin main`——只对 `origin` 使用，**绝不要对 `upstream` 使用**。

## 提交信息

格式为 `<类型>: <中文描述>`，类型取 `feat` `fix` `docs` `test` `refactor` `chore` `perf`。

    feat: 新增归影阁密匣绕行解法
    fix: 降低小地图每帧重绘开销

正文说明改动的**原因**，而非复述改动内容。一次提交只做一件事，不要把格式化与逻辑改动混在一起。

## 署名

提交署名须为真人贡献者身份。请勿在提交信息、代码注释或文档中加入 AI 工具署名或生成标记。

## 测试

提交前请确保以下两条命令均通过：

    npm test
    npm run build

（Windows PowerShell 下等价写法为 `npm.cmd test`。）

各类改动对应的测试要求：

- 改动 `src/state.js` 或 `src/content.js` 的逻辑：在 `tests/state.test.js` 增改用例。
- 改动地图、碰撞或可达性：`tests/navigation.test.js` 会构造真实 `World` 并逐帧走完路径，请确保新地点仍可达。
- 改动按键处理：在 `tests/controls.test.js` 增改用例。
- 新增或修改剧情内容编号：同步更新 `游戏剧情与发展路线.md` 与 `src/content.js`。

## 工作记录

较大的改动建议留一份工作记录，放在 `docs/records/` 下，命名 `YYYY-MM-DD-<主题>.md`。适合留记录的场合：新功能、会改变他人工作方式的调整、跨天排查的问题。

记录要回答的是「几个月后回看，我需要知道什么」，建议包含：

- **背景**：为什么做这件事，起点是什么状态。
- **关键决策**：选了什么、放弃了什么、各自的代价是什么。这一项最有价值——代码只记录结果，不记录取舍过程。
- **验证方式**：跑了哪些命令、结果如何、哪些环节**没能**验证。
- **遗留问题**：已经知道但本次不处理的。

工作记录不是提交日志的复述：提交信息说明改了什么，记录说明为什么这么改、当时怎么权衡的。

`docs/records/` 只作本地留档，不随仓库分发——它属于个人过程材料，不是项目文档。

## 内容与剧情

`游戏剧情与发展路线.md` 是剧情与版本方向的唯一记录。新增剧情时先确定触发条件、可选行为和实际后果，再标记「已实装」或「计划中」——不要把计划中的内容写成当前可玩的功能。

## 向上游贡献

通用性改动（缺陷修复、性能、可访问性、构建）欢迎一并提交给上游 `hickercf/dust-path`。

请从 `upstream/main` 另开分支，再把该主题的提交摘过来，这样 PR 只包含这一个主题：

    git fetch upstream
    git switch -c upstream/<简短描述> upstream/main
    git cherry-pick <主题提交的 SHA>

不要直接拿 fork 的 `main` 去提 PR——那会把 `main` 上所有本地改动一起带上，评审者无法只看这一个改动。

上游仓库没有任何 GitHub Actions 工作流，因此**向上游提的 PR 不会自动跑测试**。请务必在本地先跑通 `npm test` 与 `npm run build`。

注意：上游目前未声明许可证，请勿向上游或本仓库添加 `LICENSE` 文件，详见下文。

## 许可证状态

上游仓库 `hickercf/dust-path` 未声明任何许可证，按默认规则保留所有权利。本仓库是其衍生 fork，同样不对继承代码重新授权。因此：

- 不要向本仓库添加 `LICENSE` 文件。
- 你的贡献默认遵循上游的授权安排。
