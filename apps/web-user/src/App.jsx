import React, { useEffect, useMemo, useState } from "react";
import { api, releaseDownloadUrl } from "./services/api.js";

const BRANDS = ["QQ88", "78WIN", "SC88", "C168", "CM88", "F8BET"];

export default function App() {
  const telegram = useMemo(() => window.Telegram?.WebApp || null, []);
  const initData = telegram?.initData || "";
  const [profile, setProfile] = useState(null);
  const [links, setLinks] = useState({});
  const [releases, setReleases] = useState([]);
  const [brand, setBrand] = useState(BRANDS[0]);
  const [accountLabel, setAccountLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    telegram?.ready();
    telegram?.expand();
    Promise.all([
      api("/api/v1/me", {}, initData),
      api("/api/v1/links", {}, initData),
      api("/api/v1/releases")
    ]).then(([me, accountData, releaseData]) => {
      setProfile(me.user);
      setLinks(accountData.links || {});
      setReleases(releaseData.releases || []);
    }).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [initData, telegram]);

  async function addLink(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!initData) {
      setError("Hãy mở Mini App từ Telegram để xác thực tài khoản.");
      return;
    }
    setSaving(true);
    try {
      const result = await api("/api/v1/links", {
        method: "POST",
        body: JSON.stringify({ brand, accountLabel })
      }, initData);
      setLinks(result.links || {});
      setAccountLabel("");
      setNotice("Đã lưu mã tài khoản. Hệ thống không yêu cầu hoặc lưu mật khẩu.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeLink(targetBrand, index) {
    if (!initData) return;
    setError("");
    try {
      const result = await api("/api/v1/links/" + encodeURIComponent(targetBrand) + "/" + index, { method: "DELETE" }, initData);
      setLinks(result.links || {});
      setNotice("Đã xóa liên kết.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <div className="brand-mark">H</div>
        <div><strong>HENDY BOT</strong><span>USER CENTER</span></div>
        <div className="online-pill"><i /> Cloud online</div>
      </header>

      <section className="hero">
        <div className="eyebrow">HENDY CYBERTECH · CLOUDFLARE</div>
        <h1>Trung tâm<br /><em>tài khoản</em></h1>
        <p>Quản lý mã tài khoản đã liên kết và tải các bản phát hành chính thức.</p>
        <div className="hero-meta">
          <span>{profile ? "Xin chào, " + (profile.name || "bạn") : "Telegram Mini App"}</span>
          <span>•</span><span>Dữ liệu đồng bộ D1</span>
        </div>
      </section>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert success">{notice}</div>}
      {loading ? <div className="panel loading">Đang tải dữ liệu…</div> : <>
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">01 / ACCOUNT</span><h2>Liên kết tài khoản</h2></div><span className="count">{Object.values(links).reduce((n, list) => n + (list?.length || 0), 0)} liên kết</span></div>
          <p className="muted">Chỉ nhập tên hoặc mã tài khoản. Không nhập mật khẩu, mã OTP hay thông tin đăng nhập.</p>
          <form className="link-form" onSubmit={addLink}>
            <label>Sảnh / nền tảng
              <select value={brand} onChange={(e) => setBrand(e.target.value)}>
                {BRANDS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Mã tài khoản
              <input value={accountLabel} onChange={(e) => setAccountLabel(e.target.value)} maxLength={40} placeholder="Nhập tên hoặc mã tài khoản" required />
            </label>
            <button disabled={saving}>{saving ? "Đang lưu…" : "＋ Lưu liên kết"}</button>
          </form>
          <div className="account-grid">
            {BRANDS.map((item) => <article className="account-card" key={item}>
              <div className="account-title"><strong>{item}</strong><span>{links[item]?.length || 0}</span></div>
              {(links[item] || []).length === 0 ? <p className="empty">Chưa có tài khoản</p> : links[item].map((account, index) => <div className="account-row" key={item + account.tk + index}>
                <span>{account.tk}</span><button className="icon-button" aria-label="Xóa liên kết" onClick={() => removeLink(item, index)}>×</button>
              </div>)}
            </article>)}
          </div>
        </section>

        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">02 / RELEASES</span><h2>Ứng dụng & bản phát hành</h2></div><span className="count">{releases.length} bản</span></div>
          <div className="release-list">
            {releases.length === 0 ? <p className="empty">Chưa có bản phát hành được công bố.</p> : releases.map((release) => <article className="release-row" key={release.id}>
              <div className="release-icon">↓</div>
              <div className="release-info"><strong>{release.platform} · v{release.version}</strong><span>{release.file_name || "Tệp phát hành"} · {release.release_notes || "Bản phát hành chính thức"}</span></div>
              <a className="download-link" href={releaseDownloadUrl(release.id)}>Tải về</a>
            </article>)}
          </div>
        </section>
      </>}
      <footer>HENDY BOT · Cloudflare Workers / Pages / D1 / R2</footer>
    </main>
  );
}