// Simple internationalization system
export const translations = {
  'en-US': {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.calendar': 'Calendar',
    'nav.bills': 'Bills',
    'nav.vendors': 'Vendors',
    'nav.projects': 'Projects',
    'nav.updates': 'Updates',
    'nav.settings': 'Settings',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.subtitle': 'Overview of key metrics and recent items.',
    'dashboard.today': 'Today',
    'dashboard.thisWeek': 'This Week',
    'dashboard.next2Weeks': 'Next 2 Weeks',
    'dashboard.onHold': 'On Hold',
    'dashboard.upcomingOccurrences': 'Upcoming Occurrences',
    'dashboard.monthlyTotals': 'Monthly Totals',
    'dashboard.loading': 'Loading...',
    'dashboard.nothingComingUp': 'Nothing coming up.',

    // Bills
    'bills.title': 'Bills',
    'bills.createAndManage': 'Create and manage bills',
    'bills.newBillName': 'New bill name',
    'bills.add': 'Add',
    'bills.noBillsYet': 'No bills yet.',

    // Vendors
    'vendors.title': 'Vendors',
    'vendors.manageDirectory': 'Manage vendor directory',
    'vendors.newVendorName': 'New vendor name',
    'vendors.noVendorsYet': 'No vendors yet.',
    'vendors.bills': 'Bills',
    'vendors.deleteVendor': 'Delete this vendor? This cannot be undone.',
    'vendors.vendorExists': 'Vendor already exists',

    // Projects
    'projects.title': 'Projects',
    'projects.createAndManage': 'Create and manage projects',
    'projects.newProjectName': 'New project name',
    'projects.noProjectsYet': 'No projects yet.',
    'projects.deleteProject': 'Delete this project?',

    // Updates
    'updates.title': 'Updates & Feedback',

    // Settings
    'settings.profile': 'Profile',
    'settings.appearance': 'Appearance',
    'settings.language': 'Language',
    'settings.timezone': 'Timezone',
    'settings.dateFormat': 'Date Format',
    'settings.currency': 'Currency',
    'settings.save': 'Save Settings',
    'settings.saving': 'Saving...',

    // Common
    'common.loading': 'Loading...',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.actions': 'Actions',
    'common.name': 'Name',
    'common.amount': 'Amount',
    'common.dueDate': 'Due Date',
    'common.status': 'Status',
    'common.state': 'State',
    'common.due': 'Due',
    'common.new': 'New',
    'common.today': 'Today',
    'common.prev': 'Prev',
    'common.next': 'Next',
    'common.noMatches': 'No matches',
    'common.create': 'Create',
    'common.bills': 'Bills',
    'common.totalDollar': 'Total $',
    'common.byProject': 'By Project:',
    'common.noItems': 'No items',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.filters': 'Filters',
    'common.clearFilters': 'Clear filters',
    'common.searchResults': 'Search results',
    'common.noResults': 'No results found',
    'common.allVendors': 'All vendors',
    'common.allProjects': 'All projects',
    'common.allStatuses': 'All statuses',

    // Organization & Roles
    'org.settings': 'Organization Settings',
    'org.members': 'Members',
    'org.invite': 'Invite Member',
    'org.inviteNewMember': 'Invite New Member',
    'org.pendingInvites': 'Pending Invitations',
    'org.currentMembers': 'Current Members',
    'org.rolePermissions': 'Role Permissions',
    'org.emailAddress': 'Email Address',
    'org.role': 'Role',
    'org.sendInvitation': 'Send Invitation',
    'org.sending': 'Sending...',
    'org.invitedAs': 'Invited as',
    'org.expires': 'Expires',
    'org.revoke': 'Revoke',
    'org.joined': 'Joined',
    'org.removeMember': 'Remove this member from the organization?',
    'org.revokeInvite': 'Revoke this invitation?',
    'org.cannotChangeOwnRole': 'Cannot change your own role',
    'org.cannotRemoveSelf': 'Cannot remove yourself from the organization',

    // Role labels
    'roles.admin': 'Administrator',
    'roles.approver': 'Approver',
    'roles.accountant': 'Accountant',
    'roles.data_entry': 'Data Entry',
    'roles.analyst': 'Analyst',
    'roles.viewer': 'Viewer',

    // Role descriptions
    'roles.adminDesc': 'Full access to all features and settings',
    'roles.approverDesc': 'Can approve bill occurrences and view all data',
    'roles.accountantDesc': 'Can manage payments and bill states',
    'roles.data_entryDesc': 'Can create and edit bills, vendors, and projects',
    'roles.analystDesc': 'Read-only access to all data for reporting',
    'roles.viewerDesc': 'Basic read-only access',
  },

  'fr-FR': {
    // Navigation
    'nav.dashboard': 'Tableau de bord',
    'nav.calendar': 'Calendrier',
    'nav.bills': 'Factures',
    'nav.vendors': 'Fournisseurs',
    'nav.projects': 'Projets',
    'nav.updates': 'Mises à jour',
    'nav.settings': 'Paramètres',

    // Dashboard
    'dashboard.title': 'Tableau de bord',
    'dashboard.subtitle': 'Aperçu des métriques clés et des éléments récents.',
    'dashboard.today': "Aujourd'hui",
    'dashboard.thisWeek': 'Cette semaine',
    'dashboard.next2Weeks': 'Prochaines 2 semaines',
    'dashboard.onHold': 'En attente',
    'dashboard.upcomingOccurrences': 'Échéances à venir',
    'dashboard.monthlyTotals': 'Totaux mensuels',
    'dashboard.loading': 'Chargement...',
    'dashboard.nothingComingUp': 'Rien à venir.',

    // Bills
    'bills.title': 'Factures',
    'bills.createAndManage': 'Créer et gérer les factures',
    'bills.newBillName': 'Nom de la nouvelle facture',
    'bills.add': 'Ajouter',
    'bills.noBillsYet': 'Aucune facture pour le moment.',

    // Vendors
    'vendors.title': 'Fournisseurs',
    'vendors.manageDirectory': "Gérer l'annuaire des fournisseurs",
    'vendors.newVendorName': 'Nom du nouveau fournisseur',
    'vendors.noVendorsYet': 'Aucun fournisseur pour le moment.',
    'vendors.bills': 'Factures',
    'vendors.deleteVendor':
      'Supprimer ce fournisseur ? Cette action ne peut pas être annulée.',
    'vendors.vendorExists': 'Le fournisseur existe déjà',

    // Projects
    'projects.title': 'Projets',
    'projects.createAndManage': 'Créer et gérer les projets',
    'projects.newProjectName': 'Nom du nouveau projet',
    'projects.noProjectsYet': 'Aucun projet pour le moment.',
    'projects.deleteProject': 'Supprimer ce projet ?',

    // Updates
    'updates.title': 'Mises à jour et commentaires',

    // Settings
    'settings.profile': 'Profil',
    'settings.appearance': 'Apparence',
    'settings.language': 'Langue',
    'settings.timezone': 'Fuseau horaire',
    'settings.dateFormat': 'Format de date',
    'settings.currency': 'Devise',
    'settings.save': 'Enregistrer les paramètres',
    'settings.saving': 'Enregistrement...',

    // Common
    'common.loading': 'Chargement...',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.actions': 'Actions',
    'common.name': 'Nom',
    'common.amount': 'Montant',
    'common.dueDate': "Date d'échéance",
    'common.status': 'Statut',
    'common.state': 'État',
    'common.due': 'Échéance',
    'common.new': 'Nouveau',
    'common.today': "Aujourd'hui",
    'common.prev': 'Précédent',
    'common.next': 'Suivant',
    'common.noMatches': 'Aucun résultat',
    'common.create': 'Créer',
    'common.bills': 'Factures',
    'common.totalDollar': 'Total $',
    'common.byProject': 'Par projet :',
    'common.noItems': 'Aucun élément',
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.filters': 'Filtres',
    'common.clearFilters': 'Effacer les filtres',
    'common.searchResults': 'Résultats de recherche',
    'common.noResults': 'Aucun résultat trouvé',
    'common.allVendors': 'Tous les fournisseurs',
    'common.allProjects': 'Tous les projets',
    'common.allStatuses': 'Tous les statuts',

    // Organization & Roles
    'org.settings': "Paramètres d'organisation",
    'org.members': 'Membres',
    'org.invite': 'Inviter un membre',
    'org.inviteNewMember': 'Inviter un nouveau membre',
    'org.pendingInvites': 'Invitations en attente',
    'org.currentMembers': 'Membres actuels',
    'org.rolePermissions': 'Permissions des rôles',
    'org.emailAddress': 'Adresse e-mail',
    'org.role': 'Rôle',
    'org.sendInvitation': "Envoyer l'invitation",
    'org.sending': 'Envoi en cours...',
    'org.invitedAs': 'Invité en tant que',
    'org.expires': 'Expire',
    'org.revoke': 'Révoquer',
    'org.joined': 'Rejoint',
    'org.removeMember': "Retirer ce membre de l'organisation ?",
    'org.revokeInvite': 'Révoquer cette invitation ?',
    'org.cannotChangeOwnRole': 'Impossible de changer votre propre rôle',
    'org.cannotRemoveSelf': "Impossible de vous retirer de l'organisation",

    // Role labels
    'roles.admin': 'Administrateur',
    'roles.approver': 'Approbateur',
    'roles.accountant': 'Comptable',
    'roles.data_entry': 'Saisie de données',
    'roles.analyst': 'Analyste',
    'roles.viewer': 'Observateur',

    // Role descriptions
    'roles.adminDesc':
      'Accès complet à toutes les fonctionnalités et paramètres',
    'roles.approverDesc':
      'Peut approuver les occurrences de factures et voir toutes les données',
    'roles.accountantDesc':
      'Peut gérer les paiements et les états des factures',
    'roles.data_entryDesc':
      'Peut créer et modifier des factures, fournisseurs et projets',
    'roles.analystDesc':
      'Accès en lecture seule à toutes les données pour les rapports',
    'roles.viewerDesc': 'Accès de base en lecture seule',
  },

  'es-ES': {
    // Navigation
    'nav.dashboard': 'Panel',
    'nav.calendar': 'Calendario',
    'nav.bills': 'Facturas',
    'nav.vendors': 'Proveedores',
    'nav.projects': 'Proyectos',
    'nav.updates': 'Actualizaciones',
    'nav.settings': 'Configuración',

    // Dashboard
    'dashboard.title': 'Panel',
    'dashboard.subtitle': 'Resumen de métricas clave y elementos recientes.',
    'dashboard.today': 'Hoy',
    'dashboard.thisWeek': 'Esta semana',
    'dashboard.next2Weeks': 'Próximas 2 semanas',
    'dashboard.onHold': 'En espera',
    'dashboard.upcomingOccurrences': 'Próximas ocurrencias',
    'dashboard.monthlyTotals': 'Totales mensuales',
    'dashboard.loading': 'Cargando...',
    'dashboard.nothingComingUp': 'Nada próximo.',

    // Bills
    'bills.title': 'Facturas',
    'bills.createAndManage': 'Crear y gestionar facturas',
    'bills.newBillName': 'Nombre de nueva factura',
    'bills.add': 'Agregar',
    'bills.noBillsYet': 'Sin facturas aún.',

    // Vendors
    'vendors.title': 'Proveedores',
    'vendors.manageDirectory': 'Gestionar directorio de proveedores',
    'vendors.newVendorName': 'Nombre del nuevo proveedor',
    'vendors.noVendorsYet': 'Sin proveedores aún.',
    'vendors.bills': 'Facturas',
    'vendors.deleteVendor':
      '¿Eliminar este proveedor? Esto no se puede deshacer.',
    'vendors.vendorExists': 'El proveedor ya existe',

    // Projects
    'projects.title': 'Proyectos',
    'projects.createAndManage': 'Crear y gestionar proyectos',
    'projects.newProjectName': 'Nombre del nuevo proyecto',
    'projects.noProjectsYet': 'Sin proyectos aún.',
    'projects.deleteProject': '¿Eliminar este proyecto?',

    // Updates
    'updates.title': 'Actualizaciones y comentarios',

    // Settings
    'settings.profile': 'Perfil',
    'settings.appearance': 'Apariencia',
    'settings.language': 'Idioma',
    'settings.timezone': 'Zona horaria',
    'settings.dateFormat': 'Formato de fecha',
    'settings.currency': 'Moneda',
    'settings.save': 'Guardar configuración',
    'settings.saving': 'Guardando...',

    // Common
    'common.loading': 'Cargando...',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.actions': 'Acciones',
    'common.name': 'Nombre',
    'common.amount': 'Cantidad',
    'common.dueDate': 'Fecha de vencimiento',
    'common.status': 'Estado',
    'common.state': 'Estado',
    'common.due': 'Vencimiento',
    'common.new': 'Nuevo',
    'common.today': 'Hoy',
    'common.prev': 'Anterior',
    'common.next': 'Siguiente',
    'common.noMatches': 'Sin resultados',
    'common.create': 'Crear',
    'common.bills': 'Facturas',
    'common.totalDollar': 'Total $',
    'common.byProject': 'Por proyecto:',
    'common.noItems': 'Sin elementos',
    'common.search': 'Buscar',
    'common.filter': 'Filtrar',
    'common.filters': 'Filtros',
    'common.clearFilters': 'Limpiar filtros',
    'common.searchResults': 'Resultados de búsqueda',
    'common.noResults': 'No se encontraron resultados',
    'common.allVendors': 'Todos los proveedores',
    'common.allProjects': 'Todos los proyectos',
    'common.allStatuses': 'Todos los estados',

    // Organization & Roles
    'org.settings': 'Configuración de organización',
    'org.members': 'Miembros',
    'org.invite': 'Invitar miembro',
    'org.inviteNewMember': 'Invitar nuevo miembro',
    'org.pendingInvites': 'Invitaciones pendientes',
    'org.currentMembers': 'Miembros actuales',
    'org.rolePermissions': 'Permisos de roles',
    'org.emailAddress': 'Dirección de correo',
    'org.role': 'Rol',
    'org.sendInvitation': 'Enviar invitación',
    'org.sending': 'Enviando...',
    'org.invitedAs': 'Invitado como',
    'org.expires': 'Expira',
    'org.revoke': 'Revocar',
    'org.joined': 'Se unió',
    'org.removeMember': '¿Eliminar este miembro de la organización?',
    'org.revokeInvite': '¿Revocar esta invitación?',
    'org.cannotChangeOwnRole': 'No puedes cambiar tu propio rol',
    'org.cannotRemoveSelf': 'No puedes eliminarte de la organización',

    // Role labels
    'roles.admin': 'Administrador',
    'roles.approver': 'Aprobador',
    'roles.accountant': 'Contador',
    'roles.data_entry': 'Entrada de datos',
    'roles.analyst': 'Analista',
    'roles.viewer': 'Observador',

    // Role descriptions
    'roles.adminDesc':
      'Acceso completo a todas las características y configuraciones',
    'roles.approverDesc':
      'Puede aprobar ocurrencias de facturas y ver todos los datos',
    'roles.accountantDesc': 'Puede gestionar pagos y estados de facturas',
    'roles.data_entryDesc':
      'Puede crear y editar facturas, proveedores y proyectos',
    'roles.analystDesc':
      'Acceso de solo lectura a todos los datos para informes',
    'roles.viewerDesc': 'Acceso básico de solo lectura',
  },
};

export type Locale = keyof typeof translations;
export type TranslationKey = keyof (typeof translations)['en-US'];

let currentLocale: Locale = 'en-US';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: TranslationKey): string {
  return translations[currentLocale][key] || translations['en-US'][key] || key;
}
