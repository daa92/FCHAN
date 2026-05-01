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
      //window.location.href = 'index.html';
      //window.location.href = '/pages/index.html';
      window.location.replace = '/pages/index.html';
      return false;
    }
    return true;
  },

  // ── REDIRECT IF ALREADY LOGGED IN ───────────────
  redirectIfLoggedIn() {
    if (this.isLoggedIn()) {
      //window.location.href = 'dashboard.html';
      //window.location.href = '/pagesdashboard.html';
      window.location.replace('/pages/dashboard.html');
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
	window.location.replace('/pages/dashboard.html');
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
	window.location.replace('/pages/dashboard.html');
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
    //window.location.href = 'index.html';
    //window.location.href = '/pages/index.html';
    window.location.replace('/pages/index.html');
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
    /*if (response.status === 401) {
      this.logout();
      return null;
    }*/
    if (response.status === 401) {
  	this.removeToken();
  	window.location.replace('/pages/index.html');
  	return null;
    }

    return response.json();
  }
};

// Redirect if already logged in (on auth page)
/*if (window.location.pathname.includes('index.html') ||
    window.location.pathname === '/') {
  Auth.redirectIfLoggedIn();
}*/

if (window.location.pathname.includes('/pages/index.html') ||
    window.location.pathname === '/') {
  Auth.redirectIfLoggedIn();
}

// ── PAGE PROTECTION ───────────────────────────────
(function() {
  const path = window.location.pathname;
  const isAuthPage = path.includes('index.html') ||
                     path.endsWith('/pages') ||
                     path.endsWith('/pages/') ||
                     path === '/';

  if (isAuthPage) {
    // On login page: redirect to dashboard if already logged in
    if (Auth.isLoggedIn()) {
      window.location.replace('/pages/dashboard.html');
    }
  } else {
    // On protected page: redirect to login if not logged in
    if (!Auth.isLoggedIn()) {
      window.location.replace('/pages/index.html');
    }
  }

  // Handle forward/back button navigation
  window.addEventListener('pageshow', function(event) {
    // event.persisted = true means page was loaded from cache
    if (event.persisted) {
      if (isAuthPage && Auth.isLoggedIn()) {
        window.location.replace('/pages/dashboard.html');
      } else if (!isAuthPage && !Auth.isLoggedIn()) {
        window.location.replace('/pages/index.html');
      }
    }
  });
})();
