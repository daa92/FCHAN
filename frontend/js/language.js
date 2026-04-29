// ════════════════════════════════════════════════════
// FCHAN — Language Manager (EN / FR)
// ════════════════════════════════════════════════════

const translations = {
  en: {
    // ── AUTH ──
    login:              'Login',
    register:           'Create Account',
    logout:             'Logout',
    email:              'Email Address',
    password:           'Password',
    confirm_password:   'Confirm Password',
    full_name:          'Full Name',
    forgot_password:    'Forgot Password?',
    no_account:         "Don't have an account?",
    have_account:       'Already have an account?',
    welcome_back:       'Welcome Back',
    create_account:     'Join FCHAN',
    reset_password:     'Reset Password',
    send_reset:         'Send Reset Link',

    // ── NAVIGATION ──
    dashboard:    'Dashboard',
    farms:        'My Farms',
    alerts:       'Alerts',
    reports:      'Reports',
    settings:     'Settings',
    about:        'About',
    profile:      'Profile',

    // ── DASHBOARD ──
    good_morning:   'Good Morning',
    good_afternoon: 'Good Afternoon',
    good_evening:   'Good Evening',
    total_farms:    'Total Farms',
    total_zones:    'Total Zones',
    total_plants:   'Total Plants',
    active_alerts:  'Active Alerts',
    recent_alerts:  'Recent Alerts',
    my_farms:       'My Farms',
    no_farms:       'No farms yet',
    add_farm:       'Add Farm',
    view_all:       'View All',

    // ── FARMS ──
    farm_name:      'Farm Name',
    farm_location:  'Location',
    farm_country:   'Country',
    farm_city:      'City',
    farm_desc:      'Description',
    create_farm:    'Create Farm',
    edit_farm:      'Edit Farm',
    delete_farm:    'Delete Farm',
    farm_deleted:   'Farm deleted successfully',
    farm_created:   'Farm created successfully',

    // ── ZONES ──
    zone_name:    'Zone Name',
    zone_area:    'Area (m²)',
    zone_desc:    'Description',
    create_zone:  'Create Zone',
    edit_zone:    'Edit Zone',
    delete_zone:  'Delete Zone',
    no_zones:     'No zones yet',

    // ── PLANTS ──
    plant_name:     'Plant Name',
    species:        'Species',
    quantity:       'Quantity',
    planted_date:   'Planted Date',
    growth_stage:   'Growth Stage',
    seedling:       'Seedling',
    vegetative:     'Vegetative',
    flowering:      'Flowering',
    harvest:        'Harvest',
    create_plant:   'Add Plant',
    no_plants:      'No plants yet',

    // ── SENSORS ──
    sensor_name:    'Sensor Name',
    sensor_type:    'Sensor Type',
    sensor_unit:    'Unit',
    connection:     'Connection Type',
    api_key:        'API Key',
    last_seen:      'Last Seen',
    add_sensor:     'Add Sensor',
    no_sensors:     'No sensors yet',
    manual_entry:   'Manual Entry',
    enter_value:    'Enter Value',
    record:         'Record',

    // ── ALERTS ──
    all_alerts:     'All Alerts',
    unread:         'Unread',
    critical:       'Critical',
    warning:        'Warning',
    info:           'Info',
    resolved:       'Resolved',
    mark_read:      'Mark as Read',
    mark_resolved:  'Mark as Resolved',
    mark_all_read:  'Mark All as Read',
    no_alerts:      'No alerts',

    // ── FORECAST ──
    forecast:           'Forecast',
    growth_progress:    'Growth Progress',
    harvest_date:       'Estimated Harvest Date',
    days_remaining:     'Days Remaining',
    health_score:       'Health Score',
    health_status:      'Health Status',
    excellent:          'Excellent',
    good:               'Good',
    fair:               'Fair',
    poor:               'Poor',
    recommendations:    'Recommendations',

    // ── REPORTS ──
    download_report:  'Download Report',
    generating:       'Generating...',
    report_ready:     'Report ready!',

    // ── GENERAL ──
    save:       'Save',
    cancel:     'Cancel',
    delete:     'Delete',
    edit:       'Edit',
    add:        'Add',
    search:     'Search',
    loading:    'Loading...',
    error:      'An error occurred',
    success:    'Success',
    confirm:    'Confirm',
    yes:        'Yes',
    no:         'No',
    name:       'Name',
    date:       'Date',
    status:     'Status',
    active:     'Active',
    inactive:   'Inactive',
    actions:    'Actions',
    back:       'Back',
    next:       'Next',
    close:      'Close',
    required:   'This field is required',
  },

  fr: {
    // ── AUTH ──
    login:              'Connexion',
    register:           'Créer un compte',
    logout:             'Déconnexion',
    email:              'Adresse email',
    password:           'Mot de passe',
    confirm_password:   'Confirmer le mot de passe',
    full_name:          'Nom complet',
    forgot_password:    'Mot de passe oublié ?',
    no_account:         "Vous n'avez pas de compte ?",
    have_account:       'Vous avez déjà un compte ?',
    welcome_back:       'Bon retour',
    create_account:     'Rejoindre FCHAN',
    reset_password:     'Réinitialiser le mot de passe',
    send_reset:         'Envoyer le lien',

    // ── NAVIGATION ──
    dashboard:    'Tableau de bord',
    farms:        'Mes Fermes',
    alerts:       'Alertes',
    reports:      'Rapports',
    settings:     'Paramètres',
    about:        'À propos',
    profile:      'Profil',

    // ── DASHBOARD ──
    good_morning:   'Bonjour',
    good_afternoon: 'Bon après-midi',
    good_evening:   'Bonsoir',
    total_farms:    'Total Fermes',
    total_zones:    'Total Zones',
    total_plants:   'Total Plantes',
    active_alerts:  'Alertes actives',
    recent_alerts:  'Alertes récentes',
    my_farms:       'Mes Fermes',
    no_farms:       'Aucune ferme pour le moment',
    add_farm:       'Ajouter une ferme',
    view_all:       'Voir tout',

    // ── FARMS ──
    farm_name:      'Nom de la ferme',
    farm_location:  'Localisation',
    farm_country:   'Pays',
    farm_city:      'Ville',
    farm_desc:      'Description',
    create_farm:    'Créer une ferme',
    edit_farm:      'Modifier la ferme',
    delete_farm:    'Supprimer la ferme',
    farm_deleted:   'Ferme supprimée avec succès',
    farm_created:   'Ferme créée avec succès',

    // ── ZONES ──
    zone_name:    'Nom de la zone',
    zone_area:    'Surface (m²)',
    zone_desc:    'Description',
    create_zone:  'Créer une zone',
    edit_zone:    'Modifier la zone',
    delete_zone:  'Supprimer la zone',
    no_zones:     'Aucune zone pour le moment',

    // ── PLANTS ──
    plant_name:     'Nom de la plante',
    species:        'Espèce',
    quantity:       'Quantité',
    planted_date:   'Date de plantation',
    growth_stage:   'Stade de croissance',
    seedling:       'Semis',
    vegetative:     'Végétatif',
    flowering:      'Floraison',
    harvest:        'Récolte',
    create_plant:   'Ajouter une plante',
    no_plants:      'Aucune plante pour le moment',

    // ── SENSORS ──
    sensor_name:    'Nom du capteur',
    sensor_type:    'Type de capteur',
    sensor_unit:    'Unité',
    connection:     'Type de connexion',
    api_key:        'Clé API',
    last_seen:      'Dernière activité',
    add_sensor:     'Ajouter un capteur',
    no_sensors:     'Aucun capteur pour le moment',
    manual_entry:   'Saisie manuelle',
    enter_value:    'Entrer une valeur',
    record:         'Enregistrer',

    // ── ALERTS ──
    all_alerts:     'Toutes les alertes',
    unread:         'Non lues',
    critical:       'Critique',
    warning:        'Avertissement',
    info:           'Info',
    resolved:       'Résolue',
    mark_read:      'Marquer comme lue',
    mark_resolved:  'Marquer comme résolue',
    mark_all_read:  'Tout marquer comme lu',
    no_alerts:      'Aucune alerte',

    // ── FORECAST ──
    forecast:           'Prévisions',
    growth_progress:    'Progression de croissance',
    harvest_date:       'Date de récolte estimée',
    days_remaining:     'Jours restants',
    health_score:       'Score de santé',
    health_status:      'État de santé',
    excellent:          'Excellent',
    good:               'Bon',
    fair:               'Moyen',
    poor:               'Mauvais',
    recommendations:    'Recommandations',

    // ── REPORTS ──
    download_report:  'Télécharger le rapport',
    generating:       'Génération en cours...',
    report_ready:     'Rapport prêt !',

    // ── GENERAL ──
    save:       'Enregistrer',
    cancel:     'Annuler',
    delete:     'Supprimer',
    edit:       'Modifier',
    add:        'Ajouter',
    search:     'Rechercher',
    loading:    'Chargement...',
    error:      'Une erreur est survenue',
    success:    'Succès',
    confirm:    'Confirmer',
    yes:        'Oui',
    no:         'Non',
    name:       'Nom',
    date:       'Date',
    status:     'Statut',
    active:     'Actif',
    inactive:   'Inactif',
    actions:    'Actions',
    back:       'Retour',
    next:       'Suivant',
    close:      'Fermer',
    required:   'Ce champ est obligatoire',
  }
};

const LanguageManager = {

  get() {
    return localStorage.getItem('fchan_lang') || 'en';
  },

  set(lang) {
    localStorage.setItem('fchan_lang', lang);
    this.apply(lang);
    this.updateToggleButtons(lang);
  },

  toggle() {
    const current = this.get();
    this.set(current === 'en' ? 'fr' : 'en');
  },

  t(key) {
    const lang = this.get();
    return translations[lang][key] || translations['en'][key] || key;
  },

  apply(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = translations[lang][key];
      if (translation) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = translation;
        } else {
          el.textContent = translation;
        }
      }
    });
  },

  updateToggleButtons(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
  },

  init() {
    const lang = this.get();
    this.apply(lang);
    this.updateToggleButtons(lang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => this.set(btn.dataset.lang));
    });
  }
};
