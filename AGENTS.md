# AGENTS.md

给在本仓库工作的 AI 编码代理（Codex 等）的约定。

## 本地调试

- 只用 **8000 端口**的本地服务：`./service.sh start`（已在运行就直接用）。不要另起其他端口的服务。
- 这是 Python 静态服务，不发送禁止缓存的响应头。改完文件后浏览器必须**强制刷新**才能拿到新版本。

## 改 JS / CSS 之后

- 运行 `node scripts/sync_version.js`，更新 `index.html` 里的资源版本号。
- 提交前必须通过：`node scripts/sync_version.js --check` 和 `node scripts/validate_atlas.js`。

## 专项任务手册

- 新增「战役推演」（双方进军路线与分阶段交战过程）：按 [docs/campaign-playback.md](docs/campaign-playback.md) 操作。
