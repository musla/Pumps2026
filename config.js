// ⚠️  Po nasazení Apps Script Web App sem vlož deployment URL
// Viz SETUP.md krok 4
const API_URL = 'https://script.google.com/macros/s/VLOZ_SEM_DEPLOYMENT_ID/exec';

const CFG = {
  api: API_URL,
  adminKey: 'pumps2026admin', // musí souhlasit s ADMIN_KEY v Code.gs
  totalBoats: 16,
};
