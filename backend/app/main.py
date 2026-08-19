"""Baseline forum API.

The first slice intentionally keeps persistence small and transparent: SQLite from
the standard library plus FastAPI.  It can later be split into SQLAlchemy models,
services and Alembic migrations without changing the HTTP contract.
"""
from datetime import datetime, timezone
import base64
import hashlib
import hmac
import os
import secrets
import sqlite3
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[2]
DB_PATH = Path(os.getenv("BASELINE_DB", ROOT / "baseline.db"))
SECRET = os.getenv("BASELINE_SECRET", "baseline-dev-secret-change-me").encode()

app = FastAPI(title="Baseline API", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST = ROOT / "frontend_dist"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          author_id INTEGER NOT NULL REFERENCES users(id),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          like_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS comments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          author_id INTEGER NOT NULL REFERENCES users(id),
          content TEXT NOT NULL,
          parent_id INTEGER REFERENCES comments(id),
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS post_likes (
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
          PRIMARY KEY (user_id, post_id)
        );
        """
    )
    if conn.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 0:
        password = hash_password("demo1234")
        cur = conn.execute("INSERT INTO users(username,email,password_hash,created_at) VALUES(?,?,?,?)", ("林教练", "demo@baseline.local", password, now()))
        uid = cur.lastrowid
        sample = [
            (uid, "弱侧无球掩护：如何让 5-out 真正跑起来？", "最近在练习 5-out motion，发现弱侧的无球掩护总是变成站桩。整理了几种常见的启动方式和我的训练记录，欢迎大家一起交流。", "战术讨论"),
            (uid, "业余比赛里，怎么限制对方的挡拆持球人？", "我们队平均身高不占优，对手很喜欢高位挡拆。换防会被打错位，挤过又总是漏三分，有没有更适合业余球队的防守策略？", "训练求助"),
            (uid, "实战党分享：三双球鞋的半场对比体验", "分别测试了室内木地板和室外塑胶场，重点聊聊抓地、缓震和对宽脚的友好程度。没有广告，纯个人感受。", "装备分享"),
        ]
        post_ids = []
        for a, t, c, cat in sample:
            cur = conn.execute("INSERT INTO posts(author_id,title,content,category,created_at,updated_at) VALUES(?,?,?,?,?,?)", (a, t, c, cat, now(), now()))
            post_ids.append(cur.lastrowid)
        demo_comments = [
            (post_ids[0], uid, "我们队也在练 5-out，弱侧掩护的时机确实很关键。", None),
            (post_ids[0], uid, "可以先从传球后切入的固定变化开始。", None),
            (post_ids[1], uid, "业余比赛可以试试 ICE，先把持球人赶到底线。", None),
            (post_ids[2], uid, "宽脚的话我更推荐第二双，鞋楦舒服很多。", None),
        ]
        conn.executemany("INSERT INTO comments(post_id,author_id,content,parent_id,created_at) VALUES(?,?,?,?,?)", [(p, a, c, parent, now()) for p, a, c, parent in demo_comments])
    elif conn.execute("SELECT COUNT(*) FROM comments").fetchone()[0] == 0:
        uid = conn.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()[0]
        post_ids = [row[0] for row in conn.execute("SELECT id FROM posts ORDER BY id LIMIT 3").fetchall()]
        demo_comments = [
            (post_ids[0], uid, "我们队也在练 5-out，弱侧掩护的时机确实很关键。"),
            (post_ids[0], uid, "可以先从传球后切入的固定变化开始。"),
            (post_ids[1], uid, "业余比赛可以试试 ICE，先把持球人赶到底线。"),
            (post_ids[2], uid, "宽脚的话我更推荐第二双，鞋楦舒服很多。"),
        ]
        conn.executemany("INSERT INTO comments(post_id,author_id,content,parent_id,created_at) VALUES(?,?,?,?,?)", [(p, a, c, None, now()) for p, a, c in demo_comments])
    conn.commit(); conn.close()


@app.on_event("startup")
def startup():
    init_db()


@app.get("/", include_in_schema=False)
def frontend_index():
    index = FRONTEND_DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"message": "Baseline API is running", "docs": "/docs"}


@app.get("/assets/{asset_path:path}", include_in_schema=False)
def frontend_asset(asset_path: str):
    asset = FRONTEND_DIST / "assets" / asset_path
    if asset.exists() and asset.is_file():
        return FileResponse(asset)
    raise HTTPException(status_code=404, detail="静态资源不存在")


def hash_password(value: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", value.encode(), salt.encode(), 120_000).hex()
    return f"{salt}${digest}"


def verify_password(value: str, stored: str) -> bool:
    salt, digest = stored.split("$", 1)
    check = hashlib.pbkdf2_hmac("sha256", value.encode(), salt.encode(), 120_000).hex()
    return hmac.compare_digest(check, digest)


def token_for(user_id: int) -> str:
    raw = f"{user_id}:{int(datetime.now().timestamp())}".encode()
    sig = hmac.new(SECRET, raw, hashlib.sha256).hexdigest().encode()
    return base64.urlsafe_b64encode(raw + b"." + sig).decode()


def current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="请先登录")
    try:
        decoded = base64.urlsafe_b64decode(authorization[7:].encode())
        raw, sig = decoded.rsplit(b".", 1)
        if not hmac.compare_digest(hmac.new(SECRET, raw, hashlib.sha256).hexdigest().encode(), sig): raise ValueError
        user_id = int(raw.split(b":", 1)[0])
    except Exception as exc:
        raise HTTPException(status_code=401, detail="登录已失效") from exc
    conn = db(); user = conn.execute("SELECT id,username,email,role,created_at FROM users WHERE id=?", (user_id,)).fetchone(); conn.close()
    if not user: raise HTTPException(status_code=401, detail="用户不存在")
    return user


class RegisterIn(BaseModel):
    username: str = Field(min_length=2, max_length=30)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=6, max_length=100)


class LoginIn(BaseModel):
    email: str
    password: str


class PostIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    content: str = Field(min_length=1, max_length=5000)
    category: str = Field(default="战术讨论", max_length=30)


class CommentIn(BaseModel):
    content: str = Field(min_length=1, max_length=1000)
    parent_id: int | None = None


def user_payload(user):
    return {"id": user["id"], "username": user["username"], "email": user["email"], "role": user["role"]}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "baseline-api", "database": str(DB_PATH)}


@app.post("/api/auth/register", status_code=201)
def register(data: RegisterIn):
    conn = db()
    try:
        cur = conn.execute("INSERT INTO users(username,email,password_hash,created_at) VALUES(?,?,?,?)", (data.username.strip(), data.email.lower().strip(), hash_password(data.password), now()))
        conn.commit(); user = conn.execute("SELECT id,username,email,role,created_at FROM users WHERE id=?", (cur.lastrowid,)).fetchone()
    except sqlite3.IntegrityError as exc:
        raise HTTPException(status_code=409, detail="用户名或邮箱已存在") from exc
    finally: conn.close()
    return {"access_token": token_for(user["id"]), "token_type": "bearer", "user": user_payload(user)}


@app.post("/api/auth/login")
def login(data: LoginIn):
    conn = db(); user = conn.execute("SELECT * FROM users WHERE email=?", (data.email.lower().strip(),)).fetchone(); conn.close()
    if not user or not verify_password(data.password, user["password_hash"]): raise HTTPException(status_code=401, detail="邮箱或密码不正确")
    return {"access_token": token_for(user["id"]), "token_type": "bearer", "user": user_payload(user)}


@app.get("/api/auth/me")
def me(authorization: str | None = Header(default=None)):
    return user_payload(current_user(authorization))


@app.get("/api/posts")
def list_posts(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=50), category: str | None = None, keyword: str | None = None):
    conn = db(); where = []; args = []
    if category and category != "全部": where.append("p.category=?"); args.append(category)
    if keyword: where.append("(p.title LIKE ? OR p.content LIKE ?)"); args.extend([f"%{keyword}%", f"%{keyword}%"])
    clause = (" WHERE " + " AND ".join(where)) if where else ""
    total = conn.execute(f"SELECT COUNT(*) FROM posts p{clause}", args).fetchone()[0]
    rows = conn.execute(f"SELECT p.*,u.username,(SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) AS comment_count FROM posts p JOIN users u ON u.id=p.author_id{clause} ORDER BY p.created_at DESC LIMIT ? OFFSET ?", args + [page_size, (page-1)*page_size]).fetchall(); conn.close()
    return {"items": [dict(r) for r in rows], "total": total, "page": page, "page_size": page_size}


@app.post("/api/posts", status_code=201)
def create_post(data: PostIn, authorization: str | None = Header(default=None)):
    user = current_user(authorization); conn = db(); cur = conn.execute("INSERT INTO posts(author_id,title,content,category,created_at,updated_at) VALUES(?,?,?,?,?,?)", (user["id"], data.title.strip(), data.content.strip(), data.category, now(), now())); conn.commit(); row = conn.execute("SELECT p.*,u.username FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=?", (cur.lastrowid,)).fetchone(); conn.close(); return dict(row)


@app.get("/api/posts/{post_id}")
def get_post(post_id: int):
    conn = db(); row = conn.execute("SELECT p.*,u.username FROM posts p JOIN users u ON u.id=p.author_id WHERE p.id=?", (post_id,)).fetchone(); conn.close()
    if not row: raise HTTPException(status_code=404, detail="帖子不存在")
    return dict(row)


@app.get("/api/posts/{post_id}/comments")
def list_comments(post_id: int):
    conn = db(); rows = conn.execute("SELECT c.*,u.username FROM comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=? ORDER BY c.created_at", (post_id,)).fetchall(); conn.close(); return [dict(r) for r in rows]


@app.post("/api/posts/{post_id}/comments", status_code=201)
def create_comment(post_id: int, data: CommentIn, authorization: str | None = Header(default=None)):
    user = current_user(authorization); conn = db()
    if not conn.execute("SELECT id FROM posts WHERE id=?", (post_id,)).fetchone(): conn.close(); raise HTTPException(status_code=404, detail="帖子不存在")
    cur = conn.execute("INSERT INTO comments(post_id,author_id,content,parent_id,created_at) VALUES(?,?,?,?,?)", (post_id,user["id"],data.content.strip(),data.parent_id,now())); conn.commit(); row = conn.execute("SELECT c.*,u.username FROM comments c JOIN users u ON u.id=c.author_id WHERE c.id=?", (cur.lastrowid,)).fetchone(); conn.close(); return dict(row)
