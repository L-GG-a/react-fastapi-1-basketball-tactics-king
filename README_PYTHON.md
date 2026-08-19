# Baseline Python 项目

这是一个单服务 Python 项目：FastAPI 负责 API、SQLite 负责数据，已经构建好的 React 页面由 FastAPI 直接托管。启动后只需要访问：

`http://127.0.0.1:8000/`

## Windows 启动

双击 `start.bat`。它会创建虚拟环境、安装依赖并启动服务。需要首次联网安装 FastAPI 和 Uvicorn。

## 命令行启动

```bash
python -m venv .venv
.venv\\Scripts\\python.exe -m pip install -r requirements.txt
.venv\\Scripts\\python.exe run.py
```

演示账号：`demo@baseline.local` / `demo1234`

首次启动会自动创建 `baseline.db`，并写入演示用户和帖子。
