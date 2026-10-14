const { loadEnv, signToken, sendJson, readBody } = require('../_utils');

module.exports = async function handler(req, res) {
  loadEnv();

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = await readBody(req);
    const { username, password } = body;

    const validUsername = (process.env.ADMIN_USERNAME || 'admin').trim();
    const validPassword = (process.env.ADMIN_PASSWORD || 'arthana2026').trim();

    if (!username || !password) {
      return sendJson(res, 400, { error: 'Username dan password wajib diisi' });
    }

    if (username.trim() === validUsername && password === validPassword) {
      const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
      const token = signToken({ user: validUsername, exp });

      // Secure HTTP-Only Cookie
      const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
      const cookieHeader = `arthana_session=${token}; Path=/; Max-Age=604800; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`;

      return sendJson(
        res,
        200,
        {
          success: true,
          message: 'Login berhasil',
          user: validUsername,
          token // For clients that also prefer Authorization header
        },
        { 'Set-Cookie': cookieHeader }
      );
    } else {
      return sendJson(res, 401, { error: 'Username atau password salah!' });
    }
  } catch (err) {
    console.error('Login error:', err);
    return sendJson(res, 500, { error: 'Terjadi kesalahan pada server saat login' });
  }
};
