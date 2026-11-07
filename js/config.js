/**
 * ============================================================================
 * BELVIA FINANCE — CONFIGURATION GÉNÉRALE DU SITE & CLÉ WEB3FORMS
 * ============================================================================
 * Modifiez simplement les valeurs ci-dessous pour personnaliser votre site :
 *
 * COMMENT ACTIVER LA RÉCEPTION DES DEMANDES PAR E-MAIL AVEC WEB3FORMS :
 * 1. Rendez-vous gratuitement sur : https://web3forms.com
 * 2. Entrez l'adresse e-mail sur laquelle vous souhaitez recevoir les dossiers
 * 3. Copiez la clé d'accès reçue par mail (ex: "a1b2c3d4-e5f6-7890-abcd-1234567890ef")
 * 4. Collez-la ci-dessous dans WEB3FORMS_ACCESS_KEY (entre les guillemets) !
 * ============================================================================
 */

window.BELVIA_CONFIG = {
  // 🔑 COLLEZ VOTRE CLÉ D'ACCÈS WEB3FORMS ICI :
  WEB3FORMS_ACCESS_KEY: "f34c8cdd-a674-4413-b143-6b8d0176e03a",

  // URL officielle de l'API Web3Forms (ne pas modifier)
  WEB3FORMS_ENDPOINT: "https://api.web3forms.com/submit",

  // URL optionnelle de redirection après envoi (laisser "" pour afficher la confirmation intégrée au site)
  REDIRECT_URL_AFTER_SUBMIT: "",

  // 🏛️ INFORMATIONS OFFICIELLES DE L'INSTITUTION (SIÈGE EN FRANCE)
  INSTITUTION: {
    name: "Belvia Finance",
    legalName: "Belvia Finance S.A.S. — Établissement Européen de Crédit & Financement",
    addressLine: "88 Avenue Kléber, 75116 Paris, France",
    cityCountry: "Paris, France",
    phoneDisplay: "+33 1 86 95 42 10",
    phoneHref: "+33186954210",
    whatsappDisplay: "+40779142",
    whatsappHref: "https://wa.me/40779142488",
    email: "financefixe90@gmail.com",
    registrationNumber: "RCS Paris B 894 512 730 · Agrément Européen UE",
    hours: "Lun – Sam : 08h30 – 19h30 (Heure de Paris)",
    foundedYear: "2014"
  },

  // 💶 PARAMÈTRES DU SIMULATEUR DE CRÉDIT — TAUX D'INTÉRÊT UNIQUE FIXE DE 3 %
  GLOBAL_FIXED_TAEG: 3.0,

  LOAN_LIMITS: {
    minAmount: 2000,
    maxAmount: 500000,
    defaultAmount: 35000,
    stepAmount: 500,
    minMonths: 6,
    maxMonths: 240,
    defaultMonths: 84,
    stepMonths: 6
  },

  // Taux annuels fixes à 3 % (TAEG %) sur l'ensemble des catégories de prêt
  LOAN_RATES: {
    personnel: { rate: 3.0, minAmount: 2000, maxAmount: 75000, defaultAmount: 18000, defaultMonths: 60 },
    immobilier: { rate: 3.0, minAmount: 30000, maxAmount: 500000, defaultAmount: 185000, defaultMonths: 180 },
    auto: { rate: 3.0, minAmount: 3000, maxAmount: 90000, defaultAmount: 26000, defaultMonths: 60 },
    professionnel: { rate: 3.0, minAmount: 5000, maxAmount: 500000, defaultAmount: 65000, defaultMonths: 84 },
    rachat: { rate: 3.0, minAmount: 5000, maxAmount: 250000, defaultAmount: 48000, defaultMonths: 120 },
    travaux: { rate: 3.0, minAmount: 2500, maxAmount: 120000, defaultAmount: 32000, defaultMonths: 72 }
  }
};
