const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const fs = require('fs');
const app = express();
const PORT = 3000;

// Basit kullanıcı doğrulaması için bilgiler
const bcrypt = require('bcryptjs');
const ADMIN_DB_FILE = path.join(__dirname, 'admin.db');
function getAdminInfo() {
  if (fs.existsSync(ADMIN_DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(ADMIN_DB_FILE, 'utf8'));
      return { username: data.username, hash: data.hash };
    } catch (e) {}
  }
  // Varsayılan admin ekle
  const defaultAdmin = {
    username: 'admin',
    hash: bcrypt.hashSync('1234', 10)
  };
  fs.writeFileSync(ADMIN_DB_FILE, JSON.stringify(defaultAdmin, null, 2), 'utf8');
  return defaultAdmin;
}

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
// Brute-force koruması: oturum başına deneme sayısı ve kilit
const MAX_ATTEMPTS = 5;
const LOCK_TIME = 5 * 60 * 1000; // 5 dakika

app.post('/admin-login', (req, res) => {
  const { username, password } = req.body;
  if (!req.session.loginAttempts) req.session.loginAttempts = 0;
  if (!req.session.lockedUntil) req.session.lockedUntil = 0;

  if (Date.now() < req.session.lockedUntil) {
    return res.send('<h3>Çok fazla deneme! Lütfen birkaç dakika sonra tekrar deneyin.</h3>');
  }

  const admin = getAdminInfo();
  if (username === admin.username && bcrypt.compareSync(password, admin.hash)) {
    req.session.loggedIn = true;
    req.session.loginAttempts = 0;
    req.session.lockedUntil = 0;
    res.redirect('/admin');
  } else {
    req.session.loginAttempts++;
    if (req.session.loginAttempts >= MAX_ATTEMPTS) {
      req.session.lockedUntil = Date.now() + LOCK_TIME;
      return res.send('<h3>Çok fazla hatalı deneme! 5 dakika sonra tekrar deneyin.</h3>');
    }
    res.send(`<h3>Hatalı giriş bilgileri. (${req.session.loginAttempts}/${MAX_ATTEMPTS}) <a href="/admin-login">Tekrar dene</a></h3>`);
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
