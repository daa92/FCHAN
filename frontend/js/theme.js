// ════════════════════════════════════════════════════
// FCHAN — Theme Manager (Dark / Light)
// ════════════════════════════════════════════════════

const ThemeManager = {

  // Get current theme
  get() {
    return localStorage.getItem('fchan_theme') || 'light';
  },

  // Set theme
  set(theme) {
    localStorage.setItem('fchan_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleButtons(theme);
  },

  // Toggle between dark and light
  toggle() {
    const current = this.get();
    this.set(current === 'dark' ? 'light' : 'dark');
  },

  // Update all toggle buttons on the page
  updateToggleButtons(theme) {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    });
  },

  // Initialize on page load
  init() {
    const theme = this.get();
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleButtons(theme);

    // Bind all toggle buttons
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });
  }
};
