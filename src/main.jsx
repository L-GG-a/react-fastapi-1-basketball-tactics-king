import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ArrowUpRight, Bell, Bookmark, ChevronDown, ChevronLeft, Clock3, Compass,
  Heart, Home, LogIn, MessageCircle, MoreHorizontal, Plus, Search, Send,
  ShieldCheck, Sparkles, Trophy, UserRound, X
} from 'lucide-react'
import './styles.css'

const categories = ['全部', '战术讨论', '训练求助', '装备分享']
const seedPosts = [
  { id: 1, category: '战术讨论', title: '弱侧无球掩护：如何让 5-out 真正跑起来？', excerpt: '最近在练习 5-out motion，发现弱侧的无球掩护总是变成站桩。整理了几种常见的启动方式和我的训练记录，欢迎大家一起交流。', author: '林教练', role: '青训教练', time: '12 分钟前', likes: 128, comments: 24, saved: false, hot: true, avatar: '林', accent: '#e2a458' },
  { id: 2, category: '训练求助', title: '业余比赛里，怎么限制对方的挡拆持球人？', excerpt: '我们队平均身高不占优，对手很喜欢高位挡拆。换防会被打错位，挤过又总是漏三分，有没有更适合业余球队的防守策略？', author: 'Ming 23', role: '业余联赛', time: '1 小时前', likes: 76, comments: 18, saved: true, hot: true, avatar: 'M', accent: '#7a9f9a' },
  { id: 3, category: '装备分享', title: '实战党分享：三双球鞋的半场对比体验', excerpt: '分别测试了室内木地板和室外塑胶场，重点聊聊抓地、缓震和对宽脚的友好程度。没有广告，纯个人感受。', author: '南风', role: '球鞋爱好者', time: '昨天', likes: 54, comments: 11, saved: false, hot: false, avatar: '南', accent: '#c97861' },
  { id: 4, category: '战术讨论', title: '从 Horns 到 Spain PnR：一套简单的进攻变化', excerpt: '把常见的 Horns 起手和 Spain 挡拆串联起来，适合 4-5 人固定训练。附上我画的半场路线图。', author: 'Coach K', role: '战术笔记', time: '2 天前', likes: 39, comments: 8, saved: false, hot: false, avatar: 'K', accent: '#8f87b4' },
]
const API = import.meta.env.DEV ? 'http://localhost:8000/api' : '/api'

function App() {
  const [activeTab, setActiveTab] = useState('forum')
  const [category, setCategory] = useState('全部')
  const [query, setQuery] = useState('')
  const [posts, setPosts] = useState(seedPosts)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showComposer, setShowComposer] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [toast, setToast] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch(`${API}/posts?page=1&page_size=20`).then((res) => res.ok ? res.json() : null).then((data) => {
      if (data?.items?.length) setPosts(data.items.map((item) => ({ ...item, excerpt: item.content, author: item.username, role: '社区球友', time: '刚刚', likes: item.like_count || 0, comments: item.comment_count || 0, saved: false, hot: false, avatar: item.username?.slice(0, 1) || 'B', accent: '#d48e52' })))
    }).catch(() => {})
  }, [])

  const visiblePosts = useMemo(() => posts.filter((post) => {
    const matchCategory = category === '全部' || post.category === category
    const matchQuery = !query || `${post.title}${post.excerpt}${post.author}`.toLowerCase().includes(query.toLowerCase())
    return matchCategory && matchQuery
  }), [posts, category, query])

  function toggleLike(id) {
    setPosts((items) => items.map((post) => post.id === id ? { ...post, liked: !post.liked, likes: post.likes + (post.liked ? -1 : 1) } : post))
  }

  function toggleSave(id) {
    setPosts((items) => items.map((post) => post.id === id ? { ...post, saved: !post.saved } : post))
    setToast('已更新收藏')
    setTimeout(() => setToast(''), 1600)
  }

  const updateCommentCount = useCallback((id, count) => {
    setPosts((items) => items.map((post) => post.id === id ? { ...post, comments: count } : post))
  }, [])

  async function createPost(data) {
    const token = localStorage.getItem('baseline_token')
    if (token) {
      try {
        const response = await fetch(`${API}/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ title: data.title, content: data.excerpt, category: data.category }) })
        if (response.ok) { const item = await response.json(); data = { ...data, author: item.username, role: '社区球友' } }
      } catch (_) {}
    }
    const post = { ...data, id: Date.now(), author: user?.name || '篮球新人', role: '刚刚加入', time: '刚刚', likes: 0, comments: 0, saved: false, hot: false, avatar: (user?.name || '篮').slice(0, 1), accent: '#d48e52' }
    setPosts((items) => [post, ...items])
    setShowComposer(false)
    setToast('帖子已发布')
    setTimeout(() => setToast(''), 1600)
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="topbar-inner">
        <button className="brand" onClick={() => { setActiveTab('forum'); setSelectedPost(null) }}><span className="brand-mark">B</span><span>BASELINE</span></button>
        <nav className="main-nav">
          <button className={activeTab === 'forum' ? 'active' : ''} onClick={() => { setActiveTab('forum'); setSelectedPost(null) }}><Compass size={16} />论坛</button>
          <button onClick={() => setToast('战术库即将上线')}><Trophy size={16} />战术库 <span className="soon">SOON</span></button>
          <button onClick={() => setToast('训练营即将上线')}><Sparkles size={16} />训练营 <span className="soon">SOON</span></button>
        </nav>
        <div className="top-actions"><button className="icon-btn" aria-label="通知"><Bell size={18} /></button>{user ? <button className="user-chip" onClick={() => setUser(null)}><span className="mini-avatar">{user.name[0]}</span>{user.name}<ChevronDown size={14} /></button> : <button className="login-btn" onClick={() => setShowAuth(true)}><LogIn size={16} />登录</button>}</div>
      </div>
    </header>

    <main className="page-wrap">
      {selectedPost ? <PostDetailFixed post={selectedPost} onBack={() => setSelectedPost(null)} onLike={() => toggleLike(selectedPost.id)} onSave={() => toggleSave(selectedPost.id)} onCommentCountChange={updateCommentCount} user={user} /> : <>
        <section className="hero"><div><p className="eyebrow">THE COURT IS YOURS</p><h1>聊战术，<em>练真功。</em></h1><p className="hero-copy">和一群认真打球的人，分享你的比赛、训练与思考。</p></div><div className="hero-art"><div className="hoop"></div><div className="ball">◒</div><div className="art-line"></div></div></section>
        <section className="toolbar"><div className="tabs">{categories.map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="toolbar-right"><div className="search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索帖子、战术或球友" /></div><button className="compose-btn" onClick={() => setShowComposer(true)}><Plus size={17} />发起讨论</button></div></section>
        <div className="feed-layout"><section className="feed"><div className="feed-heading"><div><h2>最新讨论</h2><span>{visiblePosts.length} 个帖子</span></div><button className="sort-btn">最新发布 <ChevronDown size={15} /></button></div>{visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} onOpen={() => setSelectedPost(post)} onLike={() => toggleLike(post.id)} onSave={() => toggleSave(post.id)} />) : <div className="empty"><Search size={30} /><p>没有找到匹配的讨论</p><button onClick={() => { setQuery(''); setCategory('全部') }}>清除筛选</button></div>}</section><aside className="sidebar"><div className="side-card profile-card"><div className="profile-top"><div className="profile-avatar">B</div><div><strong>Baseline 社区</strong><p>认真打球，认真交流</p></div></div><div className="stats"><div><b>2.4k</b><span>球友</span></div><div><b>386</b><span>讨论</span></div><div><b>18</b><span>城市</span></div></div><button className="outline-btn" onClick={() => setToast('欢迎加入 Baseline')}>了解社区 <ArrowUpRight size={15} /></button></div><div className="side-card"><div className="side-title"><h3>本周热门</h3><span>TOP 3</span></div>{posts.filter(p => p.hot).slice(0, 3).map((p, i) => <button className="hot-item" key={p.id} onClick={() => setSelectedPost(p)}><span className="rank">0{i + 1}</span><span><b>{p.title}</b><small>{p.likes} 人赞同 · {p.comments} 条评论</small></span></button>)}</div><div className="side-card guidelines"><div className="side-title"><h3>社区公约</h3><ShieldCheck size={17} /></div><p>尊重每一种打法，分享真实的经验。让每一次讨论，都能帮到场上的某个人。</p><button onClick={() => setToast('感谢你一起维护社区氛围')}>阅读完整公约 <ArrowUpRight size={14} /></button></div></aside></div>
      </>}
    </main>
    {showComposer && <Composer onClose={() => setShowComposer(false)} onSubmit={createPost} />}
    {showAuth && <AuthModal onClose={() => setShowAuth(false)} onLogin={async (payload) => { try { const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (response.ok) { const data = await response.json(); localStorage.setItem('baseline_token', data.access_token); setUser({ name: data.user.username }); } else { setUser({ name: payload.email.split('@')[0] }); } } catch (_) { setUser({ name: payload.email.split('@')[0] }) } setShowAuth(false); setToast('登录成功'); setTimeout(() => setToast(''), 1600) }} />}
    {toast && <div className="toast">{toast}</div>}
    <footer><span>© 2025 BASELINE</span><span>为热爱篮球的人而做</span></footer>
  </div>
}

function PostCard({ post, onOpen, onLike, onSave }) { return <article className="post-card"><div className="post-card-top"><div className="avatar" style={{ background: post.accent }}>{post.avatar}</div><div className="post-meta"><div><b>{post.author}</b><span>{post.role}</span></div><small><Clock3 size={13} />{post.time}</small></div><button className="more"><MoreHorizontal size={18} /></button></div><button className="post-body" onClick={onOpen}><div className="category-label">{post.category}</div><h3>{post.title}</h3><p>{post.excerpt}</p></button><div className="post-actions"><button className={post.liked ? 'liked' : ''} onClick={onLike}><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} />{post.likes}</button><button onClick={onOpen}><MessageCircle size={17} />{post.comments}</button><button className={post.saved ? 'saved' : ''} onClick={onSave}><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} /></button></div></article> }

function PostDetail({ post, onBack, onLike, onSave, user }) { const [comment, setComment] = useState(''); const [comments, setComments] = useState([{ author: 'Zoe', avatar: 'Z', text: '我们队也遇到过类似问题，弱侧掩护的时机确实很关键。', time: '8 分钟前' }, { author: '小陈', avatar: '陈', text: '期待你分享训练视频！', time: '3 分钟前' }]); return <section className="detail"><button className="back-btn" onClick={onBack}><ChevronLeft size={17} />返回论坛</button><article className="detail-card"><div className="post-card-top"><div className="avatar" style={{ background: post.accent }}>{post.avatar}</div><div className="post-meta"><div><b>{post.author}</b><span>{post.role}</span></div><small><Clock3 size={13} />{post.time}</small></div></div><div className="category-label">{post.category}</div><h1>{post.title}</h1><p className="detail-copy">{post.excerpt}</p><div className="detail-actions"><button onClick={onLike} className={post.liked ? 'liked' : ''}><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} />{post.likes} 赞同</button><button onClick={onSave} className={post.saved ? 'saved' : ''}><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} />收藏</button></div></article><section className="comments"><div className="comments-heading"><h2>评论 <span>{comments.length}</span></h2></div>{comments.map((item, i) => <div className="comment" key={i}><div className="comment-avatar">{item.avatar}</div><div><div className="comment-head"><b>{item.author}</b><small>{item.time}</small></div><p>{item.text}</p><button>回复</button></div></div>)}<form className="comment-form" onSubmit={(e) => { e.preventDefault(); if (!comment.trim()) return; setComments([...comments, { author: user?.name || 'Guest', avatar: (user?.name || 'G')[0], text: comment, time: '刚刚' }]); setComment('') }}><input value={comment} onChange={e => setComment(e.target.value)} placeholder={user ? '写下你的看法…' : '登录后参与讨论'} disabled={!user} /><button disabled={!user}><Send size={16} /></button></form></section></section> }

function Composer({ onClose, onSubmit }) { const [title, setTitle] = useState(''); const [excerpt, setExcerpt] = useState(''); const [category, setCategory] = useState('战术讨论'); return <div className="modal-backdrop"><div className="composer"><div className="composer-head"><div><p className="eyebrow">START A THREAD</p><h2>发起一场讨论</h2></div><button onClick={onClose}><X size={19} /></button></div><label>选择分类<select value={category} onChange={e => setCategory(e.target.value)}>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label><label>标题<input value={title} onChange={e => setTitle(e.target.value)} placeholder="一句话说清你的问题或想法" maxLength={60} /></label><label>正文<textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="分享你的经验、困惑或训练记录…" rows={5} maxLength={300} /></label><div className="composer-foot"><span>{excerpt.length}/300</span><button className="compose-btn" disabled={!title.trim() || !excerpt.trim()} onClick={() => onSubmit({ title, excerpt, category })}>发布讨论 <ArrowUpRight size={16} /></button></div></div></div> }

function AuthModal({ onClose, onLogin }) { const [mode, setMode] = useState('login'); const [name, setName] = useState(''); const [email, setEmail] = useState('demo@baseline.local'); const [password, setPassword] = useState('demo1234'); return <div className="modal-backdrop"><div className="composer auth-modal"><div className="composer-head"><div><p className="eyebrow">WELCOME TO BASELINE</p><h2>{mode === 'login' ? '登录社区' : '加入社区'}</h2></div><button onClick={onClose}><X size={19} /></button></div><div className="auth-switch"><button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>登录</button><button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>注册</button></div>{mode === 'register' && <label>昵称<input value={name} onChange={e => setName(e.target.value)} placeholder="你的球场昵称" /></label>}<label>邮箱<input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" type="email" /></label><label>密码<input value={password} onChange={e => setPassword(e.target.value)} placeholder="至少 6 位字符" type="password" /></label><div className="composer-foot"><span className="auth-note">FastAPI + SQLite</span><button className="compose-btn" disabled={!email.trim() || password.length < 6 || (mode === 'register' && !name.trim())} onClick={() => onLogin({ email, password, username: name })}>{mode === 'login' ? '登录' : '创建账号'} <ArrowUpRight size={16} /></button></div></div></div> }

function PostDetailFixed({ post, onBack, onLike, onSave, onCommentCountChange, user }) {
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState(null)
  useEffect(() => {
    let cancelled = false
    fetch(`${API}/posts/${post.id}/comments`)
      .then((res) => res.ok ? res.json() : Promise.reject(new Error('Failed to load comments')))
      .then((items) => {
        if (cancelled) return
        setComments(items.map((item) => ({ id: item.id, author: item.username, avatar: item.username?.slice(0, 1) || 'B', text: item.content, time: '刚刚' })))
        onCommentCountChange(post.id, items.length)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [post.id, onCommentCountChange])
  async function submitComment(event) {
    event.preventDefault()
    if (!comment.trim() || !user) return
    const token = localStorage.getItem('baseline_token')
    try {
      const response = await fetch(`${API}/posts/${post.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ content: comment.trim() }) })
      if (response.ok) {
        const item = await response.json()
        const nextCount = (comments?.length ?? post.comments) + 1
        setComments((items) => [...(items || []), { id: item.id, author: item.username, avatar: item.username?.slice(0, 1) || 'B', text: item.content, time: '刚刚' }])
        onCommentCountChange(post.id, nextCount)
        setComment('')
      }
    } catch (_) {}
  }
  return <section className="detail"><button className="back-btn" onClick={onBack}><ChevronLeft size={17} />返回论坛</button><article className="detail-card"><div className="post-card-top"><div className="avatar" style={{ background: post.accent }}>{post.avatar}</div><div className="post-meta"><div><b>{post.author}</b><span>{post.role}</span></div><small><Clock3 size={13} />{post.time}</small></div></div><div className="category-label">{post.category}</div><h1>{post.title}</h1><p className="detail-copy">{post.excerpt}</p><div className="detail-actions"><button onClick={onLike} className={post.liked ? 'liked' : ''}><Heart size={17} fill={post.liked ? 'currentColor' : 'none'} />{post.likes} 赞同</button><button onClick={onSave} className={post.saved ? 'saved' : ''}><Bookmark size={17} fill={post.saved ? 'currentColor' : 'none'} />收藏</button></div></article><section className="comments"><div className="comments-heading"><h2>评论 <span>{comments?.length ?? post.comments}</span></h2></div>{(comments || []).map((item) => <div className="comment" key={item.id}><div className="comment-avatar">{item.avatar}</div><div><div className="comment-head"><b>{item.author}</b><small>{item.time}</small></div><p>{item.text}</p><button>回复</button></div></div>)}<form className="comment-form" onSubmit={submitComment}><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={user ? '写下你的看法…' : '登录后参与讨论'} disabled={!user} /><button disabled={!user}><Send size={16} /></button></form></section></section>
}

createRoot(document.getElementById('root')).render(<App />)
