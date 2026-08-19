# Baseline · 篮球战术社区

第一期雏形，包含 React + Vite 论坛前端和 FastAPI 后端骨架。

## 启动前端

```bash
npm install
npm run dev
```

前端当前使用本地 mock 数据，已跑通帖子筛选、搜索、详情、收藏、点赞、评论输入和发帖弹窗。后续将把 `src/api` 接口层接到 FastAPI。

## 启动后端

```bash
cd backend
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
