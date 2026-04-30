// ════════════════════════════════════════════════════
// FCHAN — Auth Manager
// ════════════════════════════════════════════════════

const API_URL = 'http://localhost:3000/api';

const Auth = {

  // ── STORE TOKEN ──────────────────────────────────
  setToken(token) {
    localStorage.setItem('fchan_token', token);
  },

  getToken() {
    return localStorage.getItem('fchan_token');
  },

  removeToken() {
    localStorage.removeItem('fchan_token');
    localStorage.removeItem('fchan_user');
  },

  // ── STORE USER ───────────────────────────────────
  setUser(user) {
    localStorage.setItem('fchan_user', JSON.stringify(user));
  },

  getUser() {
    const user = localStorage.getItem('fchan_user');
    return user ? JSON.parse(user) : null;
  },

  // ── CHECK IF LOGGED IN ───────────────────────────
  isLoggedIn() {
    return !!this.getToken();
  },

  // ── REDIRECT IF NOT LOGGED IN ────────────────────
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  // ── REDIRECT IF ALREADY LOGGED IN ───────────────
  redirectIfLoggedIn() {
    if (this.isLoggedIn()) {
      window.location.href = 'dashboard.html';
    }
  },

  // ── LOGIN ────────────────────────────────────────
  async login(email, password) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.setToken(data.token);
        this.setUser(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, message: data.message };

    } catch (err) {
      return {
        success: false,
        message: 'Connection error. Please check your internet connection.'
      };
    }
  },

  // ── REGISTER ─────────────────────────────────────
  async register(name, email, password) {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();

      if (data.success) {
        this.setToken(data.token);
        this.setUser(data.user);
        return { success: true, user: data.user };
      }

      return { success: false, message: data.message };

    } catch (err) {
      return {
        success: false,
        message: 'Connection error. Please check your internet connection.'
      };
    }
  },

  // ── LOGOUT ───────────────────────────────────────
  logout() {
    this.removeToken();
    window.location.href = 'index.html';
  },

  // ── FORGOT PASSWORD ──────────────────────────────
  async forgotPassword(email) {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      alert(data.message);
    } catch (err) {
      alert('Connection error.');
    }
  },

  // ── API REQUEST HELPER ───────────────────────────
  async request(endpoint, options = {}) {
    const token = this.getToken();

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      },
      ...options
    };

    const response = await fetch(`${API_URL}${endpoint}`, config);

    // Token expired
    if (response.status === 401) {
      this.logout();
      return null;
    }

    return response.json();
  }
};

// Redirect if already logged in (on auth page)
if (window.location.pathname.includes('index.html') ||
    window.location.pathname === '/') {
  Auth.redirectIfLoggedIn();
}
