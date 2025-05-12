require('dotenv').config();
const axios = require('axios');

const SITE_KEY = process.env.RECAPTCHA_SITE_KEY;
const SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

async function verify(token) {
  const url = 'https://www.google.com/recaptcha/api/siteverify';
  const params = new URLSearchParams();
  params.append('secret', SECRET_KEY);
  params.append('response', token);

  const { data } = await axios.post(url, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return data.success;
}

module.exports = { verify, SITE_KEY };