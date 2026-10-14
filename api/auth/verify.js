const { loadEnv, getSessionUser, sendJson } = require('../_utils');

module.exports = async function handler(req, res) {
  loadEnv();

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const session = getSessionUser(req);
  if (session && session.user) {
    return sendJson(res, 200, {
      authenticated: true,
      user: session.user,
      googleSheetsConfigured: Boolean(process.env.GOOGLE_SHEETS_SCRIPT_URL)
    });
  }

  return sendJson(res, 401, {
    authenticated: false,
    error: 'Sesi belum login atau telah kedaluwarsa'
  });
};
