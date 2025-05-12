// seedUsers.js : script CLI pour (re)générer users.json
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const users = [
  { email: 'user@example.com', password: 'password123' },
  { email: 'admin@example.com', password: 'admin123'},
  { email: 'kerry@hadid.com', password: 'local_pwd'}
  // Ajoutez ici d'autres utilisateurs si nécessaire
];

(async () => {
  const dataDir = path.join(__dirname, '../data');
  const usersFile = path.join(dataDir, 'users.json');

  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

  const hashed = await Promise.all(
    users.map(async u => ({
      email: u.email,
      passwordHash: await bcrypt.hash(u.password, 12)
    }))
  );

  fs.writeFileSync(usersFile, JSON.stringify(hashed, null, 2));
  console.log('users.json mis à jour avec', hashed.length, 'utilisateur(s)');
})();