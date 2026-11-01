import React, { useEffect, useState } from "react";
import { adminApi } from "./services/api.js";

export default function App() {
  const [token, setToken] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState(null);
  const [releases, setReleases] = useState([]);
  const [file, setFile] = useState(null);
  const [platform, setPlatform] = useState("Android");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refresh(currentToken = token) {
    const [summary, published] = await Promise.all([
      adminApi("/api/v1/admin/stats", currentToken),
      adminApi("/api/v1/releases")
    ]);
    setStats(summary.stats);
    setReleases(published.releases || []);
    setAuthorized(true);
  }

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
  }, []);

  async function login(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try { await refresh(token); setNotice("Đã xác thực quản trị."); }
    catch (err) { setAuthorized(false); setError(err.message); }
    finally { setBusy(false); }
  }

  async function publish(event) {
    event.preventDefault();
    if (!file || !version.trim()) {
      setError("Vui lòng chọn tệp và nhập phiên bản.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("platform", platform);
      data.append("version", version.trim());
      data.append("releaseNotes", notes.trim());
      await adminApi("/api/v1/admin/releases", token, { method: "POST", body: data });
      setFile(null);
      setVersion("");
      setNotes("");
      await refresh();
      setNotice("Đã tải tệp lên R2 và tạo bản phát hành.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  async function setupWebhook() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await adminApi("/api/v1/admin/webhook/setup", token, {
        method: "POST",
        headers: { "X-Webhook-Setup-Key": setupKey }
      });
      setNotice(result.message || "Đã gửi yêu cầu đăng ký webhook.");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand"><span>H</span><div><b>HENDY</b><small>CONTROL PLANE</small></div></div>
        <div className="side-label">WORKSPACE</div>
        <div className="nav-item active">▦ <span>Tổng quan</span></div>
        <div className="nav-item">⇧ <span>Phát hành ứng dụng</span></div>
        <div className="nav-item">⌁ <span>Telegram webhook</span></div>
        <div className="side-foot">CLOUDFLARE EDGE<br />Workers · D1 · R2</div>
      </aside>
      <section className="main-area">
        <header className="admin-header"><div><span className="crumb">HENDY / ADMIN</span><h1>Trung tâm quản trị</h1></div><span className="secure">● PRIVATE CONSOLE</span></header>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        {!authorized ? <section className="card login-card">
          <div className="section-kicker">SECURE ACCESS</div><h2>Xác thực quản trị</h2>
          <p>Nhập ADMIN_API_TOKEN đã cấu hình bằng Wrangler Secret. Token chỉ được giữ trong bộ nhớ phiên hiện tại.</p>
          <form onSubmit={login}>
            <label>Admin API token<input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required /></label>
            <button disabled={busy}>{busy ? "Đang xác thực…" : "Mở bảng điều khiển"}</button>
          </form>
        </section> : <>
          <div className="stats-grid">
            <article className="stat-card"><span>NGƯỜI DÙNG</span><strong>{stats?.users ?? "—"}</strong><small>Dữ liệu D1</small></article>
            <article className="stat-card"><span>BẢN PHÁT HÀNH</span><strong>{stats?.releases ?? "—"}</strong><small>Metadata D1</small></article>
            <article className="stat-card"><span>LƯU TRỮ</span><strong>R2</strong><small>Object storage</small></article>
          </div>
          <section className="card">
            <div className="card-heading"><div><div className="section-kicker">RELEASE MANAGEMENT</div><h2>Đăng tải ứng dụng</h2></div><span className="tag">D1 + R2</span></div>
            <form className="upload-form" onSubmit={publish}>
              <label>Nền tảng<select value={platform} onChange={(e) => setPlatform(e.target.value)}><option>Android</option><option>iOS</option><option>Windows</option><option>macOS</option><option>Linux</option><option>Other</option></select></label>
              <label>Phiên bản<input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2.0.0" required /></label>
              <label className="wide">Tệp phát hành<input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required /></label>
              <label className="wide">Ghi chú<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" placeholder="Nội dung cập nhật…" /></label>
              <button disabled={busy}>{busy ? "Đang xử lý…" : "↑ Tải lên & phát hành"}</button>
            </form>
            <p className="hint">Giới hạn API: 100 MB mỗi tệp. Chỉ người quản trị đã xác thực mới được ghi vào R2.</p>
          </section>
          <section className="card">
            <div className="card-heading"><div><div className="section-kicker">BOT OPERATIONS</div><h2>Telegram webhook</h2></div><span className="tag">SECRET HEADER</span></div>
            <label className="key-field">Webhook setup key<input type="password" value={setupKey} onChange={(e) => setSetupKey(e.target.value)} autoComplete="off" placeholder="WEBHOOK_SETUP_KEY" /></label>
            <p className="description">Đăng ký webhook cho Worker bằng WEBHOOK_SECRET_TOKEN đã cài đặt ở Cloudflare.</p>
            <button className="secondary" onClick={setupWebhook} disabled={busy || !setupKey}>↻ Đăng ký / đồng bộ webhook</button>
          </section>
          <section className="card">
            <div className="card-heading"><div><div className="section-kicker">PUBLISHED</div><h2>Bản phát hành hiện có</h2></div><button className="secondary small" onClick={() => refresh()}>Làm mới</button></div>
            {releases.length === 0 ? <p className="hint">Chưa có bản phát hành.</p> : <div className="release-table">{releases.map((item) => <div className="release-line" key={item.id}><b>{item.platform}</b><span>v{item.version}</span><small>{item.file_name}</small><a href={(import.meta.env.VITE_API_BASE_URL || "") + "/api/v1/releases/" + item.id + "/download"} target="_blank" rel="noreferrer">Tải thử ↗</a></div>)}</div>}
          </section>
          <button className="logout" onClick={() => { setAuthorized(false); setToken(""); setSetupKey(""); setStats(null); }}>Đăng xuất khỏi bảng điều khiển</button>
        </>}
        <footer>HENDY BOT ADMIN · Cloudflare Workers / Pages / D1 / R2</footer>
      </section>
    </main>
  );
}