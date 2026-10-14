const { sendJson } = require('../_utils');

module.exports = async function handler(req, res) {
  // Clear the cookie
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
  const cookieHeader = `arthana_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;

  return sendJson(
    res,
    200,
    { success: true, message: 'Logout berhasil' },
    { 'Set-Cookie': cookieHeader }
  );
};
