// validation.js : validation client-side pour login et contact

// Valide le formulaire de connexion
function validateLogin() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  let valid = true;

  if (!emailPattern.test(email)) {
    alert('Email invalide.');
    valid = false;
  }

  if (password.length < 6) {
    alert('Le mot de passe doit contenir au moins 6 caractères.');
    valid = false;
  }

  return valid;
}

// Valide le formulaire de contact
function validateContact() {
  const nom = document.getElementById('nom').value.trim();
  const email = document.getElementById('email').value;
  const message = document.getElementById('message').value.trim();
  const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

  if (!nom) {
    alert('Le nom est requis.');
    return false;
  }

  if (!emailPattern.test(email)) {
    alert('Email invalide.');
    return false;
  }

  if (!message) {
    alert('Le message est requis.');
    return false;
  }

  return true;
}
