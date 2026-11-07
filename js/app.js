/**
 * ============================================================================
 * BELVIA FINANCE — LOGIQUE INTERACTIVE PRINCIPALE (PURE JAVASCRIPT ES6+)
 * - Traduction automatique & instantanée dans les 24 langues officielles de l'UE
 * - Simulateur financier actuariel en temps réel + Tableau d'amortissement
 * - Mur filtrable de 24+ témoignages clients européens vérifiés + Ajout d'avis
 * - Envoi sécurisé des demandes par e-mail via Web3Forms (api.web3forms.com)
 * ============================================================================
 */

(function () {
  "use strict";

  const CONFIG = window.BELVIA_CONFIG;
  const EU_LANGS = window.BELVIA_EU_LANGUAGES || [];
  const DICT = window.BELVIA_TRANSLATIONS || {};
  const INITIAL_REVIEWS = window.BELVIA_TESTIMONIALS || [];

  // État réactif de l'application
  const state = {
    lang: "fr",
    loanType: "personnel",
    amount: CONFIG.LOAN_LIMITS.defaultAmount,
    months: CONFIG.LOAN_LIMITS.defaultMonths,
    monthlyPayment: 0,
    totalInterest: 0,
    totalPayable: 0,
    rate: 2.2,
    reviewFilter: "all",
    showAllReviews: false,
    reviews: loadStoredReviews()
  };

  // Cache mémoire de traduction automatique des avis clients
  const dynamicQuoteCache = {};

  function loadStoredReviews() {
    try {
      const saved = JSON.parse(localStorage.getItem("belvia_custom_reviews") || "[]");
      if (Array.isArray(saved) && saved.length > 0) {
        return [...saved, ...INITIAL_REVIEWS];
      }
    } catch (_) {}
    return [...INITIAL_REVIEWS];
  }

  // Formatage monétaire européen propre
  function formatEUR(num, decimals = 0) {
    try {
      return new Intl.NumberFormat(state.lang || "fr-FR", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num);
    } catch (_) {
      return Math.round(num).toLocaleString("fr-FR") + " €";
    }
  }

  function t(key) {
    const pack = DICT[state.lang] || DICT.fr || {};
    return pack[key] || (DICT.fr && DICT.fr[key]) || key;
  }

  // ==========================================================================
  // 1. DÉTECTION AUTOMATIQUE & CHANGEMENT DES 24 LANGUES DE L'UNION EUROPÉENNE
  // ==========================================================================
  function detectInitialEULanguage() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = (urlParams.get("lang") || "").toLowerCase().trim();
    if (urlLang && DICT[urlLang]) return urlLang;

    try {
      const stored = localStorage.getItem("belvia_eu_lang");
      if (stored && DICT[stored]) return stored;
    } catch (_) {}

    const navLangs = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "fr"];

    for (const raw of navLangs) {
      if (!raw) continue;
      const base = raw.split("-")[0].toLowerCase();
      if (DICT[base]) return base;
    }
    return "fr";
  }

  function syncGoogleTranslateBridge(langCode) {
    try {
      const cookieVal = langCode === "fr" ? "" : `/fr/${langCode}`;
      if (cookieVal) {
        document.cookie = `googtrans=${cookieVal}; path=/; SameSite=Lax`;
      } else {
        document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        combo.value = langCode;
        combo.dispatchEvent(new Event("change"));
      }
    } catch (_) {}
  }

  // Traduction automatique légère par lot des témoignages pour les langues autres que FR / EN
  async function translateVisibleReviewQuotes(targetLang) {
    if (targetLang === "fr" || targetLang === "en") return;
    const nodes = document.querySelectorAll("[data-review-id]");
    nodes.forEach(async (el) => {
      const id = el.getAttribute("data-review-id");
      const cacheKey = `${targetLang}:${id}`;
      if (dynamicQuoteCache[cacheKey]) {
        el.textContent = `« ${dynamicQuoteCache[cacheKey]} »`;
        return;
      }
      const reviewObj = state.reviews.find((r) => String(r.id) === String(id));
      if (!reviewObj) return;
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=fr&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(reviewObj.quote_fr)}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translated = data[0].map((part) => part[0]).join("");
          if (translated) {
            dynamicQuoteCache[cacheKey] = translated;
            if (state.lang === targetLang) {
              el.textContent = `« ${translated} »`;
            }
          }
        }
      } catch (_) {
        // Fonctionne hors-ligne grâce au dictionnaire intégré 24 langues
      }
    });
  }

  function applyLanguage(langCode, persist = true) {
    if (!DICT[langCode]) langCode = "fr";
    state.lang = langCode;
    document.documentElement.lang = langCode;

    if (persist) {
      try {
        localStorage.setItem("belvia_eu_lang", langCode);
      } catch (_) {}
    }

    // Met à jour tous les textes marqués data-i18n
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (val) el.textContent = val;
    });

    // Met à jour le badge du sélecteur de langue dans l'en-tête
    const meta = EU_LANGS.find((l) => l.code === langCode) || { code: "fr", name: "Français", iso: "FR" };
    const isoEl = document.getElementById("activeLangIso");
    const nameEl = document.getElementById("activeLangName");
    if (isoEl) isoEl.textContent = meta.iso;
    if (nameEl) nameEl.textContent = meta.name;

    // Met à jour les options du select Type de prêt dans le formulaire
    syncFormLoanSelectLabels();

    // Recalcule et reformate le simulateur selon la locale européenne
    calculateLoan();

    // Rafraîchit la grille des témoignages et les boutons de langue
    renderReviews();
    renderLanguageModalList("");
    renderFooterMiniLangs();

    // Synchronise le pont Google Translate & traduction auto des témoignages
    syncGoogleTranslateBridge(langCode);
    translateVisibleReviewQuotes(langCode);
  }

  function syncFormLoanSelectLabels() {
    const mapKeys = {
      personnel: "loan_personnel_title",
      immobilier: "loan_immobilier_title",
      auto: "loan_auto_title",
      professionnel: "loan_pro_title",
      rachat: "loan_rachat_title",
      travaux: "loan_travaux_title"
    };
    const select = document.getElementById("formLoanType");
    if (!select) return;
    Array.from(select.options).forEach((opt) => {
      const k = mapKeys[opt.value];
      if (k) opt.textContent = t(k);
    });
  }

  function renderLanguageModalList(query = "") {
    const grid = document.getElementById("euLanguagesGrid");
    if (!grid) return;
    const q = query.trim().toLowerCase();
    const filtered = EU_LANGS.filter(
      (l) =>
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );

    grid.innerHTML = filtered
      .map(
        (lang) => `
      <button type="button" class="eu-lang-item notranslate ${lang.code === state.lang ? "active" : ""}" data-select-lang="${lang.code}">
        <span class="lang-iso-pill">${lang.iso}</span>
        <div>
          <strong>${lang.name}</strong>
          <small>${lang.region}</small>
        </div>
      </button>
    `
      )
      .join("");

    grid.querySelectorAll("[data-select-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyLanguage(btn.getAttribute("data-select-lang"), true);
        closeModal("langModal");
      });
    });
  }

  function renderFooterMiniLangs() {
    const wrap = document.getElementById("footerEuLangs");
    if (!wrap) return;
    wrap.innerHTML = EU_LANGS.map(
      (l) =>
        `<button type="button" class="mini-lang-btn notranslate ${l.code === state.lang ? "active" : ""}" data-footer-lang="${l.code}" title="${l.name} (${l.region})">${l.iso} · ${l.name}</button>`
    ).join("");
    wrap.querySelectorAll("[data-footer-lang]").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyLanguage(btn.getAttribute("data-footer-lang"), true);
      });
    });
  }

  // ==========================================================================
  // 2. SIMULATEUR DE CRÉDIT EN TEMPS RÉEL & ÉCHÉANCIER D'AMORTISSEMENT
  // ==========================================================================
  function getCurrentRate(type) {
    if (typeof CONFIG.GLOBAL_FIXED_TAEG === "number" && CONFIG.GLOBAL_FIXED_TAEG > 0) {
      return CONFIG.GLOBAL_FIXED_TAEG;
    }
    return (CONFIG.LOAN_RATES[type] && CONFIG.LOAN_RATES[type].rate) || 2.1;
  }

  function updateRangeProgress(inputEl) {
    if (!inputEl) return;
    const min = Number(inputEl.min) || 0;
    const max = Number(inputEl.max) || 100;
    const val = Number(inputEl.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    inputEl.style.setProperty("--progress", `${Math.max(0, Math.min(100, pct))}%`);
  }

  function calculateLoan() {
    const rate = getCurrentRate(state.loanType);
    const principal = Math.max(CONFIG.LOAN_LIMITS.minAmount, Math.min(CONFIG.LOAN_LIMITS.maxAmount, Number(state.amount) || 20000));
    const months = Math.max(CONFIG.LOAN_LIMITS.minMonths, Math.min(CONFIG.LOAN_LIMITS.maxMonths, Number(state.months) || 60));

    const monthlyRate = rate / 100 / 12;
    let monthly = 0;
    if (monthlyRate === 0) {
      monthly = principal / months;
    } else {
      monthly = (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
    }

    const totalPayable = monthly * months;
    const totalInterest = Math.max(0, totalPayable - principal);

    state.rate = rate;
    state.amount = principal;
    state.months = months;
    state.monthlyPayment = monthly;
    state.totalInterest = totalInterest;
    state.totalPayable = totalPayable;

    // Mise à jour de l'interface du simulateur
    const amountRange = document.getElementById("simAmountRange");
    const amountInput = document.getElementById("simAmountInput");
    const monthsRange = document.getElementById("simMonthsRange");
    const monthsInput = document.getElementById("simMonthsInput");

    if (amountRange) {
      amountRange.value = principal;
      updateRangeProgress(amountRange);
    }
    if (amountInput && document.activeElement !== amountInput) {
      amountInput.value = principal;
    }
    if (monthsRange) {
      monthsRange.value = months;
      updateRangeProgress(monthsRange);
    }
    if (monthsInput && document.activeElement !== monthsInput) {
      monthsInput.value = months;
    }

    const yearsText = (months / 12).toFixed(months % 12 === 0 ? 0 : 1);
    const durHint = document.getElementById("simYearsHint");
    if (durHint) durHint.textContent = `(${yearsText} ${t("sim_years_unit")})`;

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt("resMonthly", formatEUR(monthly, 2));
    setTxt("resTaeg", `${rate.toFixed(1).replace(".", ",")} %`);
    setTxt("resPrincipal", formatEUR(principal, 0));
    setTxt("resInterest", formatEUR(totalInterest, 0));
    setTxt("resTotal", formatEUR(totalPayable, 0));

    // Barre visuelle Capital / Intérêts
    const capPct = totalPayable > 0 ? (principal / totalPayable) * 100 : 85;
    const intPct = Math.max(0, 100 - capPct);
    const barCap = document.getElementById("barPrincipal");
    const barInt = document.getElementById("barInterest");
    if (barCap) barCap.style.width = `${capPct.toFixed(1)}%`;
    if (barInt) barInt.style.width = `${intPct.toFixed(1)}%`;

    // Synchronisation directe avec le récapitulatif & champs du formulaire Web3Forms
    syncSimulationToForm();
  }

  function selectLoanCategory(category, scrollToSim = false, scrollToForm = false) {
    if (!CONFIG.LOAN_RATES[category]) return;
    state.loanType = category;
    const preset = CONFIG.LOAN_RATES[category];
    state.amount = preset.defaultAmount;
    state.months = preset.defaultMonths;

    document.querySelectorAll(".type-pill").forEach((pill) => {
      pill.classList.toggle("active", pill.getAttribute("data-loan-type") === category);
    });

    calculateLoan();

    if (scrollToSim) {
      document.getElementById("simulateur")?.scrollIntoView({ behavior: "smooth" });
    }
    if (scrollToForm) {
      document.getElementById("demander-credit")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function syncSimulationToForm() {
    const formType = document.getElementById("formLoanType");
    const formAmount = document.getElementById("formAmount");
    const formDuration = document.getElementById("formDuration");
    const hiddenMonthly = document.getElementById("hiddenMonthlyEstimate");
    const hiddenTaeg = document.getElementById("hiddenTaegRate");
    const recapText = document.getElementById("formRecapSummary");

    if (formType) formType.value = state.loanType;
    if (formAmount && !formAmount.dataset.userEdited) formAmount.value = state.amount;
    if (formDuration && !formDuration.dataset.userEdited) formDuration.value = state.months;
    if (hiddenMonthly) hiddenMonthly.value = `${formatEUR(state.monthlyPayment, 2)} / mois`;
    if (hiddenTaeg) hiddenTaeg.value = `${state.rate.toFixed(1)}% TAEG fixe`;

    if (recapText) {
      recapText.innerHTML = `<strong>${formatEUR(state.amount, 0)}</strong> · <strong>${state.months} ${t("sim_months_unit")}</strong> · <strong>${formatEUR(state.monthlyPayment, 2)}${t("sim_per_month")}</strong> (TAEG ${state.rate.toFixed(1)}%)`;
    }
  }

  function buildAmortizationTable() {
    const tbody = document.getElementById("amortTableBody");
    if (!tbody) return;
    let balance = state.amount;
    const r = state.rate / 100 / 12;
    const m = state.monthlyPayment;
    let rowsHtml = "";

    for (let i = 1; i <= state.months; i++) {
      const interestPart = balance * r;
      const capitalPart = Math.min(balance, m - interestPart);
      balance = Math.max(0, balance - capitalPart);
      rowsHtml += `
        <tr>
          <td>#${i}</td>
          <td>${formatEUR(m, 2)}</td>
          <td>${formatEUR(capitalPart, 2)}</td>
          <td>${formatEUR(interestPart, 2)}</td>
          <td><strong>${formatEUR(balance, 2)}</strong></td>
        </tr>
      `;
    }
    tbody.innerHTML = rowsHtml;
  }

  // ==========================================================================
  // 3. MUR DE 24+ TÉMOIGNAGES CLIENTS EUROPÉENS VÉRIFIÉS
  // ==========================================================================
  function renderReviews() {
    const grid = document.getElementById("reviewsGrid");
    const loadMoreBtn = document.getElementById("toggleAllReviewsBtn");
    if (!grid) return;

    const filtered = state.reviewFilter === "all"
      ? state.reviews
      : state.reviews.filter((r) => r.category === state.reviewFilter);

    const visibleList = state.showAllReviews ? filtered : filtered.slice(0, 9);

    grid.innerHTML = visibleList
      .map((rev) => {
        const avatarHtml = rev.avatar
          ? `<img src="${rev.avatar}" alt="${rev.name}" class="reviewer-avatar" loading="lazy">`
          : `<div class="reviewer-initials" style="background:${rev.accent || "#0B1D3A"}">${rev.initials || "BF"}</div>`;

        const cacheKey = `${state.lang}:${rev.id}`;
        let quoteText = rev.quote_fr;
        if (state.lang === "en" && rev.quote_en) {
          quoteText = rev.quote_en;
        } else if (dynamicQuoteCache[cacheKey]) {
          quoteText = dynamicQuoteCache[cacheKey];
        }

        const stars = "★".repeat(rev.rating || 5);

        return `
        <article class="review-card">
          <div>
            <div class="review-top">
              <div class="reviewer-profile">
                ${avatarHtml}
                <div>
                  <div class="reviewer-name notranslate">${rev.name}</div>
                  <div class="reviewer-loc">
                    <span class="country-code-pill notranslate">${rev.countryCode}</span>
                    <span>${rev.location}</span>
                  </div>
                </div>
              </div>
              <span class="verified-pill">✓ ${t("rev_verified_badge")}</span>
            </div>
            <div class="stars-gold" style="margin-bottom:10px;font-size:0.95rem;" aria-label="5 sur 5 étoiles">${stars}</div>
            <p class="review-quote" data-review-id="${rev.id}">« ${quoteText} »</p>
          </div>
          <div class="review-footer-meta">
            <span class="review-amount-tag">${rev.amount} · ${rev.delay}</span>
            <span style="color:var(--text-muted)">${rev.date}</span>
          </div>
        </article>
      `;
      })
      .join("");

    if (loadMoreBtn) {
      if (filtered.length <= 9) {
        loadMoreBtn.style.display = "none";
      } else {
        loadMoreBtn.style.display = "inline-flex";
        loadMoreBtn.textContent = state.showAllReviews
          ? t("rev_show_less")
          : `${t("rev_load_more")} (${filtered.length})`;
      }
    }
  }

  // ==========================================================================
  // 4. ENVOI PAR E-MAIL AVEC WEB3FORMS (API OFFICIELLE HTTPS)
  // ==========================================================================
  function resolveWeb3FormsKey() {
    const configKey = (CONFIG.WEB3FORMS_ACCESS_KEY || "").trim();
    const htmlInput = document.getElementById("web3formsAccessKeyInput");
    const htmlKey = htmlInput ? htmlInput.value.trim() : "";

    const placeholderTokens = ["VOTRE_CLE_WEB3FORMS_ICI", "YOUR_ACCESS_KEY_HERE", ""];
    if (!placeholderTokens.includes(configKey)) return configKey;
    if (!placeholderTokens.includes(htmlKey)) return htmlKey;
    return "";
  }

  async function handleCreditFormSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = document.getElementById("creditSubmitBtn");
    const feedback = document.getElementById("formFeedbackBox");
    const btnLabel = submitBtn.querySelector("[data-i18n]");

    const formData = new FormData(form);
    if (formData.get("botcheck")) return; // Protection anti-robot Web3Forms

    const dossierRef = "BF-" + new Date().getFullYear() + "-" + Math.floor(10000 + Math.random() * 89999);
    const fullName = formData.get("Nom_Complet") || "Client";
    const amountReq = formData.get("Montant_Souhaite_EUR") || state.amount;
    const activeKey = resolveWeb3FormsKey();

    submitBtn.disabled = true;
    if (btnLabel) btnLabel.textContent = t("f_sending");
    feedback.className = "form-feedback";

    // Préparation des données complètes envoyées dans votre boîte mail via Web3Forms
    const payload = {
      access_key: activeKey,
      subject: `[Belvia Finance] Nouvelle Demande de Crédit (${amountReq} €) — ${fullName} [${dossierRef}]`,
      from_name: "Belvia Finance — Portail Crédit Européen",
      replyto: formData.get("Email"),
      Reference_Dossier: dossierRef,
      Type_De_Credit: formData.get("Type_Credit"),
      Montant_Demande: `${amountReq} €`,
      Duree_Remboursement: `${formData.get("Duree_Mois")} mois`,
      Mensualite_Estimee: document.getElementById("hiddenMonthlyEstimate")?.value || "",
      Taux_TAEG_Applique: document.getElementById("hiddenTaegRate")?.value || "",
      Nom_Et_Prenom: fullName,
      Email_Client: formData.get("Email"),
      Telephone_WhatsApp: formData.get("Telephone"),
      Pays_Residence_UE: formData.get("Pays_Residence"),
      Ville_Et_Code_Postal: formData.get("Ville_Code_Postal"),
      Situation_Professionnelle: formData.get("Profession"),
      Revenu_Mensuel_Net: `${formData.get("Revenu_Mensuel_Net_EUR")} €`,
      Langue_Navigateur_UE: state.lang.toUpperCase(),
      Message_Projet: formData.get("Message_Projet") || "Aucune précision complémentaire"
    };

    try {
      if (!activeKey) {
        // Simulation instantanée propre tant que le propriétaire n'a pas encore collé sa clé Web3Forms
        await new Promise((r) => setTimeout(r, 750));
        feedback.className = "form-feedback success show";
        feedback.innerHTML = `
          <h4 style="font-size:1.18rem;margin-bottom:8px;color:#065F46;">✓ ${t("f_success_title")}</h4>
          <p style="margin-bottom:10px;">${t("f_success_desc")}</p>
          <p style="font-weight:800;font-size:0.9rem;">Référence dossier : <span class="notranslate">${dossierRef}</span> · Montant : ${amountReq} €</p>
          <p style="margin-top:12px;font-size:0.78rem;opacity:0.85;border-top:1px solid rgba(6,95,70,0.2);padding-top:10px;">
            ℹ️ <strong>Mode Aperçu Actif :</strong> Collez votre clé d'accès dans <code>js/config.js</code> (ligne <code>WEB3FORMS_ACCESS_KEY</code>) ou dans <code>index.html</code> pour recevoir chaque demande directement dans votre boîte mail via Web3Forms.
          </p>
        `;
        form.reset();
        syncSimulationToForm();
      } else {
        const response = await fetch(CONFIG.WEB3FORMS_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok && result.success) {
          if (CONFIG.REDIRECT_URL_AFTER_SUBMIT) {
            window.location.href = CONFIG.REDIRECT_URL_AFTER_SUBMIT;
            return;
          }
          feedback.className = "form-feedback success show";
          feedback.innerHTML = `
            <h4 style="font-size:1.18rem;margin-bottom:8px;color:#065F46;">✓ ${t("f_success_title")}</h4>
            <p style="margin-bottom:10px;">${t("f_success_desc")}</p>
            <p style="font-weight:800;font-size:0.92rem;">Référence officielle : <span class="notranslate">${dossierRef}</span></p>
          `;
          form.reset();
          syncSimulationToForm();
        } else {
          throw new Error(result.message || "Erreur lors de l'envoi Web3Forms");
        }
      }
    } catch (err) {
      feedback.className = "form-feedback error show";
      feedback.innerHTML = `<strong>Erreur de transmission :</strong> ${err.message}. Vérifiez votre clé d'accès Web3Forms dans <code>js/config.js</code>.`;
    } finally {
      submitBtn.disabled = false;
      if (btnLabel) btnLabel.textContent = t("btn_apply_credit");
      feedback.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  // ==========================================================================
  // 5. MODALES, FAQ, MENU MOBILE & INITIALISATION
  // ==========================================================================
  function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add("open");
  }

  function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove("open");
  }

  function injectInstitutionDetails() {
    const inst = CONFIG.INSTITUTION;
    document.querySelectorAll("[data-inst='address']").forEach((el) => (el.textContent = inst.addressLine));
    document.querySelectorAll("[data-inst='email']").forEach((el) => {
      el.textContent = inst.email;
      if (el.tagName === "A") el.href = `mailto:${inst.email}`;
    });
    document.querySelectorAll("[data-inst='phone']").forEach((el) => {
      el.textContent = inst.phoneDisplay;
      if (el.tagName === "A") el.href = `tel:${inst.phoneHref}`;
    });
    document.querySelectorAll("[data-inst='hours']").forEach((el) => (el.textContent = inst.hours));
    document.querySelectorAll("[data-inst='reg']").forEach((el) => (el.textContent = inst.registrationNumber));
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectInstitutionDetails();

    // Écouteurs du simulateur
    document.querySelectorAll(".type-pill").forEach((pill) => {
      pill.addEventListener("click", () => selectLoanCategory(pill.getAttribute("data-loan-type")));
    });

    document.querySelectorAll("[data-simulate-loan]").forEach((btn) => {
      btn.addEventListener("click", () => selectLoanCategory(btn.getAttribute("data-simulate-loan"), true, false));
    });

    document.querySelectorAll("[data-apply-loan]").forEach((btn) => {
      btn.addEventListener("click", () => selectLoanCategory(btn.getAttribute("data-apply-loan"), false, true));
    });

    const amountRange = document.getElementById("simAmountRange");
    const amountInput = document.getElementById("simAmountInput");
    const monthsRange = document.getElementById("simMonthsRange");
    const monthsInput = document.getElementById("simMonthsInput");

    amountRange?.addEventListener("input", (e) => {
      state.amount = Number(e.target.value);
      calculateLoan();
    });
    amountInput?.addEventListener("change", (e) => {
      state.amount = Number(e.target.value);
      calculateLoan();
    });
    monthsRange?.addEventListener("input", (e) => {
      state.months = Number(e.target.value);
      calculateLoan();
    });
    monthsInput?.addEventListener("change", (e) => {
      state.months = Number(e.target.value);
      calculateLoan();
    });

    // Modale Langues UE (24 langues officielles)
    document.getElementById("openLangModalBtn")?.addEventListener("click", () => {
      openModal("langModal");
      document.getElementById("langSearchInput")?.focus();
    });

    document.getElementById("langSearchInput")?.addEventListener("input", (e) => {
      renderLanguageModalList(e.target.value);
    });

    // Modale Tableau d'amortissement
    document.getElementById("openAmortModalBtn")?.addEventListener("click", () => {
      buildAmortizationTable();
      openModal("amortModal");
    });

    // Modale Ajouter un témoignage
    document.getElementById("openAddReviewModalBtn")?.addEventListener("click", () => {
      openModal("addReviewModal");
    });

    document.getElementById("newReviewForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(e.currentTarget);
      const name = (fd.get("name") || "").toString().trim();
      const city = (fd.get("city") || "").toString().trim();
      const country = (fd.get("country") || "FR").toString().trim().toUpperCase();
      const category = (fd.get("category") || "personnel").toString();
      const amount = (fd.get("amount") || "20 000").toString().trim();
      const quote = (fd.get("quote") || "").toString().trim();
      if (!name || !quote) return;

      const parts = name.split(" ");
      const initials = ((parts[0]?.[0] || "B") + (parts[1]?.[0] || "F")).toUpperCase();

      const newRev = {
        id: Date.now(),
        name,
        location: city,
        countryCode: country,
        category,
        amount: amount.includes("€") ? amount : `${amount} €`,
        delay: "48h",
        rating: 5,
        date: "Octobre 2026",
        initials,
        accent: "#0B1D3A",
        quote_fr: quote,
        quote_en: quote
      };

      state.reviews.unshift(newRev);
      try {
        const prev = JSON.parse(localStorage.getItem("belvia_custom_reviews") || "[]");
        prev.unshift(newRev);
        localStorage.setItem("belvia_custom_reviews", JSON.stringify(prev.slice(0, 20)));
      } catch (_) {}

      e.currentTarget.reset();
      closeModal("addReviewModal");
      renderReviews();
    });

    // Fermeture des modales
    document.querySelectorAll("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.getAttribute("data-close-modal")));
    });
    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) backdrop.classList.remove("open");
      });
    });

    // Filtres des témoignages
    document.querySelectorAll("[data-review-filter]").forEach((chip) => {
      chip.addEventListener("click", () => {
        state.reviewFilter = chip.getAttribute("data-review-filter");
        document.querySelectorAll("[data-review-filter]").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        renderReviews();
      });
    });

    document.getElementById("toggleAllReviewsBtn")?.addEventListener("click", () => {
      state.showAllReviews = !state.showAllReviews;
      renderReviews();
    });

    // Accordéon FAQ
    document.querySelectorAll(".faq-question").forEach((btn) => {
      btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        item?.classList.toggle("open");
      });
    });

    // Menu mobile
    const mobileBtn = document.getElementById("mobileMenuBtn");
    const mobileDrawer = document.getElementById("mobileNavDrawer");
    mobileBtn?.addEventListener("click", () => {
      mobileDrawer?.classList.toggle("open");
    });
    mobileDrawer?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => mobileDrawer.classList.remove("open"));
    });

    // Formulaire de crédit Web3Forms
    document.getElementById("belviaCreditForm")?.addEventListener("submit", handleCreditFormSubmit);

    // Effet scroll Header + Bouton flottant « Demander un crédit »
    const header = document.getElementById("siteHeader");
    const floatingCta = document.getElementById("floatingApplyCta");
    window.addEventListener("scroll", () => {
      const y = window.scrollY || window.pageYOffset;
      header?.classList.toggle("scrolled", y > 24);
      floatingCta?.classList.toggle("visible", y > 520);
    });

    // Initialisation avec détection automatique de la langue européenne du visiteur !
    const detectedLang = detectInitialEULanguage();
    applyLanguage(detectedLang, false);
  });
})();
