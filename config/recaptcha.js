const axios = require('axios');

const SITE_KEY = '6LcjGzcrAAAAAOBuljT3GhnAID-qPmRmX8_NpsBO';
const SECRET_KEY = '6LcjGzcrAAAAAPsEQlJWz7k8hkKKFOJjxH0XYGUG';

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