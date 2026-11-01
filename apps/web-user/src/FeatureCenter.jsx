import React, { useEffect, useState } from "react";
import { api } from "./services/api.js";

const money = (v) => new Intl.NumberFormat("vi-VN").format(Number(v || 0)) + " ₫";
const MODULE_NAMES = { mini_game_live:"Mini Game Live", app_tool:"Thuê Tool", buy_code:"Mua Code", otp_proxy:"OTP & Proxy" };

export default function FeatureCenter({ module, initData, onClose, onChanged }) {
  const [catalog,setCatalog] = useState([]);
  const [vip,setVip] = useState(null);
  const [referral,setReferral] = useState(null);
  const [wallet,setWallet] = useState(null);
  const [tickets,setTickets] = useState([]);
  const [profile,setProfile] = useState(null);
  const [activity,setActivity] = useState([]);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [amount,setAmount] = useState("50000");
  const [giftcode,setGiftcode] = useState("");
  const [refCode,setRefCode] = useState("");
  const [subject,setSubject] = useState("");
  const [message,setMessage] = useState("");

  async function load() {
    setError("");
    try {
      if (["mini_game_live","app_tool","buy_code","otp_proxy"].includes(module)) {
        const result = await api("/api/v1/catalog?module="+encodeURIComponent(module),{},initData);
        setCatalog(result.items || []);
      } else if (module === "vip") setVip(await api("/api/v1/vip",{},initData));
      else if (module === "referral") setReferral(await api("/api/v1/referral",{},initData));
      else if (module === "wallet") setWallet(await api("/api/v1/wallet",{},initData));
      else if (module === "support") { const [result,me,history]=await Promise.all([api("/api/v1/support/tickets",{},initData),api("/api/v1/me",{},initData),api("/api/v1/activity",{},initData)]); setTickets(result.tickets || []); setProfile(me.user || null); setActivity(history.activity || []); }
    } catch(e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [module,initData]);

  async function run(action) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); }
    catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  function key() { return crypto.randomUUID(); }

  async function order(item) {
    await run(async () => {
      const result = await api("/api/v1/orders",{method:"POST",headers:{"Idempotency-Key":key()},body:JSON.stringify({
        module, title:item.title, description:[item.description, item.duration_days ? "Thời hạn: "+item.duration_days+" ngày" : ""].filter(Boolean).join("\n"), quantity:1
      })},initData);
      setNotice("Đã tạo đơn "+result.order.orderNumber+". Đơn đang chờ xác nhận và báo giá cuối cùng; hệ thống chưa trừ tiền.");
      onChanged?.();
    });
  }

  return <section className="request-panel feature-center">
    <div className="section-title"><div><span className="eyebrow">HENDY MEMBER SERVICES</span><h2>{MODULE_NAMES[module] || ({wallet:"Ví điện tử",vip:"Thành viên VIP",support:"Trung tâm khách hàng",referral:"Giới thiệu REF",giftcode:"Giftcode"}[module])}</h2></div><button className="close-button" onClick={onClose}>×</button></div>
    {error && <div className="notice error">{error}</div>}
    {notice && <div className="notice success">{notice}</div>}

    {["mini_game_live","app_tool","buy_code","otp_proxy"].includes(module) && <>
      <p className="helper-copy">Chọn sản phẩm/dịch vụ để tạo yêu cầu. Giá hiển thị là giá tham khảo danh mục; nhân viên xác nhận báo giá trước khi thu tiền.</p>
      {module === "mini_game_live" && <button className="text-button" onClick={()=>{onClose();document.querySelector('[aria-label="Điều hướng"] button:nth-child(3)')?.click();}}>Quản lý tài khoản liên kết →</button>}
      {catalog.length ? <div className="feature-catalog">{catalog.map(item=><article className="feature-product" key={item.id}>
        <div><b>{item.title}</b><p>{item.description || "Dịch vụ Hendy"}</p><small>{item.duration_days ? "Thời hạn "+item.duration_days+" ngày · " : ""}{item.stock === null ? "Theo yêu cầu" : "Còn "+item.stock}</small></div>
        <div className="feature-product-action"><strong>{item.unit_price === null ? "Liên hệ" : money(item.unit_price)}</strong><button disabled={busy || item.stock === 0} onClick={()=>order(item)}>Tạo đơn</button></div>
      </article>)}</div> : <div className="empty-panel">Chưa có sản phẩm đang mở bán. Vui lòng liên hệ Admin để cấu hình danh mục.</div>}
    </>}

    {module === "wallet" && <><p className="helper-copy">Số dư chỉ tăng sau khi Admin xác minh giao dịch thực nhận. Tạo yêu cầu nạp không tự động cộng tiền.</p>
      <div className="wallet-balance"><small>SỐ DƯ KHẢ DỤNG</small><strong>{money(wallet?.balance)}</strong></div>
      <form className="request-form" onSubmit={e=>{e.preventDefault();run(async()=>{const r=await api("/api/v1/wallet/topups",{method:"POST",headers:{"Idempotency-Key":key()},body:JSON.stringify({amount:Number(amount)})},initData);setNotice("Tạo yêu cầu thành công. Nội dung chuyển khoản: "+r.topup.payment_reference);await load();});}}>
        <label>Số tiền nạp (10.000–50.000.000 VND)<input type="number" min="10000" max="50000000" step="1000" value={amount} onChange={e=>setAmount(e.target.value)} required /></label><div className="form-footer"><button disabled={busy}>Tạo yêu cầu nạp</button></div>
      </form>
      <h3>Lịch sử yêu cầu nạp</h3>{(wallet?.topups || []).map(t=><div className="feature-history" key={t.id}><b>{money(t.amount)} · {t.status}</b><span>{t.payment_reference} · {t.created_at}</span></div>)}
      <h3>Lịch sử số dư</h3>{(wallet?.entries || []).map(t=><div className="feature-history" key={t.id}><b>{t.entry_type} · +{money(t.amount)}</b><span>{t.description} · Số dư {money(t.balance_after)}</span></div>)}
    </>}

    {module === "vip" && <>{vip && <><div className="wallet-balance"><small>HẠNG HIỆN TẠI</small><strong>{vip.currentTier?.name}</strong><span>{vip.points} điểm</span></div><div className="feature-catalog">{vip.tiers?.map(t=><article className="feature-product" key={t.code}><div><b>{t.name}</b><p>{(t.benefits || []).join(" · ") || "Quyền lợi thành viên"}</p><small>Từ {t.minPoints} điểm</small></div></article>)}</div></>}</>}

    {module === "referral" && <>{referral && <><div className="wallet-balance"><small>MÃ GIỚI THIỆU CỦA BẠN</small><strong>{referral.code}</strong><span>{referral.invited} lượt giới thiệu · Hoa hồng: chờ đối soát</span><button onClick={()=>navigator.clipboard?.writeText(referral.inviteUrl)}>Sao chép liên kết mời</button></div><form className="request-form" onSubmit={e=>{e.preventDefault();run(async()=>{await api("/api/v1/referral/claim",{method:"POST",body:JSON.stringify({code:refCode})},initData);setNotice("Đã ghi nhận mã giới thiệu.");await load();});}}><label>Nhập mã giới thiệu<input value={refCode} onChange={e=>setRefCode(e.target.value)} maxLength={32}/></label><button disabled={busy}>Áp dụng</button></form><p className="footnote">{referral.commissionNote}</p></>}</>}

    {module === "giftcode" && <form className="request-form" onSubmit={e=>{e.preventDefault();run(async()=>{const r=await api("/api/v1/giftcodes/redeem",{method:"POST",headers:{"Idempotency-Key":key()},body:JSON.stringify({code:giftcode})},initData);setNotice("Đổi mã thành công. Voucher nhận được: "+r.rewardVoucher);setGiftcode("");onChanged?.();});}}><label>Mã Giftcode<input value={giftcode} onChange={e=>setGiftcode(e.target.value.toUpperCase())} maxLength={40} placeholder="HENDY-XXXX-XXXX-XXXX" required/></label><button disabled={busy}>Đổi Giftcode</button><p className="footnote">Mỗi tài khoản chỉ đổi một lần cho mỗi mã. Mã hết hạn hoặc hết lượt sẽ bị từ chối.</p></form>}

    {module === "support" && <><form className="request-form" onSubmit={e=>{e.preventDefault();run(async()=>{await api("/api/v1/support/tickets",{method:"POST",headers:{"Idempotency-Key":key()},body:JSON.stringify({category:"general",subject,message})},initData);setNotice("Đã gửi yêu cầu hỗ trợ.");setSubject("");setMessage("");const r=await api("/api/v1/support/tickets",{},initData);setTickets(r.tickets||[]);});}}><label>Tiêu đề<input value={subject} onChange={e=>setSubject(e.target.value)} minLength={4} maxLength={120} required/></label><label className="full">Nội dung<textarea value={message} onChange={e=>setMessage(e.target.value)} minLength={5} maxLength={3000} required/></label><button disabled={busy}>Gửi hỗ trợ</button></form><h3>Hồ sơ thành viên</h3>{profile && <div className="feature-history"><b>{profile.name || "Thành viên"} · Telegram {profile.id}</b><span>Số dư: {money(profile.balance)} · Voucher: {profile.voucher || 0}</span></div>}<h3>Lịch sử hỗ trợ</h3>{tickets.map(t=><div className="feature-history" key={t.id}><b>{t.ticket_number} · {t.subject}</b><span>{t.status} · {t.updated_at}</span></div>)}<h3>Lịch sử hoạt động</h3>{activity.map(item=><div className="feature-history" key={item.category+item.id}><b>{item.category} · {item.description}</b><span>{item.status} · {item.created_at}</span></div>)}</>}
  </section>;
}
