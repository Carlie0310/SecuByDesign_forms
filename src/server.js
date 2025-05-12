const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const recaptcha = require('../config/recaptcha');

const app = express();
const PORT = 3000;

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
    secret: '5458f0e2374f17383b1831af7806e12a80e962b4d5c217152a66cdba682c6ebec1cd97c516f9edd20a28d3007bb3c734dd5b6c0a3adf9e2393bc5b954fc5cc8a',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: true }
  })
);

// Création dossiers logs si nécessaire
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

// Middleware de journalisation basique (access.log)
app.use((req, res, next) => {
  const line = `${new Date().toISOString()} ${req.method} ${req.url}` + '\n';
  fs.appendFileSync(path.join(logsDir, 'access.log'), line);
  next();
});

// Utilisateur en mémoire
const user = {
  email: 'user@example.com',
  passwordHash: bcrypt.hashSync('password123', 12)
};

// Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));

app.post('/login', async (req, res) => {
  try {
    const { email, password, 'g-recaptcha-response': token } = req.body;
    if (!token || !await recaptcha.verify(token)) throw new Error('Captcha invalide');
    if (email === user.email && await bcrypt.compare(password, user.passwordHash)) {
      req.session.authenticated = true;
      return res.redirect('/contact.html');
    }
    throw new Error('Identifiants incorrects');
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
    console.log(`Message de ${nom} <${email}>: ${message}`);
    return res.send('Message envoyé avec succès');
  } catch (err) {
    fs.appendFileSync(path.join(logsDir, 'error.log'), `${new Date().toISOString()} - ${err.message}\n`);
    return res.status(500).send("Erreur lors de l'envoi du message");
  }
});

// Démarrage HTTPS
https.createServer(options, app).listen(PORT, () => {
  console.log(`HTTPS server running at https://localhost:${PORT}`);
});