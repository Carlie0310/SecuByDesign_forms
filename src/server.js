require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const recaptcha = require('../config/recaptcha');

const app = express();
const PORT = process.env.PORT || 3000;

// Chemins
const dataDir = path.join(__dirname, '../data');
const usersFile = path.join(dataDir, 'users.json');
const messagesFile = path.join(dataDir, 'messages.json');
const tmplDir = path.join(__dirname, '../public/templates');
// const staticDir = path.join(__dirname, '../public');

// HTTPS options
const options = {
  key: fs.readFileSync(path.join(__dirname, '../config/ssl/localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, '../config/ssl/localhost.crt'))
};


// Forcer HTTPS (redirection)
app.use((req, res, next) => {
  if (!req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Sécurité et parsing
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://www.google.com/recaptcha/",
        "https://www.gstatic.com/recaptcha/"
      ],
      frameSrc: [
        "'self'",
        "https://www.google.com/recaptcha/",
        "https://recaptcha.google.com/"
      ],
      connectSrc: ["'self'", "https://www.google.com/", "https://www.gstatic.com/"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"]
    }
  }
}));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: false }));

// Gestion des sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: true }
  })
);

// Création des fichiers json si nécessaire
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
['users.json', 'messages.json'].forEach(file => {
  const full = path.join(dataDir, file);
  if (!fs.existsSync(full)) fs.writeFileSync(full, '[]');
});

// Création dossiers logs si nécessaire
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

// Middleware de journalisation basique (access.log)
app.use((req, res, next) => {
  const line = `${new Date().toISOString()} ${req.method} ${req.url}` + '\n';
  fs.appendFileSync(path.join(logsDir, 'access.log'), line);
  next();
});

// Helpers pour lire/écrire JSON
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Serve templates with injected SITE_KEY
function renderTemplate(name) {
  const file = path.join(tmplDir, `${name}.html`);
  let html = fs.readFileSync(file, 'utf-8');
  return html.replace(/%SITE_KEY%/, process.env.RECAPTCHA_SITE_KEY);
}

// Utilisateur en mémoire
// const user = {
//   email: 'user@example.com',
//   passwordHash: bcrypt.hashSync('password123', 12)
// };

// Routes
// app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/', (req, res) => res.send(renderTemplate('index')));
app.get('/contact.html', (req, res) => {
  if (!req.session.authenticated) return res.redirect('/');
  res.send(renderTemplate('contact'));
});

app.post('/login', async (req, res) => {
  try {
    const { email, password, 'g-recaptcha-response': token } = req.body;
    if (!token || !await recaptcha.verify(token)) throw new Error('Captcha invalide');

    const users = readJson(usersFile);
    const user = users.find(u => u.email === email);
    if (!user || !await bcrypt.compare(password, user.passwordHash)) throw new Error('Identifiants incorrects');

    req.session.authenticated = true;
    return res.redirect('/contact.html');
  } catch (err) {
    fs.appendFileSync(path.join(logsDir, 'error.log'), `${new Date().toISOString()} - ${err.message}\n`);
    return res.redirect('/');
  }
});

app.post('/contact', async (req, res) => {
  try {
    if (!req.session.authenticated) return res.redirect('/');
    const { nom, email, message, 'g-recaptcha-response': token } = req.body;
    if (!token || !await recaptcha.verify(token)) throw new Error('Captcha invalide');

    // Sauvegarde du message
    const messages = readJson(messagesFile);
    messages.push({ nom, email, message, date: new Date().toISOString() });
    writeJson(messagesFile, messages);

    return res.send('Message envoyé avec succès');
  } catch (err) {
    fs.appendFileSync(path.join(logsDir, 'error.log'), `${new Date().toISOString()} - ${err.message}
`);
    return res.status(500).send("Erreur lors de l'envoi du message");
  }
});

// Démarrage HTTPS
https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS server running at https://localhost:${PORT}`);
});