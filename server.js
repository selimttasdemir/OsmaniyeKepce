const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const fs = require('fs');
const app = express();
const PORT = 3000;

// Basit kullanıcı doğrulaması için bilgiler
const ADMIN_USER = 'admin';
const ADMIN_PASS = '1234';

// Mesajları dosyada tut
const MSG_FILE = path.join(__dirname, 'messages.db');
let messages = [];
function loadMessages() {
  if (fs.existsSync(MSG_FILE)) {
    try {
      messages = JSON.parse(fs.readFileSync(MSG_FILE, 'utf8'));
    } catch (e) {
      messages = [];
    }
  }
}
function saveMessages() {
  fs.writeFileSync(MSG_FILE, JSON.stringify(messages, null, 2), 'utf8');
}
loadMessages();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'gizli-anahtar', // üretim ortamı için daha güçlü bir şey kullanın
  resave: false,
  saveUninitialized: false
}));

// Statik dosyaları public klasöründen sun
app.use(express.static(path.join(__dirname, 'public')));

// Giriş sayfası
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Giriş formunu POST ile kontrol et
app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.send('<h3>Hatalı giriş bilgileri. <a href="/admin-login">Tekrar dene</a></h3>');
  }
});

// Admin paneli
app.get('/admin', (req, res) => {
  if (req.session.loggedIn) {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  } else {
    res.redirect('/admin-login');
  }
});

// Çıkış işlemi
app.get('/admin-logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin-login');
});

// API: Kullanıcı mesajı gönderir
app.post('/api/send-message', (req, res) => {
  const { name, email, phone, service, message } = req.body;
  if (!name || !phone || !message) {
    return res.json({ success: false, error: 'Gerekli alanlar eksik.' });
  }
  const newMsg = {
    id: Date.now() + Math.random().toString(36).slice(2),
    name,
    email: email || '',
    phone,
    service: service || 'Belirtilmedi',
    message,
    timestamp: new Date().toISOString(),
    read: false,
    deleted: false
  };
  messages.push(newMsg);
  saveMessages();
  res.json({ success: true });
});

// API: Sadece admin’e mesajları göster
app.get('/api/messages', (req, res) => {
  if (req.session.loggedIn) {
    res.json(messages.filter(m => !m.deleted));
  } else {
    res.status(401).json({ error: 'Yetkisiz erişim' });
  }
});

// Mesajı okundu işaretle
app.post('/api/messages/read', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Yetkisiz' });
  const { id } = req.body;
  const msg = messages.find(m => m.id === id);
  if (msg) {
    msg.read = true;
    saveMessages();
    return res.json({ success: true });
  }
  res.json({ success: false, error: 'Mesaj bulunamadı' });
});

// Mesajı sil
app.post('/api/messages/delete', (req, res) => {
  if (!req.session.loggedIn) return res.status(401).json({ error: 'Yetkisiz' });
  const { id } = req.body;
  const msg = messages.find(m => m.id === id);
  if (msg) {
    msg.deleted = true;
    saveMessages();
    return res.json({ success: true });
  }
  res.json({ success: false, error: 'Mesaj bulunamadı' });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send('Sayfa bulunamadı.');
});

// Sunucuyu başlat
app.listen(PORT, () => {
  console.log(`🌐 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});
