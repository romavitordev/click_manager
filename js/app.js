const STORAGE_KEYS = {
    clients: "click_manager_clients",
    sessions: "click_manager_sessions",
    payments: "click_manager_payments",
    availability: "click_manager_availability",
    profile: "click_manager_profile",
    settings: "click_manager_settings",
    users: "click_manager_users",
    currentUser: "click_manager_current_user",
    contracts: "click_manager_contracts",
    sessionGalleries: "click_manager_session_galleries"
};

const defaultSettings = {
    professionalName: "",
    studioName: "",
    bio: "",
    instagram: "",
    whatsapp: "",
    website: "",
    city: "",
    sessionPrice: 0,
    monthlyAverageSessions: 0,
    bookingDeposit: 30,
    acceptedPayments: "Pix, Cartão, Boleto",
    paymentDeadline: "7 dias",
    publicName: "",
    publicBio: "",
    publicInstagram: "",
    watermarkText: "Click Manager",
    extraPhotoPrice: 35,
    galleryExpirationDays: 30,
    notificationsEmail: true,
    notificationsWhatsapp: false
};

function readStorage(key, fallback) {
    try {
        const value = window.localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignora falhas locais de armazenamento sem quebrar a UI.
    }
}

const photoPalette = [
    ["#a5b4fc", "#2563eb"],
    ["#c4b5fd", "#7c3aed"],
    ["#f9a8d4", "#ec4899"],
    ["#86efac", "#16a34a"],
    ["#fdba74", "#f97316"],
    ["#93c5fd", "#0f172a"]
];

const pricePerPhoto = 35;
const defaultSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];
const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const state = {
    clients: readStorage(STORAGE_KEYS.clients, []),
    sessions: readStorage(STORAGE_KEYS.sessions, []),
    payments: readStorage(STORAGE_KEYS.payments, []),
    users: readStorage(STORAGE_KEYS.users, []),
    currentUser: readStorage(STORAGE_KEYS.currentUser, null),
    contracts: readStorage(STORAGE_KEYS.contracts, []),
    sessionGalleries: readStorage(STORAGE_KEYS.sessionGalleries, {}),
    profile: readStorage(STORAGE_KEYS.profile, {
        sessionPrice: 0,
        monthlyAverageSessions: 0
    }),
    settings: {
        ...defaultSettings,
        ...readStorage(STORAGE_KEYS.settings, {})
    },
    gallerySelection: new Set(),
    calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedAgendaDate: new Date().toISOString().split("T")[0],
    availability: normalizeAvailability(readStorage(STORAGE_KEYS.availability, createDefaultAvailability()))
};

function createDefaultAvailability() {
    return {
        0: { enabled: false, slots: [] },
        1: { enabled: true, slots: [...defaultSlots] },
        2: { enabled: true, slots: [...defaultSlots] },
        3: { enabled: true, slots: [...defaultSlots] },
        4: { enabled: true, slots: [...defaultSlots] },
        5: { enabled: true, slots: [...defaultSlots] },
        6: { enabled: false, slots: [] }
    };
}

function normalizeAvailability(rawAvailability) {
    const fallback = createDefaultAvailability();
    const normalized = {};

    for (let weekday = 0; weekday < 7; weekday += 1) {
        const source = rawAvailability?.[weekday] ?? fallback[weekday];
        normalized[weekday] = {
            enabled: Boolean(source?.enabled),
            slots: Array.isArray(source?.slots)
                ? source.slots.filter((slot) => defaultSlots.includes(slot))
                : [...fallback[weekday].slots]
        };
    }

    return normalized;
}

function formatDateLabel(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        weekday: "long"
    }).format(date);
}

function getSessionPrice(session) {
    return Number(session.price || state.profile.sessionPrice || 0);
}

function getCurrentMonthSessions() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const prefix = `${year}-${month}`;
    return state.sessions.filter((session) => session.date.startsWith(prefix));
}

function getPendingPayments() {
    return state.sessions
        .filter((session) => session.paymentStatus !== "Pago")
        .map((session) => ({
            id: session.id,
            client: session.client,
            label: session.title,
            amount: formatCurrency(getSessionPrice(session)),
            due: session.date,
            paymentStatus: session.paymentStatus || "Pendente"
        }));
}

function persistCurrentUser() {
    writeStorage(STORAGE_KEYS.currentUser, state.currentUser);
}

function persistSettings() {
    writeStorage(STORAGE_KEYS.settings, state.settings);
}

function persistSessionGalleries() {
    writeStorage(STORAGE_KEYS.sessionGalleries, state.sessionGalleries);
}

function registerUserAccount(payload) {
    const role = payload.role;
    const fullName = payload.fullName.trim();
    const email = payload.email.trim();
    const password = payload.password.trim();

    if (!fullName || !email || !password || password.length < 6 || !email.includes("@")) {
        return {
            ok: false,
            message: "Verifique nome, e-mail e senha. A senha precisa ter pelo menos 6 caracteres.",
            color: "var(--danger)"
        };
    }

    if (state.users.some((item) => item.email === email)) {
        return {
            ok: false,
            message: "Já existe uma conta com este e-mail.",
            color: "var(--danger)"
        };
    }

    if (role === "photographer") {
        const sessionPrice = Number(payload.sessionPrice || 0);
        const monthlyAverageSessions = Number(payload.monthlyAverageSessions || 0);
        if (sessionPrice <= 0 || monthlyAverageSessions <= 0) {
            return {
                ok: false,
                message: "Informe valor do ensaio e média mensal para configurar o painel.",
                color: "var(--danger)"
            };
        }

        state.profile = {
            sessionPrice,
            monthlyAverageSessions
        };
        writeStorage(STORAGE_KEYS.profile, state.profile);
        state.settings = {
            ...state.settings,
            professionalName: fullName,
            publicName: payload.publicName?.trim() || fullName,
            studioName: payload.studioName?.trim() || state.settings.studioName,
            city: payload.city?.trim() || state.settings.city,
            instagram: payload.instagram?.trim() || state.settings.instagram,
            sessionPrice,
            monthlyAverageSessions
        };
        persistSettings();
    }

    const newUser = {
        id: Date.now(),
        role,
        fullName,
        email,
        password,
        photographerName: payload.photographerName?.trim() || "",
        photographerHandle: payload.photographerHandle?.trim() || "",
        shareCode: payload.shareCode?.trim() || "",
        studioName: payload.studioName?.trim() || "",
        publicName: payload.publicName?.trim() || "",
        city: payload.city?.trim() || "",
        instagram: payload.instagram?.trim() || "",
        specialty: payload.specialty?.trim() || "",
        accessStage: payload.accessStage?.trim() || "",
        shootType: payload.shootType?.trim() || "",
        preferredDate: payload.preferredDate?.trim() || "",
        whatsapp: payload.whatsapp?.trim() || ""
    };
    state.users.push(newUser);
    writeStorage(STORAGE_KEYS.users, state.users);

    if (role === "client") {
        const contract = {
            id: `CTR-${Date.now()}`,
            clientEmail: email,
            clientName: fullName,
            photographerName: newUser.photographerHandle || newUser.photographerName || "Fotógrafo responsável",
            shareCode: newUser.shareCode || payload.accessStage?.trim() || payload.shootType?.trim() || "Solicitação direta",
            status: "Pendente",
            signedAt: null,
            title: payload.accessStage?.trim()
                ? `Fluxo do cliente: ${payload.accessStage.trim().toLowerCase()}`
                : payload.shootType?.trim()
                    ? `Contrato para ${payload.shootType.trim().toLowerCase()}`
                    : "Contrato de prestação de serviço fotográfico"
        };
        state.contracts.push(contract);
        writeStorage(STORAGE_KEYS.contracts, state.contracts);
        return {
            ok: true,
            user: newUser,
            message: "Cadastro do cliente concluído. Faça login para assinar o contrato e acessar seus ensaios.",
            color: "var(--success)"
        };
    }

    return {
        ok: true,
        user: newUser,
        message: "Cadastro criado com sucesso. O painel financeiro já foi configurado com sua média inicial.",
        color: "var(--success)"
    };
}

function getCurrentClient() {
    return state.currentUser?.role === "client" ? state.currentUser : null;
}

function getCurrentClientContract() {
    const client = getCurrentClient();
    if (!client) {
        return null;
    }
    return state.contracts.find((contract) => contract.clientEmail === client.email) || null;
}

function normalizeInstagramHandle(value) {
    return (value || "").trim().replace(/^@+/, "").toLowerCase();
}

function getCurrentClientPhotographer() {
    const client = getCurrentClient();
    if (!client) {
        return null;
    }
    const handle = normalizeInstagramHandle(client.photographerHandle || client.photographerName);
    if (!handle) {
        return null;
    }
    return state.users.find((user) =>
        user.role === "photographer" &&
        normalizeInstagramHandle(user.instagram || user.publicName || user.fullName) === handle
    ) || null;
}

function getCurrentClientSessions() {
    const client = getCurrentClient();
    if (!client) {
        return [];
    }
    return state.sessions.filter((session) =>
        session.client?.toLowerCase() === client.fullName.toLowerCase() || session.clientEmail === client.email
    );
}

function getPhotographerDisplayName() {
    return state.settings.publicName || state.settings.professionalName || "Fotógrafo";
}

function getSessionsForDate(dateString) {
    return state.sessions.filter((session) => session.date === dateString);
}

function getSortedSessionsForDate(dateString) {
    return [...getSessionsForDate(dateString)].sort((left, right) => (left.time || "").localeCompare(right.time || ""));
}

function getReadableSessionDate(dateString) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(new Date(`${dateString}T12:00:00`));
}

function getAvailabilityForDate(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    const weekday = date.getDay();
    const config = state.availability[weekday];
    if (!config?.enabled) {
        return { enabled: false, availableSlots: [], bookedSlots: [] };
    }

    const bookedSlots = getSessionsForDate(dateString).map((session) => session.time);
    const availableSlots = config.slots.filter((slot) => !bookedSlots.includes(slot));
    return { enabled: true, availableSlots, bookedSlots };
}

function upsertClientFromSession(session, linkedClient) {
    const normalizedEmail = (linkedClient?.email || session.clientEmail || "").trim().toLowerCase();
    const normalizedName = (session.client || "").trim().toLowerCase();
    const existingIndex = state.clients.findIndex((client) =>
        (normalizedEmail && client.email.toLowerCase() === normalizedEmail) ||
        client.name.toLowerCase() === normalizedName
    );

    const payload = {
        id: existingIndex >= 0 ? state.clients[existingIndex].id : Date.now(),
        name: session.client,
        email: linkedClient?.email || session.clientEmail || `${normalizedName.replace(/\s+/g, ".")}@cliente.local`,
        type: session.title || "Ensaio",
        status: "Ativo",
        lastSession: getReadableSessionDate(session.date)
    };

    if (existingIndex >= 0) {
        state.clients[existingIndex] = {
            ...state.clients[existingIndex],
            ...payload
        };
    } else {
        state.clients.unshift(payload);
    }

    writeStorage(STORAGE_KEYS.clients, state.clients);
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

function getSessionGalleryItems(sessionId) {
    return Array.isArray(state.sessionGalleries[sessionId]) ? state.sessionGalleries[sessionId] : [];
}

function buildSessionShareLink(sessionId) {
    return new URL(`./galeria.html?session=${encodeURIComponent(String(sessionId))}`, window.location.href).toString();
}

function getMobileNavIcon(name) {
    const icons = {
        home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-5.5h-5V21H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
        calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 19a4.5 4.5 0 0 0-9 0M11 13a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8.5 6a4 4 0 0 0-3.5-3.97M16.5 6.5a3 3 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h2l1.2-1.6A1 1 0 0 1 10.5 4h3a1 1 0 0 1 .8.4L15.5 6h2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="12.5" r="3.25" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
        settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.3 2.2 2.5.6.7 2.5 2.2 1.3-2.2 1.3-.7 2.5-2.5.6L12 17l-1.3-2.2-2.5-.6-.7-2.5L5.3 10l2.2-1.3.7-2.5 2.5-.6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
        contracts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h7l4 4v11a1 1 0 0 1-1 1H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 4v4h4M9 12h6M9 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    };

    return icons[name] || icons.home;
}

function buildSvgImage(title, index) {
    const [start, end] = photoPalette[index % photoPalette.length];
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
            <defs>
                <linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stop-color="${start}" />
                    <stop offset="100%" stop-color="${end}" />
                </linearGradient>
            </defs>
            <rect width="800" height="800" fill="url(#g)" />
            <circle cx="630" cy="170" r="90" fill="rgba(255,255,255,0.18)" />
            <path d="M0 620 C120 520 180 500 320 580 S580 730 800 560 V800 H0 Z" fill="rgba(255,255,255,0.16)" />
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
                fill="rgba(255,255,255,0.92)" font-size="54" font-family="Sora, sans-serif" font-weight="800">
                ${title}
            </text>
        </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const deliveryPhotos = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    title: `Foto ${String(index + 1).padStart(2, "0")}`,
    src: buildSvgImage(`Entrega ${index + 1}`, index + 3),
    price: pricePerPhoto
}));

const portfolioDb = {
    name: "click_manager_portfolio",
    version: 1,
    store: "images"
};
let portfolioDragId = null;

function openPortfolioDb() {
    return new Promise((resolve, reject) => {
        const request = window.indexedDB.open(portfolioDb.name, portfolioDb.version);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(portfolioDb.store)) {
                db.createObjectStore(portfolioDb.store, { keyPath: "id" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getPortfolioRecords() {
    if (!("indexedDB" in window)) {
        return [];
    }
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readonly");
        const store = tx.objectStore(portfolioDb.store);
        const request = store.getAll();
        request.onsuccess = () => {
            const records = request.result.sort((a, b) => a.order - b.order);
            resolve(records);
            db.close();
        };
        request.onerror = () => {
            reject(request.error);
            db.close();
        };
    });
}

async function savePortfolioFile(file) {
    if (!("indexedDB" in window)) {
        return;
    }
    const records = await getPortfolioRecords();
    const nextOrder = records.length ? records[records.length - 1].order + 1 : 1;
    const record = {
        id: Date.now() + Math.random(),
        name: file.name,
        blob: file,
        order: nextOrder,
        createdAt: new Date().toISOString()
    };
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readwrite");
        tx.objectStore(portfolioDb.store).put(record);
        tx.oncomplete = () => {
            resolve();
            db.close();
        };
        tx.onerror = () => {
            reject(tx.error);
            db.close();
        };
    });
}

async function updatePortfolioRecords(records) {
    if (!("indexedDB" in window)) {
        return;
    }
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readwrite");
        const store = tx.objectStore(portfolioDb.store);
        records.forEach((record) => store.put(record));
        tx.oncomplete = () => {
            resolve();
            db.close();
        };
        tx.onerror = () => {
            reject(tx.error);
            db.close();
        };
    });
}

async function deletePortfolioRecord(id) {
    if (!("indexedDB" in window)) {
        return;
    }
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readwrite");
        tx.objectStore(portfolioDb.store).delete(id);
        tx.oncomplete = () => {
            resolve();
            db.close();
        };
        tx.onerror = () => {
            reject(tx.error);
            db.close();
        };
    });
}

async function clearPortfolioRecords() {
    if (!("indexedDB" in window)) {
        return;
    }
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(portfolioDb.store, "readwrite");
        tx.objectStore(portfolioDb.store).clear();
        tx.oncomplete = () => {
            resolve();
            db.close();
        };
        tx.onerror = () => {
            reject(tx.error);
            db.close();
        };
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function setupSidebar() {
    const toggle = document.querySelector("[data-sidebar-toggle]");
    const sidebar = document.getElementById("sidebar");
    if (!toggle || !sidebar) {
        return;
    }

    toggle.addEventListener("click", () => {
        sidebar.classList.toggle("is-open");
    });
}

function setupMobileBottomNav() {
    const page = document.body?.dataset.page;
    if (!page) {
        return;
    }

    const photographerNav = [
        { key: "dashboard", href: "./dashboard.html", label: "Início", icon: "home" },
        { key: "agenda", href: "./agenda.html", label: "Agenda", icon: "calendar" },
        { key: "clientes", href: "./clientes.html", label: "Clientes", icon: "users" },
        { key: "ensaios", href: "./ensaios.html", label: "Ensaios", icon: "camera" },
        { key: "configuracoes", href: "./configuracoes.html", label: "Ajustes", icon: "settings" }
    ];

    const clientNav = [
        { key: "client-dashboard", href: "./dashboard-cliente.html", label: "Início", icon: "home" },
        { key: "client-contracts", href: "./meus-contratos.html", label: "Contratos", icon: "contracts" },
        { key: "client-sessions", href: "./meus-ensaios.html", label: "Ensaios", icon: "calendar" }
    ];

    const navItems = photographerNav.some((item) => item.key === page)
        ? photographerNav
        : clientNav.some((item) => item.key === page)
            ? clientNav
            : null;

    if (!navItems || document.querySelector(".mobile-bottom-nav")) {
        return;
    }

    document.body.classList.add("has-mobile-bottom-nav");

    const nav = document.createElement("nav");
    nav.className = "mobile-bottom-nav";
    nav.setAttribute("aria-label", "Navegação principal mobile");
    nav.innerHTML = navItems.map((item) => `
        <a class="mobile-bottom-nav__link ${item.key === page ? "is-active" : ""}" href="${item.href}">
            <span class="mobile-bottom-nav__icon" aria-hidden="true">${getMobileNavIcon(item.icon)}</span>
            <span class="mobile-bottom-nav__label">${item.label}</span>
        </a>
    `).join("");

    document.body.appendChild(nav);
}

function setupAuth() {
    const loginForm = document.getElementById("loginForm");
    const demoCredentials = {
        email: "admin@gmail.com",
        password: "admin123"
    };

    if (!loginForm) {
        return;
    }

    loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = loginForm.elements.email.value.trim();
        const password = loginForm.elements.password.value.trim();
        const feedback = loginForm.querySelector(".form-feedback");

        if (!email || !password || password.length < 6 || !email.includes("@")) {
            feedback.textContent = "Verifique e-mail e senha. A senha precisa ter pelo menos 6 caracteres.";
            feedback.style.color = "var(--danger)";
            return;
        }

        if (email !== demoCredentials.email || password !== demoCredentials.password) {
            const user = state.users.find((item) => item.email === email && item.password === password);
            if (!user) {
                feedback.textContent = "Use a conta de teste ou um cadastro criado na plataforma.";
                feedback.style.color = "var(--danger)";
                return;
            }
            state.currentUser = user;
            persistCurrentUser();
            feedback.style.color = "var(--success)";
            feedback.textContent = user.role === "client"
                ? "Acesso do cliente validado. Redirecionando."
                : "Login validado. Redirecionando para o dashboard.";
            window.setTimeout(() => {
                window.location.href = user.role === "client"
                    ? "./pages/dashboard-cliente.html"
                    : "./pages/dashboard.html";
            }, 900);
            return;
        }

        state.currentUser = {
            role: "photographer",
            fullName: "Conta de teste",
            email: demoCredentials.email
        };
        persistCurrentUser();
        feedback.style.color = "var(--success)";
        feedback.textContent = "Login validado. Redirecionando para o dashboard.";

        window.setTimeout(() => {
            window.location.href = "./pages/dashboard.html";
        }, 900);
    });
}

function setupRegisterWizard() {
    const form = document.getElementById("registerWizardForm");
    const inputRoot = document.getElementById("registerWizardInput");
    const feedback = document.getElementById("registerWizardFeedback");
    const questionGroup = document.getElementById("registerQuestionGroup");
    const questionTitle = document.getElementById("registerQuestionTitle");
    const questionHint = document.getElementById("registerQuestionHint");
    const progressBar = document.getElementById("registerProgressBar");
    const stepLabel = document.getElementById("registerStepLabel");
    const stepCounter = document.getElementById("registerStepCounter");
    const prevButton = document.getElementById("registerPrevBtn");
    const nextButton = document.getElementById("registerNextBtn");
    const submitButton = document.getElementById("registerSubmitBtn");

    if (!form || !inputRoot || !feedback || !questionGroup || !questionTitle || !questionHint || !progressBar || !stepLabel || !stepCounter || !prevButton || !nextButton || !submitButton) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const inviteFromPhotographer = ["client", "1", "true", "photographer"].includes((params.get("role") || params.get("client") || params.get("invite") || params.get("source") || "").toLowerCase());
    const incomingAccessStage = (params.get("stage") || params.get("access") || "").trim();

    const roleStep = {
        name: "role",
        group: "Perfil",
        title: inviteFromPhotographer ? "Você é cliente?" : "Você é:",
        hint: "",
        type: "choice",
        options: [
            inviteFromPhotographer
                ? { value: "client", title: "Sim, sou cliente", description: "Quero continuar com o acesso que o fotógrafo me enviou.", icon: "bi-person-heart" }
                : { value: "photographer", title: "Sou fotógrafo", description: "Quero organizar agenda, contratos, pagamentos e entregas.", icon: "bi-camera-fill" },
            inviteFromPhotographer
                ? { value: "photographer", title: "Não, sou fotógrafo", description: "Quero criar uma conta de gestão e operar meus ensaios.", icon: "bi-camera2" }
                : { value: "client", title: "Sou cliente", description: "Quero acompanhar um ensaio, contrato e acesso à galeria.", icon: "bi-person-badge-fill" }
        ]
    };

    const photographerSteps = [
        { name: "fullName", group: "Identidade", title: "Como você quer ser identificado no sistema?", hint: "Esse nome será usado internamente na conta.", type: "text", placeholder: "Ex.: Helena Duarte", autocomplete: "name" },
        { name: "publicName", group: "Marca", title: "Qual nome público aparece para seus clientes?", hint: "Pode ser seu nome artístico ou o nome do estúdio.", type: "text", placeholder: "Ex.: Helena Duarte Fotografia" },
        { name: "email", group: "Acesso", title: "Qual e-mail vai centralizar os acessos?", hint: "Use um e-mail profissional que você consulta com frequência.", type: "email", placeholder: "voce@studio.com", autocomplete: "email" },
        { name: "password", group: "Segurança", title: "Crie uma senha de acesso.", hint: "Use pelo menos 6 caracteres.", type: "password", placeholder: "Digite sua senha", autocomplete: "new-password" },
        { name: "specialty", group: "Nicho", title: "Qual é o seu nicho principal?", hint: "Ex.: casamentos, retratos, branding, newborn, eventos.", type: "select", options: ["Casamentos", "Retratos", "Família", "Branding", "Eventos", "Newborn", "Moda", "Outro"] },
        { name: "city", group: "Atendimento", title: "Em qual cidade você atende com mais frequência?", hint: "Isso ajuda a contextualizar seu perfil.", type: "text", placeholder: "Ex.: São Paulo - SP" },
        { name: "sessionPrice", group: "Financeiro", title: "Quanto você cobra, em média, por ensaio?", hint: "Use um valor aproximado do ticket principal.", type: "number", placeholder: "1200", min: "0", step: "0.01" },
        { name: "monthlyAverageSessions", group: "Ritmo", title: "Quantos ensaios você faz por mês, em média?", hint: "Vamos usar isso para estimar metas e previsões.", type: "number", placeholder: "8", min: "0", step: "1" },
        { name: "instagram", group: "Presença", title: "Qual Instagram você usa para divulgar o trabalho?", hint: "Opcional, mas útil para preencher seu perfil.", type: "text", placeholder: "@seuinstagram", optional: true }
    ];

    const clientSteps = [
        { name: "fullName", group: "Identificação", title: "Qual é o seu nome completo?", hint: "Vamos usar esse nome no contrato e nos acessos.", type: "text", placeholder: "Ex.: Marina Souza", autocomplete: "name" },
        { name: "email", group: "Acesso", title: "Qual e-mail deve receber os acessos?", hint: "Esse será o seu login para contrato e galeria.", type: "email", placeholder: "cliente@email.com", autocomplete: "email" },
        { name: "password", group: "Segurança", title: "Crie uma senha para acessar sua área.", hint: "Use pelo menos 6 caracteres.", type: "password", placeholder: "Digite sua senha", autocomplete: "new-password" },
        { name: "photographerName", group: "Referência", title: "Quem é o fotógrafo responsável pelo seu ensaio?", hint: "Informe o nome do profissional ou estúdio.", type: "text", placeholder: "Ex.: Helena Duarte" },
        {
            name: "accessStage",
            group: "Contexto",
            title: "Como esse acesso chegou até você?",
            hint: "Selecione o estágio do atendimento em que você recebeu este link.",
            type: "choice",
            options: [
                { value: "Ensaio pronto", title: "Recebi uma galeria pronta", description: "Já existe um ensaio finalizado ou material para visualizar.", icon: "bi-images" },
                { value: "Aguardando confirmação", title: "Falta confirmar agendamento", description: "O fotógrafo iniciou o atendimento, mas a data ainda será confirmada.", icon: "bi-calendar-check" },
                { value: "Assinatura de contrato", title: "Preciso assinar contrato", description: "Recebi o acesso principalmente para formalizar a contratação.", icon: "bi-file-earmark-text" },
                { value: "Atendimento direto", title: "Foi um envio direto", description: "O fotógrafo já sabe que sou cliente e me enviou este acesso para começar.", icon: "bi-link-45deg" }
            ]
        },
        { name: "shootType", group: "Ensaio", title: "Que tipo de ensaio você está contratando?", hint: "Ex.: casal, gestante, branding, evento, formatura.", type: "select", options: ["Casal", "Gestante", "Família", "Branding", "Evento", "Formatura", "Aniversário", "Outro"] },
        { name: "preferredDate", group: "Agenda", title: "Você já tem uma data desejada?", hint: "Opcional, mas ajuda a organizar o primeiro contato.", type: "date", optional: true },
        { name: "whatsapp", group: "Contato", title: "Qual WhatsApp deve receber avisos do ensaio?", hint: "Opcional para facilitar lembretes e confirmações.", type: "tel", placeholder: "(11) 99999-9999", autocomplete: "tel", optional: true },
        { name: "shareCode", group: "Vínculo", title: "Tem código, link ou referência do ensaio?", hint: "Se recebeu algo do fotógrafo, informe aqui. Se não, pode deixar em branco.", type: "text", placeholder: "Ex.: ENSAIO-MARINA-2026", optional: true }
    ];

    const wizardState = {
        values: {
            role: "",
            accessStage: incomingAccessStage
        },
        index: 0
    };

    function getSteps() {
        const resolvedRole = wizardState.values.role || (inviteFromPhotographer ? "client" : "photographer");
        if (resolvedRole === "client") {
            const steps = incomingAccessStage
                ? clientSteps.filter((step) => step.name !== "accessStage")
                : clientSteps;
            return [roleStep].concat(steps);
        }
        return [roleStep].concat(photographerSteps);
    }

    function getCurrentStep() {
        return getSteps()[wizardState.index];
    }

    function renderInput(step) {
        if (step.type === "choice") {
            inputRoot.innerHTML = '<div class="wizard-options">' + step.options.map((option) => `
                <button
                    class="wizard-option ${wizardState.values[step.name] === option.value ? "is-selected" : ""}"
                    type="button"
                    data-choice-name="${step.name}"
                    data-choice-value="${option.value}"
                >
                    <span class="wizard-option__icon"><i class="bi ${option.icon || "bi-check2-circle"}"></i></span>
                    <span class="wizard-option__body">
                        <strong>${option.title}</strong>
                        <span>${option.description}</span>
                    </span>
                </button>
            `).join("") + '</div>';

            inputRoot.querySelectorAll("[data-choice-name]").forEach((button) => {
                button.addEventListener("click", () => {
                    wizardState.values[step.name] = button.dataset.choiceValue;
                    wizardState.index = 0;
                    renderStep();
                });
            });
            return;
        }

        if (step.type === "select") {
            inputRoot.innerHTML = `
                <div class="wizard-input">
                    <label class="field">
                        <span>${step.title}</span>
                        <select name="${step.name}" ${step.optional ? "" : "required"}>
                            <option value="">Selecione</option>
                            ${step.options.map((option) => `<option value="${option}" ${wizardState.values[step.name] === option ? "selected" : ""}>${option}</option>`).join("")}
                        </select>
                    </label>
                </div>
            `;
            return;
        }

        inputRoot.innerHTML = `
            <div class="wizard-input">
                <label class="field">
                    <span>${step.title}</span>
                    <input
                        type="${step.type}"
                        name="${step.name}"
                        value="${wizardState.values[step.name] || ""}"
                        placeholder="${step.placeholder || ""}"
                        ${step.autocomplete ? `autocomplete="${step.autocomplete}"` : ""}
                        ${step.min ? `min="${step.min}"` : ""}
                        ${step.step ? `step="${step.step}"` : ""}
                        ${step.optional ? "" : "required"}
                    >
                </label>
            </div>
        `;
    }

    function updateProgress(steps) {
        const total = steps.length;
        const current = wizardState.index + 1;
        progressBar.style.width = `${(current / total) * 100}%`;
        stepLabel.textContent = `Etapa ${current}`;
        stepCounter.textContent = `${current} / ${total}`;
    }

    function renderStep() {
        const steps = getSteps();
        if (wizardState.index >= steps.length) {
            wizardState.index = steps.length - 1;
        }
        const step = getCurrentStep();
        questionGroup.textContent = step.group;
        questionTitle.textContent = step.title;
        questionHint.textContent = step.hint;
        renderInput(step);
        updateProgress(steps);
        feedback.textContent = "";
        prevButton.hidden = wizardState.index === 0;
        const isLastStep = wizardState.index === steps.length - 1;
        nextButton.hidden = isLastStep;
        submitButton.hidden = !isLastStep;
    }

    function validateCurrentStep() {
        const step = getCurrentStep();
        if (step.type === "choice") {
            if (!wizardState.values[step.name]) {
                feedback.textContent = "Selecione um perfil para continuar.";
                feedback.style.color = "var(--danger)";
                return false;
            }
            return true;
        }

        const field = inputRoot.querySelector(`[name="${step.name}"]`);
        const value = field ? field.value.trim() : "";
        wizardState.values[step.name] = value;

        if (!step.optional && !value) {
            feedback.textContent = "Preencha essa etapa para continuar.";
            feedback.style.color = "var(--danger)";
            return false;
        }

        if (step.type === "email" && value && !value.includes("@")) {
            feedback.textContent = "Informe um e-mail válido.";
            feedback.style.color = "var(--danger)";
            return false;
        }

        if (step.type === "password" && value.length < 6) {
            feedback.textContent = "A senha precisa ter pelo menos 6 caracteres.";
            feedback.style.color = "var(--danger)";
            return false;
        }

        return true;
    }

    nextButton.addEventListener("click", () => {
        if (!validateCurrentStep()) {
            return;
        }
        wizardState.index += 1;
        renderStep();
    });

    prevButton.addEventListener("click", () => {
        wizardState.index = Math.max(0, wizardState.index - 1);
        renderStep();
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!validateCurrentStep()) {
            return;
        }

        const result = registerUserAccount(wizardState.values);
        feedback.textContent = result.message;
        feedback.style.color = result.color;
        if (!result.ok) {
            return;
        }

        window.setTimeout(() => {
            window.location.href = "./index.html";
        }, 1100);
    });

    renderStep();
}
function renderDashboard() {
    const summaryCards = document.getElementById("summaryCards");
    const upcomingSessions = document.getElementById("upcomingSessions");
    const pendingPayments = document.getElementById("pendingPayments");
    const recentClients = document.getElementById("recentClients");
    const agendaHighlights = document.getElementById("agendaHighlights");
    const financeChart = document.getElementById("financeChart");
    const financialPeriodBadge = document.getElementById("financialPeriodBadge");
    const heroMetricLabel = document.getElementById("heroMetricLabel");
    const heroMetricValue = document.getElementById("heroMetricValue");
    const heroMetricHelper = document.getElementById("heroMetricHelper");

    if (!summaryCards || !upcomingSessions || !pendingPayments || !recentClients) {
        return;
    }

    const currentMonthSessions = getCurrentMonthSessions();
    const pendingPaymentItems = getPendingPayments();
    const completedRevenue = currentMonthSessions
        .filter((session) => session.paymentStatus === "Pago")
        .reduce((sum, session) => sum + getSessionPrice(session), 0);
    const estimatedRevenue = state.profile.sessionPrice * state.profile.monthlyAverageSessions;
    const sessionsGoalPercent = state.profile.monthlyAverageSessions > 0
        ? Math.min(100, Math.round((currentMonthSessions.length / state.profile.monthlyAverageSessions) * 100))
        : 0;
    const revenueGoalPercent = estimatedRevenue > 0
        ? Math.min(100, Math.round((completedRevenue / estimatedRevenue) * 100))
        : 0;
    const contractCoveragePercent = currentMonthSessions.length > 0
        ? Math.round((currentMonthSessions.filter((session) => session.contract).length / currentMonthSessions.length) * 100)
        : 0;

    const metrics = [
        { label: "Próximos ensaios", value: state.sessions.length, helper: "Agenda registrada no sistema" },
        { label: "Pagamentos pendentes", value: pendingPaymentItems.length, helper: "Recebimentos vinculados aos ensaios" },
        { label: "Clientes ativos", value: state.clients.filter((client) => client.status === "Ativo").length, helper: "Base com contrato ativo" },
        { label: "Média estimada mensal", value: formatCurrency(estimatedRevenue), helper: "Baseada no cadastro do fotógrafo" }
    ];

    if (heroMetricLabel && heroMetricValue && heroMetricHelper) {
        heroMetricLabel.textContent = "Média mensal estimada";
        heroMetricValue.textContent = formatCurrency(estimatedRevenue);
        heroMetricHelper.textContent = state.profile.monthlyAverageSessions > 0
            ? `${state.profile.monthlyAverageSessions} ensaios/mês x ${formatCurrency(state.profile.sessionPrice)} por ensaio.`
            : "Complete o cadastro do fotógrafo para gerar a média mensal.";
    }

    summaryCards.innerHTML = metrics.map((item) => `
        <article class="metric-card">
            <p>${item.label}</p>
            <strong>${item.value}</strong>
            <small>${item.helper}</small>
        </article>
    `).join("");

    upcomingSessions.innerHTML = state.sessions.length ? state.sessions.slice(0, 3).map((session) => `
        <div class="stack-item">
            <strong>${session.title}</strong>
            <div class="stack-item__meta">${session.client} · ${session.date} · ${session.time}</div>
            <div class="stack-item__meta">${session.location} · ${session.status}</div>
        </div>
    `).join("") : `<div class="stack-item"><strong>Nenhum ensaio cadastrado</strong><div class="stack-item__meta">Adicione ensaios reais para visualizar sua agenda.</div></div>`;

    pendingPayments.innerHTML = pendingPaymentItems.length ? pendingPaymentItems.map((payment) => `
        <div class="stack-item">
            <strong>${payment.amount}</strong>
            <div class="stack-item__meta">${payment.client} · ${payment.label}</div>
            <div class="stack-item__meta">${payment.paymentStatus} · ${payment.due}</div>
        </div>
    `).join("") : `<div class="stack-item"><strong>Nenhum pagamento pendente</strong><div class="stack-item__meta">Cadastre valores reais conforme seus contratos.</div></div>`;

    recentClients.innerHTML = state.clients.length ? state.clients.slice(0, 4).map((client) => `
        <div class="client-item">
            <div class="client-line">
                <strong>${client.name}</strong>
                <span class="badge">${client.status}</span>
            </div>
            <div class="client-meta">${client.email}</div>
            <div class="client-meta">${client.type} · Último ensaio ${client.lastSession}</div>
        </div>
    `).join("") : `<div class="client-item"><strong>Nenhum cliente recente</strong><div class="client-meta">Cadastre clientes para alimentar o painel.</div></div>`;

    if (agendaHighlights) {
        agendaHighlights.innerHTML = state.sessions.length ? state.sessions.slice(0, 4).map((session) => `
            <div class="stack-item">
                <strong>${session.title}</strong>
                <div class="stack-item__meta">${session.date} · ${session.time}</div>
                <div class="stack-item__meta">${session.client} · ${session.location}</div>
                <div class="stack-item__meta">${session.contract ? `Contrato ${session.contract}` : "Sem contrato vinculado"}</div>
            </div>
        `).join("") : `<div class="stack-item"><strong>Sua agenda está limpa</strong><div class="stack-item__meta">Use a página de ensaios para cadastrar compromissos reais.</div></div>`;
    }

    if (financeChart && financialPeriodBadge) {
        financialPeriodBadge.textContent = new Intl.DateTimeFormat("pt-BR", {
            month: "long",
            year: "numeric"
        }).format(new Date());

        const indicators = [
            { label: "Meta de ensaios", percent: sessionsGoalPercent, helper: `${currentMonthSessions.length} de ${state.profile.monthlyAverageSessions || 0} ensaios` },
            { label: "Meta de receita", percent: revenueGoalPercent, helper: `${formatCurrency(completedRevenue)} de ${formatCurrency(estimatedRevenue)}` },
            { label: "Ensaios com contrato", percent: contractCoveragePercent, helper: `${currentMonthSessions.filter((session) => session.contract).length} com contrato` }
        ];

        financeChart.innerHTML = indicators.map((item, index) => `
            <div class="bar bar-${index + 1}" style="min-height:${Math.max(112, item.percent * 1.8)}px">
                <span>${item.label}</span>
                <strong>${item.percent}%</strong>
                <small>${item.helper}</small>
            </div>
        `).join("");
    }
}

function setupFinancialExport() {
    const exportButton = document.getElementById("exportFinancialBtn");
    if (!exportButton) {
        return;
    }

    exportButton.addEventListener("click", () => {
        const currentMonthSessions = getCurrentMonthSessions();
        const pendingPaymentItems = getPendingPayments();
        const completedRevenue = currentMonthSessions
            .filter((session) => session.paymentStatus === "Pago")
            .reduce((sum, session) => sum + getSessionPrice(session), 0);
        const estimatedRevenue = state.profile.sessionPrice * state.profile.monthlyAverageSessions;
        const chartMax = Math.max(estimatedRevenue, completedRevenue, 1);
        const sessionRows = currentMonthSessions.map((session) => `
            <tr>
                <td>${session.title}</td>
                <td>${session.client}</td>
                <td>${session.date}</td>
                <td>${session.time}</td>
                <td>${session.paymentStatus || "Pendente"}</td>
                <td>${formatCurrency(getSessionPrice(session))}</td>
            </tr>
        `).join("");

        const workbookHtml = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
                    h1, h2 { margin: 0 0 12px; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
                    th { background: #e2e8f0; }
                    .chart { display: flex; gap: 24px; align-items: end; height: 240px; margin: 24px 0; }
                    .bar { width: 160px; background: linear-gradient(180deg, #2563eb, #7c3aed); color: #fff; text-align: center; font-weight: 700; padding: 12px 8px; }
                    .label { margin-top: 8px; font-weight: 700; }
                </style>
            </head>
            <body>
                <h1>Relatório Financeiro - Click Manager</h1>
                <p>Período: ${new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date())}</p>

                <table>
                    <tr><th>Indicador</th><th>Valor</th></tr>
                    <tr><td>Ensaios no mês</td><td>${currentMonthSessions.length}</td></tr>
                    <tr><td>Pagamentos pendentes</td><td>${pendingPaymentItems.length}</td></tr>
                    <tr><td>Receita concluída</td><td>${formatCurrency(completedRevenue)}</td></tr>
                    <tr><td>Receita estimada</td><td>${formatCurrency(estimatedRevenue)}</td></tr>
                </table>

                <h2>Gráfico</h2>
                <div class="chart">
                    <div>
                        <div class="bar" style="height:${Math.max(48, (completedRevenue / chartMax) * 220)}px">${formatCurrency(completedRevenue)}</div>
                        <div class="label">Receita concluída</div>
                    </div>
                    <div>
                        <div class="bar" style="height:${Math.max(48, (estimatedRevenue / chartMax) * 220)}px">${formatCurrency(estimatedRevenue)}</div>
                        <div class="label">Receita estimada</div>
                    </div>
                </div>

                <h2>Ensaios do mês</h2>
                <table>
                    <tr>
                        <th>Título</th>
                        <th>Cliente</th>
                        <th>Data</th>
                        <th>Horário</th>
                        <th>Pagamento</th>
                        <th>Valor</th>
                    </tr>
                    ${sessionRows || '<tr><td colspan="6">Nenhum ensaio registrado no período.</td></tr>'}
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([workbookHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `financeiro-click-manager-${new Date().toISOString().slice(0, 10)}.xls`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    });
}

function renderAgendaControls() {
    const settingsRoot = document.getElementById("weekdaySettings");
    if (!settingsRoot) {
        return;
    }

    state.availability = normalizeAvailability(state.availability);

    settingsRoot.innerHTML = weekdayNames.map((name, weekday) => {
        const config = state.availability[weekday];
        return `
            <div class="weekday-card">
                <div class="weekday-card__top">
                    <div>
                        <strong>${name}</strong>
                        <div class="client-meta">${config.enabled ? "Disponível para agendamento" : "Fora da agenda"}</div>
                    </div>
                    <label class="switch" aria-label="Ativar ${name}">
                        <input type="checkbox" data-weekday-toggle="${weekday}" ${config.enabled ? "checked" : ""}>
                        <span></span>
                    </label>
                </div>
                <div class="slot-group">
                    <span class="client-meta">Horários liberados</span>
                    <div class="slot-chips">
                        ${defaultSlots.map((slot) => `
                            <button
                                class="slot-chip ${config.slots.includes(slot) ? "is-active" : ""}"
                                type="button"
                                data-slot-toggle="${weekday}|${slot}"
                            >${slot}</button>
                        `).join("")}
                    </div>
                </div>
            </div>
        `;
    }).join("");

    settingsRoot.querySelectorAll("[data-weekday-toggle]").forEach((input) => {
        input.addEventListener("change", () => {
            const weekday = Number(input.dataset.weekdayToggle);
            state.availability[weekday].enabled = input.checked;
            writeStorage(STORAGE_KEYS.availability, state.availability);
            renderAgenda();
        });
    });

    settingsRoot.querySelectorAll("[data-slot-toggle]").forEach((button) => {
        button.addEventListener("click", () => {
            const [weekdayRaw, slot] = button.dataset.slotToggle.split("|");
            const weekday = Number(weekdayRaw);
            const slotList = state.availability[weekday].slots;
            const index = slotList.indexOf(slot);

            if (index >= 0) {
                slotList.splice(index, 1);
            } else {
                slotList.push(slot);
                slotList.sort();
            }

            writeStorage(STORAGE_KEYS.availability, state.availability);
            renderAgenda();
        });
    });
}

function renderAgendaCalendar() {
    const calendarRoot = document.getElementById("agendaCalendar");
    const monthLabel = document.getElementById("calendarMonthLabel");
    if (!calendarRoot || !monthLabel) {
        return;
    }

    state.availability = normalizeAvailability(state.availability);

    const monthDate = state.calendarDate;
    monthLabel.textContent = new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric"
    }).format(monthDate);

    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPreviousMonth = new Date(year, month, 0).getDate();
    const calendarDays = [];

    for (let index = 0; index < 42; index += 1) {
        const dayNumber = index - startOffset + 1;
        let currentDate;
        let outside = false;

        if (dayNumber <= 0) {
            currentDate = new Date(year, month - 1, daysInPreviousMonth + dayNumber);
            outside = true;
        } else if (dayNumber > daysInMonth) {
            currentDate = new Date(year, month + 1, dayNumber - daysInMonth);
            outside = true;
        } else {
            currentDate = new Date(year, month, dayNumber);
        }

        const dateString = currentDate.toISOString().split("T")[0];
        const sessions = getSortedSessionsForDate(dateString);
        const availability = getAvailabilityForDate(dateString);
        const isSelected = state.selectedAgendaDate === dateString;
        const visibleSessions = sessions.slice(0, 2);

        calendarDays.push(`
            <button
                class="calendar-day ${outside ? "is-outside" : ""} ${sessions.length ? "is-session" : ""} ${!availability.enabled ? "is-unavailable" : ""} ${isSelected ? "is-selected" : ""}"
                type="button"
                data-calendar-date="${dateString}"
            >
                <span class="calendar-day__number">${currentDate.getDate()}</span>
                <div class="calendar-day__meta">
                    ${sessions.length ? `<span class="calendar-chip calendar-chip--session">${sessions.length} ensaio${sessions.length > 1 ? "s" : ""}</span>` : ""}
                    ${availability.enabled
                        ? `<span class="calendar-chip calendar-chip--available">${availability.availableSlots.length} horário${availability.availableSlots.length !== 1 ? "s" : ""}</span>`
                        : `<span class="calendar-chip">${weekdayNames[currentDate.getDay()].slice(0, 3)} bloqueado</span>`
                    }
                </div>
                ${sessions.length ? `
                    <div class="calendar-day__sessions">
                        ${visibleSessions.map((session) => `<span class="calendar-day__session-time">${session.time} · ${session.client}</span>`).join("")}
                        ${sessions.length > visibleSessions.length ? `<span class="calendar-day__session-time">+${sessions.length - visibleSessions.length} ensaio${sessions.length - visibleSessions.length > 1 ? "s" : ""}</span>` : ""}
                    </div>
                ` : ""}
            </button>
        `);
    }

    calendarRoot.innerHTML = calendarDays.join("");

    calendarRoot.querySelectorAll("[data-calendar-date]").forEach((button) => {
        button.addEventListener("click", () => {
            state.selectedAgendaDate = button.dataset.calendarDate;
            renderAgenda();
        });
    });
}

function renderSelectedDateAvailability() {
    const label = document.getElementById("selectedDateLabel");
    const status = document.getElementById("selectedDateStatus");
    const slotsRoot = document.getElementById("clientAvailabilitySlots");
    const sessionsRoot = document.getElementById("selectedDateSessions");
    if (!label || !status || !slotsRoot || !sessionsRoot) {
        return;
    }

    const dateString = state.selectedAgendaDate;
    const sessions = getSortedSessionsForDate(dateString);
    const availability = getAvailabilityForDate(dateString);
    label.textContent = formatDateLabel(dateString);

    sessionsRoot.innerHTML = sessions.length
        ? sessions.map((session) => `
            <div class="session-summary-card">
                <strong>${session.title}</strong>
                <div class="client-meta">${session.time} · ${session.client}</div>
                <div class="client-meta">${session.location || "Local não informado"} · ${session.status}</div>
            </div>
        `).join("")
        : `<span class="slot-chip is-disabled">Nenhum ensaio marcado para este dia</span>`;

    if (!availability.enabled) {
        status.textContent = "Este dia está fechado na agenda do fotógrafo.";
        slotsRoot.innerHTML = `<span class="slot-chip is-disabled">Sem disponibilidade</span>`;
        return;
    }

    if (availability.availableSlots.length === 0) {
        status.textContent = sessions.length
            ? "Todos os horários de trabalho deste dia já estão ocupados."
            : "Nenhum horário foi liberado pelo fotógrafo para esta data.";
    } else {
        status.textContent = sessions.length
            ? "Horários disponíveis já descontam os ensaios agendados."
            : "Dia disponível para novos agendamentos.";
    }

    const availableMarkup = availability.availableSlots.map((slot) => `<span class="slot-chip is-active">${slot}</span>`);
    const bookedMarkup = availability.bookedSlots.map((slot) => `<span class="slot-chip is-booked">${slot}</span>`);
    slotsRoot.innerHTML = [...availableMarkup, ...bookedMarkup].join("") || `<span class="slot-chip is-disabled">Sem horários livres</span>`;
}

function setupAgendaNavigation() {
    const prevButton = document.getElementById("prevMonthBtn");
    const nextButton = document.getElementById("nextMonthBtn");
    if (!prevButton || !nextButton) {
        return;
    }

    prevButton.addEventListener("click", () => {
        state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
        renderAgenda();
    });

    nextButton.addEventListener("click", () => {
        state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
        renderAgenda();
    });
}

function renderAgenda() {
    const calendarRoot = document.getElementById("agendaCalendar");
    const settingsRoot = document.getElementById("weekdaySettings");
    if (!calendarRoot) {
        return;
    }

    if (!state.selectedAgendaDate) {
        state.selectedAgendaDate = new Date().toISOString().split("T")[0];
    }

    state.availability = normalizeAvailability(state.availability);
    writeStorage(STORAGE_KEYS.availability, state.availability);

    renderAgendaControls();
    renderAgendaCalendar();
    renderSelectedDateAvailability();

    if (calendarRoot.innerHTML.trim() === "") {
        calendarRoot.innerHTML = `<div class="stack-item"><strong>Calendário indisponível</strong><div class="stack-item__meta">Recarregue a página para aplicar a configuração padrão.</div></div>`;
    }

    if (settingsRoot && settingsRoot.innerHTML.trim() === "") {
        settingsRoot.innerHTML = `<div class="stack-item"><strong>Configurações indisponíveis</strong><div class="stack-item__meta">A agenda foi reinicializada com a configuração padrão.</div></div>`;
    }
}

function renderClientContracts() {
    const title = document.getElementById("clientContractsTitle");
    const subtitle = document.getElementById("clientContractsSubtitle");
    const badge = document.getElementById("contractStatusBadge");
    const card = document.getElementById("contractCard");
    if (!title || !subtitle || !badge || !card) {
        return;
    }

    const client = getCurrentClient();
    const contract = getCurrentClientContract();
    if (!client || !contract) {
        title.textContent = "Meus Contratos";
        subtitle.textContent = "Faça login pelo link compartilhado para acessar o contrato do seu ensaio.";
        badge.textContent = "Sem acesso";
        card.innerHTML = `<div class="stack-item"><strong>Nenhum contrato disponível</strong><div class="stack-item__meta">Entre com uma conta de cliente para visualizar e assinar.</div></div>`;
        return;
    }

    title.textContent = `Meus Contratos | ${contract.photographerName}`;
    subtitle.textContent = `Acompanhe assinatura, status e dados do seu atendimento com ${contract.photographerName}.`;
    badge.textContent = contract.status;
    card.innerHTML = `
        <div class="stack-item">
            <strong>${contract.title}</strong>
            <div class="stack-item__meta">Fotógrafo: ${contract.photographerName}</div>
            <div class="stack-item__meta">Cliente: ${contract.clientName}</div>
            <div class="stack-item__meta">Origem do acesso: ${contract.shareCode}</div>
            <div class="stack-item__meta">Status atual: ${contract.status}</div>
            ${contract.signedAt ? `<div class="stack-item__meta">Assinado em ${contract.signedAt}</div>` : `<button class="btn btn-primary" type="button" id="signContractBtn">Assinar contrato</button>`}
        </div>
    `;

    document.getElementById("signContractBtn")?.addEventListener("click", () => {
        contract.status = "Assinado";
        contract.signedAt = new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date());
        writeStorage(STORAGE_KEYS.contracts, state.contracts);
        renderClientContracts();
    });
}

function renderClientSessions() {
    const title = document.getElementById("clientSessionsTitle");
    const subtitle = document.getElementById("clientSessionsSubtitle");
    const gate = document.getElementById("clientSessionsGate");
    if (!title || !subtitle || !gate) {
        return;
    }

    const client = getCurrentClient();
    const contract = getCurrentClientContract();
    if (!client || !contract) {
        gate.innerHTML = `<div class="stack-item"><strong>Acesso indisponível</strong><div class="stack-item__meta">Faça login com uma conta de cliente para visualizar seus ensaios.</div></div>`;
        return;
    }

    title.textContent = `Meus Ensaios | ${contract.photographerName}`;
    subtitle.textContent = `Área vinculada ao fotógrafo ${contract.photographerName}.`;

    if (contract.status !== "Assinado") {
        gate.innerHTML = `
            <div class="stack-item">
                <strong>Assinatura pendente</strong>
                <div class="stack-item__meta">Você precisa assinar o contrato em Meus Contratos antes de acessar os ensaios.</div>
                <a class="btn btn-primary" href="./meus-contratos.html">Ir para Meus Contratos</a>
            </div>
        `;
        return;
    }

    const clientSessions = getCurrentClientSessions();

    gate.innerHTML = clientSessions.length ? `
        <div class="stack-list">
            ${clientSessions.map((session) => `
                <div class="session-item">
                    <div class="session-line">
                        <strong>${session.title}</strong>
                        <span class="badge">${session.status}</span>
                    </div>
                    <div class="client-meta">${session.date} · ${session.time} · ${session.location}</div>
                    <div class="client-meta">Fotógrafo: ${contract.photographerName}</div>
                    <div class="client-meta">Contrato: ${session.contract || "Não vinculado"} · Imagens enviadas: ${session.imageCount || 0}</div>
                </div>
            `).join("")}
        </div>
    ` : `<div class="stack-item"><strong>Nenhum ensaio disponível ainda</strong><div class="stack-item__meta">Assim que o fotógrafo cadastrar ou compartilhar seus ensaios, eles aparecerão aqui.</div></div>`;
}

function renderClientDashboard() {
    const title = document.getElementById("clientDashboardTitle");
    const subtitle = document.getElementById("clientDashboardSubtitle");
    const pendingRoot = document.getElementById("clientPendingList");
    const summaryRoot = document.getElementById("clientSummaryList");
    if (!title || !subtitle || !pendingRoot || !summaryRoot) {
        return;
    }

    const client = getCurrentClient();
    const contract = getCurrentClientContract();
    const photographer = getCurrentClientPhotographer();
    const sessions = getCurrentClientSessions();

    if (!client) {
        title.textContent = "Dashboard do Cliente";
        subtitle.textContent = "Faça login com uma conta de cliente para acompanhar suas pendências.";
        pendingRoot.innerHTML = `<div class="stack-item"><strong>Acesso indisponível</strong><div class="stack-item__meta">Entre com a conta enviada pelo fotógrafo.</div></div>`;
        summaryRoot.innerHTML = "";
        return;
    }

    const photographerLabel = contract?.photographerName || photographer?.publicName || photographer?.fullName || "seu fotógrafo";
    title.textContent = `Olá, ${client.fullName}`;
    subtitle.textContent = `Tudo que ainda depende de você com ${photographerLabel} aparece aqui.`;

    const pendingItems = [];
    if (!contract) {
        pendingItems.push({
            title: "Vínculo do atendimento pendente",
            meta: "Seu acesso ainda não foi conectado a um contrato. Peça um link personalizado ao fotógrafo."
        });
    } else {
        if (contract.status !== "Assinado") {
            pendingItems.push({
                title: "Assinar contrato",
                meta: "Finalize a assinatura para liberar todas as próximas etapas."
            });
        }
        if ((client.accessStage || "").toLowerCase().includes("confirma")) {
            pendingItems.push({
                title: "Confirmação de agendamento",
                meta: "O atendimento ainda está aguardando confirmação de data e horário."
            });
        }
    }

    if (sessions.length === 0) {
        pendingItems.push({
            title: "Aguardando ensaio aparecer na sua área",
            meta: "Assim que o fotógrafo vincular ou cadastrar o ensaio, ele será exibido aqui."
        });
    }

    pendingRoot.innerHTML = pendingItems.length
        ? pendingItems.map((item) => `<div class="stack-item"><strong>${item.title}</strong><div class="stack-item__meta">${item.meta}</div></div>`).join("")
        : `<div class="stack-item"><strong>Nenhuma pendência no momento</strong><div class="stack-item__meta">Seu atendimento está em dia.</div></div>`;

    summaryRoot.innerHTML = `
        <div class="stack-item">
            <strong>Fotógrafo responsável</strong>
            <div class="stack-item__meta">${photographerLabel}${client.photographerHandle ? ` · @${normalizeInstagramHandle(client.photographerHandle)}` : ""}</div>
        </div>
        <div class="stack-item">
            <strong>Status do contrato</strong>
            <div class="stack-item__meta">${contract?.status || "Ainda não vinculado"}</div>
        </div>
        <div class="stack-item">
            <strong>Ensaios vinculados</strong>
            <div class="stack-item__meta">${sessions.length} registro${sessions.length !== 1 ? "s" : ""}</div>
        </div>
    `;
}

function populateSettingsForm(formId, fields) {
    const form = document.getElementById(formId);
    if (!form) {
        return null;
    }
    fields.forEach((field) => {
        const input = form.elements[field];
        if (!input) {
            return;
        }
        if (input.type === "checkbox") {
            input.checked = Boolean(state.settings[field]);
        } else {
            input.value = state.settings[field] ?? "";
        }
    });
    return form;
}

function updateSettingsSummary() {
    const value = document.getElementById("settingsSummaryValue");
    const helper = document.getElementById("settingsSummaryHelper");
    if (!value || !helper) {
        return;
    }
    value.textContent = getPhotographerDisplayName();
    helper.textContent = state.settings.sessionPrice > 0
        ? `${formatCurrency(Number(state.settings.sessionPrice))} por ensaio · média de ${state.settings.monthlyAverageSessions || 0} ensaios/mês.`
        : "Preencha as seções abaixo para personalizar a plataforma.";
}

function setupSettings() {
    const form = document.getElementById("settingsForm");
    const feedback = document.getElementById("settingsSaveFeedback");
    if (!form) {
        return;
    }

    const fields = [
        "professionalName", "studioName", "bio", "instagram", "whatsapp", "website", "city",
        "sessionPrice", "monthlyAverageSessions", "bookingDeposit", "acceptedPayments", "paymentDeadline",
        "publicName", "publicBio", "publicInstagram",
        "watermarkText", "extraPhotoPrice", "galleryExpirationDays",
        "notificationsEmail", "notificationsWhatsapp"
    ];

    fields.forEach((field) => {
        const input = form.elements[field];
        if (!input) {
            return;
        }
        if (input.type === "checkbox") {
            input.checked = Boolean(state.settings[field]);
        } else {
            input.value = state.settings[field] ?? "";
        }
    });

    const getSnapshot = () => JSON.stringify(fields.map((field) => {
        const input = form.elements[field];
        return input?.type === "checkbox" ? Boolean(input.checked) : String(input?.value ?? "");
    }));

    let savedSnapshot = getSnapshot();
    let bypassNavigationWarning = false;

    const confirmDiscardChanges = () => {
        if (bypassNavigationWarning || getSnapshot() === savedSnapshot) {
            return true;
        }
        return window.confirm("Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?");
    };

    window.addEventListener("beforeunload", (event) => {
        if (bypassNavigationWarning || getSnapshot() === savedSnapshot) {
            return;
        }
        event.preventDefault();
        event.returnValue = "";
    });

    document.querySelectorAll("a[href]").forEach((link) => {
        link.addEventListener("click", (event) => {
            if (confirmDiscardChanges()) {
                bypassNavigationWarning = true;
                return;
            }
            event.preventDefault();
        });
    });

    updateSettingsSummary();

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        Object.assign(state.settings, {
            professionalName: form.elements.professionalName.value.trim(),
            studioName: form.elements.studioName.value.trim(),
            bio: form.elements.bio.value.trim(),
            instagram: form.elements.instagram.value.trim(),
            whatsapp: form.elements.whatsapp.value.trim(),
            website: form.elements.website.value.trim(),
            city: form.elements.city.value.trim(),
            sessionPrice: Number(form.elements.sessionPrice.value || 0),
            monthlyAverageSessions: Number(form.elements.monthlyAverageSessions.value || 0),
            bookingDeposit: Number(form.elements.bookingDeposit.value || 0),
            acceptedPayments: form.elements.acceptedPayments.value.trim(),
            paymentDeadline: form.elements.paymentDeadline.value.trim(),
            publicName: form.elements.publicName.value.trim(),
            publicBio: form.elements.publicBio.value.trim(),
            publicInstagram: form.elements.publicInstagram.value.trim(),
            watermarkText: form.elements.watermarkText.value.trim() || "Click Manager",
            extraPhotoPrice: Number(form.elements.extraPhotoPrice.value || 0),
            galleryExpirationDays: Number(form.elements.galleryExpirationDays.value || 30),
            notificationsEmail: form.elements.notificationsEmail.checked,
            notificationsWhatsapp: form.elements.notificationsWhatsapp.checked
        });

        state.profile = {
            sessionPrice: Number(state.settings.sessionPrice || 0),
            monthlyAverageSessions: Number(state.settings.monthlyAverageSessions || 0)
        };

        writeStorage(STORAGE_KEYS.profile, state.profile);
        persistSettings();
        updateSettingsSummary();
        savedSnapshot = getSnapshot();
        feedback.textContent = "Todas as configurações foram salvas.";
        feedback.style.color = "var(--success)";

        renderDashboard();
        renderPortfolio();
        renderGallery();
    });
}

function setupModals() {
    const openButtons = document.querySelectorAll("[data-modal-open]");
    const closeButtons = document.querySelectorAll("[data-modal-close]");

    openButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const modal = document.getElementById(button.dataset.modalOpen);
            modal?.classList.add("is-open");
            modal?.setAttribute("aria-hidden", "false");
        });
    });

    closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const modal = button.closest(".modal");
            modal?.classList.remove("is-open");
            modal?.setAttribute("aria-hidden", "true");
        });
    });
}

function renderClients() {
    const tableBody = document.getElementById("clientTableBody");
    const countBadge = document.getElementById("clientCountBadge");
    if (!tableBody || !countBadge) {
        return;
    }

    countBadge.textContent = `${state.clients.length} clientes`;
    tableBody.innerHTML = state.clients.length ? state.clients.map((client) => `
        <tr>
            <td><strong>${client.name}</strong></td>
            <td>${client.email}</td>
            <td>${client.type}</td>
            <td>${client.status}</td>
            <td>${client.lastSession}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-ghost" type="button" data-edit-client="${client.id}">Editar</button>
                </div>
            </td>
        </tr>
    `).join("") : `<tr><td colspan="6">Nenhum cliente cadastrado. Use o botão "Adicionar cliente" para começar.</td></tr>`;

    tableBody.querySelectorAll("[data-edit-client]").forEach((button) => {
        button.addEventListener("click", () => openClientModal(Number(button.dataset.editClient)));
    });
}

function openClientModal(clientId) {
    const modal = document.getElementById("clientModal");
    const form = document.getElementById("clientForm");
    const title = document.getElementById("clientModalTitle");
    if (!modal || !form || !title) {
        return;
    }

    const client = state.clients.find((item) => item.id === clientId);
    title.textContent = client ? "Editar cliente" : "Novo cliente";
    form.reset();
    form.elements.clientId.value = "";

    if (client) {
        form.elements.clientId.value = client.id;
        form.elements.name.value = client.name;
        form.elements.email.value = client.email;
        form.elements.type.value = client.type;
        form.elements.status.value = client.status;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
}

function setupClientForm() {
    const form = document.getElementById("clientForm");
    if (!form) {
        return;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        const id = Number(form.elements.clientId.value);
        const payload = {
            id: id || Date.now(),
            name: form.elements.name.value.trim(),
            email: form.elements.email.value.trim(),
            type: form.elements.type.value,
            status: form.elements.status.value,
            lastSession: "Novo cadastro"
        };

        if (!payload.name || !payload.email) {
            return;
        }

        if (id) {
            state.clients = state.clients.map((client) => client.id === id ? { ...client, ...payload, lastSession: client.lastSession } : client);
        } else {
            state.clients.unshift(payload);
        }

        writeStorage(STORAGE_KEYS.clients, state.clients);
        renderClients();
        renderDashboard();
        document.getElementById("clientModal")?.classList.remove("is-open");
        form.reset();
    });
}

function renderSessions() {
    const sessionList = document.getElementById("sessionList");
    const startInput = document.getElementById("filterStart");
    const endInput = document.getElementById("filterEnd");
    if (!sessionList) {
        return;
    }

    const start = startInput?.value || "";
    const end = endInput?.value || "";
    const filtered = state.sessions.filter((session) => {
        if (start && session.date < start) {
            return false;
        }
        if (end && session.date > end) {
            return false;
        }
        return true;
    });

    sessionList.innerHTML = filtered.length
        ? filtered.map((session) => `
            <article class="session-item">
                <div class="session-line">
                    <strong>${session.title}</strong>
                    <span class="badge">${session.status}</span>
                </div>
                <div class="client-meta">${session.client} · ${session.date} · ${session.time}</div>
                <div class="client-meta">${session.location}</div>
                <div class="client-meta">Contrato: ${session.contract || "Não vinculado"} · Valor: ${formatCurrency(getSessionPrice(session))}</div>
                <div class="client-meta">Pagamento: ${session.paymentStatus || "Pendente"} · Imagens: ${session.imageCount || 0}</div>
            </article>
        `).join("")
        : `<article class="session-item"><strong>Nenhum ensaio cadastrado</strong><div class="client-meta">Crie seus próximos compromissos para alimentar a agenda.</div></article>`;
}

function setupSessions() {
    const sessionForm = document.getElementById("sessionForm");
    const filters = [document.getElementById("filterStart"), document.getElementById("filterEnd")];

    filters.forEach((filter) => filter?.addEventListener("input", renderSessions));

    if (sessionForm) {
        if (sessionForm.elements.price) {
            sessionForm.elements.price.value = state.profile.sessionPrice || "";
        }

        const updateSessionTimeOptions = () => {
            const timeField = sessionForm.elements.time;
            const dateValue = sessionForm.elements.date.value;
            if (!timeField || !(timeField instanceof HTMLSelectElement)) {
                return;
            }

            const availability = dateValue ? getAvailabilityForDate(dateValue) : { enabled: false, availableSlots: [] };
            const allowedSlots = availability.enabled ? availability.availableSlots : [];
            timeField.innerHTML = allowedSlots.length
                ? ['<option value="">Selecione um horário</option>']
                    .concat(allowedSlots.map((slot) => `<option value="${slot}">${slot}</option>`))
                    .join("")
                : '<option value="">Nenhum horário disponível para esta data</option>';
            timeField.disabled = allowedSlots.length === 0;
        };

        sessionForm.elements.date?.addEventListener("change", updateSessionTimeOptions);
        updateSessionTimeOptions();

        sessionForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const files = Array.from(sessionForm.elements.images.files || []);
            const sessionDate = sessionForm.elements.date.value;
            const sessionTime = sessionForm.elements.time.value;
            const availability = getAvailabilityForDate(sessionDate);

            if (!availability.enabled) {
                alert("Este dia está bloqueado na agenda do fotógrafo.");
                return;
            }

            if (!availability.availableSlots.includes(sessionTime)) {
                alert("O horário selecionado não está disponível para esta data.");
                return;
            }

            const linkedClient = state.users.find((user) =>
                user.role === "client" && user.fullName.toLowerCase() === sessionForm.elements.client.value.trim().toLowerCase()
            );
            const sessionRecord = {
                id: Date.now(),
                title: sessionForm.elements.title.value.trim(),
                client: sessionForm.elements.client.value.trim(),
                clientEmail: linkedClient?.email || "",
                date: sessionDate,
                time: sessionTime,
                location: sessionForm.elements.location.value.trim(),
                contract: sessionForm.elements.contract.value.trim(),
                price: Number(sessionForm.elements.price.value || state.profile.sessionPrice || 0),
                paymentStatus: sessionForm.elements.paymentStatus.value,
                imageCount: files.length,
                imageNames: files.map((file) => file.name),
                status: "Novo"
            };

            state.sessions.unshift(sessionRecord);
            writeStorage(STORAGE_KEYS.sessions, state.sessions);
            upsertClientFromSession(sessionRecord, linkedClient);
            renderSessions();
            renderClients();
            renderDashboard();
            renderAgenda();
            document.getElementById("sessionModal")?.classList.remove("is-open");
            sessionForm.reset();
            updateSessionTimeOptions();
        });
    }
}

async function renderPortfolio() {
    const portfolioGrid = document.getElementById("portfolioGrid");
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightboxImage");
    const emptyState = document.getElementById("portfolioEmptyState");
    const countBadge = document.getElementById("portfolioCountBadge");
    const portfolioTitle = document.querySelector(".portfolio-header__content h1");
    const portfolioBio = document.querySelector(".portfolio-header__content p:not(.eyebrow)");
    const portfolioInstagram = document.querySelector(".instagram-link");
    if (!portfolioGrid || !lightbox || !lightboxImage) {
        return;
    }

    if (portfolioTitle) {
        portfolioTitle.textContent = state.settings.publicName || "Seu Portfólio";
    }
    if (portfolioBio) {
        portfolioBio.textContent = state.settings.publicBio || "Atualize sua bio em Configurações para apresentar melhor seu trabalho.";
    }
    if (portfolioInstagram) {
        const handle = state.settings.publicInstagram || state.settings.instagram || "";
        portfolioInstagram.textContent = handle || "Adicione seu Instagram em Configurações";
        portfolioInstagram.href = handle ? `https://instagram.com/${handle.replace("@", "")}` : "#";
    }

    const records = await getPortfolioRecords();
    countBadge.textContent = `${records.length} imagem${records.length !== 1 ? "ens" : ""}`;
    emptyState.hidden = records.length !== 0;

    portfolioGrid.innerHTML = records.map((photo) => {
        const src = URL.createObjectURL(photo.blob);
        return `
        <article class="portfolio-card" data-preview-image="${src}" data-portfolio-id="${photo.id}" draggable="true">
            <div class="portfolio-card__toolbar">
                <button class="portfolio-card__action" type="button" data-preview-portfolio="${photo.id}" aria-label="Visualizar imagem em tamanho maior">&#x26F6;</button>
                <button class="portfolio-card__action portfolio-card__delete" type="button" data-delete-portfolio="${photo.id}" aria-label="Remover imagem">&times;</button>
            </div>
            <div class="portfolio-card__footer">
                <strong>${photo.name}</strong>
            </div>
            <img src="${src}" alt="${photo.name}" loading="lazy">
        </article>
    `;
    }).join("");

    portfolioGrid.querySelectorAll("[data-preview-image]").forEach((card) => {
        card.addEventListener("click", (event) => {
            if (event.target.closest("button")) {
                return;
            }
            lightboxImage.src = card.dataset.previewImage;
            lightbox.classList.add("is-open");
            lightbox.setAttribute("aria-hidden", "false");
        });

        card.addEventListener("dragstart", () => {
            portfolioDragId = Number(card.dataset.portfolioId);
            card.classList.add("is-dragging");
        });

        card.addEventListener("dragend", () => {
            portfolioDragId = null;
            card.classList.remove("is-dragging");
        });

        card.addEventListener("dragover", (event) => {
            event.preventDefault();
        });

        card.addEventListener("drop", async (event) => {
            event.preventDefault();
            const targetId = Number(card.dataset.portfolioId);
            if (!portfolioDragId || portfolioDragId === targetId) {
                return;
            }
            const reordered = await getPortfolioRecords();
            const fromIndex = reordered.findIndex((item) => item.id === portfolioDragId);
            const toIndex = reordered.findIndex((item) => item.id === targetId);
            const [movedItem] = reordered.splice(fromIndex, 1);
            reordered.splice(toIndex, 0, movedItem);
            reordered.forEach((item, index) => {
                item.order = index + 1;
            });
            await updatePortfolioRecords(reordered);
            renderPortfolio();
        });
    });

    document.querySelectorAll("[data-lightbox-close]").forEach((button) => {
        button.addEventListener("click", () => {
            lightbox.classList.remove("is-open");
            lightbox.setAttribute("aria-hidden", "true");
        });
    });

    portfolioGrid.querySelectorAll("[data-preview-portfolio]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const card = button.closest("[data-preview-image]");
            if (!card) {
                return;
            }
            lightboxImage.src = card.dataset.previewImage;
            lightbox.classList.add("is-open");
            lightbox.setAttribute("aria-hidden", "false");
        });
    });

    portfolioGrid.querySelectorAll("[data-delete-portfolio]").forEach((button) => {
        button.addEventListener("click", async (event) => {
            event.stopPropagation();
            await deletePortfolioRecord(Number(button.dataset.deletePortfolio));
            renderPortfolio();
        });
    });
}

function setupPortfolioManager() {
    const uploadInput = document.getElementById("portfolioUpload");
    const clearButton = document.getElementById("clearPortfolioBtn");
    if (!uploadInput || !clearButton) {
        return;
    }

    uploadInput.addEventListener("change", async () => {
        const files = Array.from(uploadInput.files || []);
        for (const file of files) {
            await savePortfolioFile(file);
        }
        uploadInput.value = "";
        renderPortfolio();
    });

    clearButton.addEventListener("click", async () => {
        await clearPortfolioRecords();
        renderPortfolio();
    });
}

function renderSessionGalleryManager() {
    const sessionSelect = document.getElementById("sessionGallerySelect");
    const shareLinkInput = document.getElementById("sessionGalleryShareLink");
    const shareLinkAnchor = document.getElementById("sessionGalleryShareAnchor");
    const galleryGrid = document.getElementById("sessionGalleryGrid");
    const emptyState = document.getElementById("sessionGalleryEmptyState");
    if (!sessionSelect || !shareLinkInput || !shareLinkAnchor || !galleryGrid || !emptyState) {
        return;
    }

    const currentValue = sessionSelect.value;

    sessionSelect.innerHTML = ['<option value="">Selecione um ensaio</option>']
        .concat(state.sessions.map((session) => `<option value="${session.id}">${session.title} · ${session.client} · ${session.date}</option>`))
        .join("");

    const selectedSessionId = currentValue || state.sessions[0]?.id || "";
    if (selectedSessionId) {
        sessionSelect.value = String(selectedSessionId);
    }

    const items = selectedSessionId ? getSessionGalleryItems(String(selectedSessionId)) : [];
    const shareLink = selectedSessionId ? buildSessionShareLink(selectedSessionId) : "";
    shareLinkInput.value = shareLink;
    shareLinkAnchor.href = shareLink || "#";
    shareLinkAnchor.textContent = shareLink ? "Abrir link da galeria" : "Selecione um ensaio para gerar o link";

    galleryGrid.innerHTML = items.map((item) => `
        <article class="gallery-card">
            <img src="${item.src}" alt="${item.name}" loading="lazy">
            <div class="gallery-card__overlay">
                <div class="watermark">${state.settings.watermarkText || "Click Manager"}</div>
            </div>
            <div class="gallery-card__footer">
                <strong>${item.name}</strong>
                <button class="btn" type="button" data-delete-session-gallery="${selectedSessionId}|${item.id}">Remover</button>
            </div>
        </article>
    `).join("");

    emptyState.hidden = items.length !== 0;

    galleryGrid.querySelectorAll("[data-delete-session-gallery]").forEach((button) => {
        button.addEventListener("click", () => {
            const [sessionId, imageId] = button.dataset.deleteSessionGallery.split("|");
            state.sessionGalleries[sessionId] = getSessionGalleryItems(sessionId).filter((item) => String(item.id) !== imageId);
            persistSessionGalleries();
            renderSessionGalleryManager();
        });
    });
}

function setupSessionGalleryManager() {
    const sessionSelect = document.getElementById("sessionGallerySelect");
    const uploadInput = document.getElementById("sessionGalleryUpload");
    const clearButton = document.getElementById("clearSessionGalleryBtn");
    const copyButton = document.getElementById("copySessionGalleryLinkBtn");
    if (!sessionSelect || !uploadInput || !clearButton || !copyButton) {
        return;
    }

    sessionSelect.addEventListener("change", renderSessionGalleryManager);

    uploadInput.addEventListener("change", async () => {
        const sessionId = sessionSelect.value;
        if (!sessionId) {
            alert("Selecione um ensaio antes de enviar as imagens.");
            uploadInput.value = "";
            return;
        }

        const files = Array.from(uploadInput.files || []);
        const existingItems = getSessionGalleryItems(sessionId);
        for (const file of files) {
            const src = await readFileAsDataUrl(file);
            existingItems.push({
                id: Date.now() + Math.random(),
                name: file.name,
                src
            });
        }
        state.sessionGalleries[sessionId] = existingItems;
        persistSessionGalleries();
        uploadInput.value = "";
        renderSessionGalleryManager();
    });

    clearButton.addEventListener("click", () => {
        const sessionId = sessionSelect.value;
        if (!sessionId) {
            return;
        }
        state.sessionGalleries[sessionId] = [];
        persistSessionGalleries();
        renderSessionGalleryManager();
    });

    copyButton.addEventListener("click", async () => {
        const linkInput = document.getElementById("sessionGalleryShareLink");
        if (!linkInput?.value) {
            return;
        }
        await navigator.clipboard.writeText(linkInput.value);
        copyButton.textContent = "Link copiado";
        window.setTimeout(() => {
            copyButton.textContent = "Copiar link";
        }, 1200);
    });

    renderSessionGalleryManager();
}

function updatePurchaseSummary() {
    const unitPrice = Number(state.settings.extraPhotoPrice || pricePerPhoto);
    const total = state.gallerySelection.size * unitPrice;
    const selectedTotal = document.getElementById("selectedTotal");
    const selectedCount = document.getElementById("selectedCount");
    const checkoutQuantity = document.getElementById("checkoutQuantity");
    const checkoutTotal = document.getElementById("checkoutTotal");

    if (selectedTotal) {
        selectedTotal.textContent = formatCurrency(total);
    }
    if (selectedCount) {
        selectedCount.textContent = `${state.gallerySelection.size} fotos selecionadas`;
    }
    if (checkoutQuantity) {
        checkoutQuantity.textContent = String(state.gallerySelection.size);
    }
    if (checkoutTotal) {
        checkoutTotal.textContent = formatCurrency(total);
    }
}

function renderGallery() {
    const deliveryGrid = document.getElementById("deliveryGrid");
    if (!deliveryGrid) {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session");
    const sessionRecord = sessionId ? state.sessions.find((session) => String(session.id) === sessionId) : null;
    const dynamicPhotos = sessionId
        ? getSessionGalleryItems(sessionId).map((item) => ({
            id: item.id,
            src: item.src,
            title: item.name
        }))
        : [];
    const activePhotos = sessionId ? dynamicPhotos : deliveryPhotos;
    const title = document.querySelector(".delivery-header h1");
    const subtitle = document.querySelector(".delivery-header p");

    if (title && sessionRecord) {
        title.textContent = `Entrega | ${sessionRecord.title}`;
    }
    if (subtitle && sessionRecord) {
        subtitle.textContent = `Selecione suas fotos favoritas do ensaio de ${sessionRecord.client} e finalize a compra das imagens extras.`;
    }

    deliveryGrid.innerHTML = activePhotos.map((photo) => `
        <article class="gallery-card ${state.gallerySelection.has(photo.id) ? "is-selected" : ""}" data-photo-id="${photo.id}">
            <img src="${photo.src}" alt="${photo.title}" loading="lazy">
            <div class="gallery-card__overlay">
                <div class="watermark">${state.settings.watermarkText || "Click Manager"}</div>
            </div>
            <div class="gallery-checkbox" aria-hidden="true"></div>
            <div class="gallery-card__footer">
                <strong>${photo.title}</strong>
                <button class="btn" type="button" data-buy-single="${photo.id}">Comprar individual</button>
            </div>
        </article>
    `).join("") || `<article class="session-summary-card"><strong>Nenhuma imagem enviada</strong><div class="client-meta">O fotógrafo ainda não publicou imagens para este ensaio.</div></article>`;

    deliveryGrid.querySelectorAll(".gallery-card").forEach((card) => {
        card.addEventListener("click", (event) => {
            if (event.target.closest("[data-buy-single]")) {
                return;
            }
            const id = Number(card.dataset.photoId);
            if (state.gallerySelection.has(id)) {
                state.gallerySelection.delete(id);
            } else {
                state.gallerySelection.add(id);
            }
            renderGallery();
            updatePurchaseSummary();
        });
    });

    deliveryGrid.querySelectorAll("[data-buy-single]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const id = Number(button.dataset.buySingle);
            state.gallerySelection = new Set([id]);
            renderGallery();
            updatePurchaseSummary();
            openPurchaseModal();
        });
    });
}

function openPurchaseModal() {
    const modal = document.getElementById("purchaseModal");
    modal?.classList.add("is-open");
    modal?.setAttribute("aria-hidden", "false");
}

function setupPurchaseFlow() {
    const buySelectedBtn = document.getElementById("buySelectedBtn");
    const finalizeBtn = document.getElementById("finalizeBtn");
    const confirmBtn = document.getElementById("confirmPurchaseBtn");
    const feedback = document.getElementById("purchaseFeedback");

    buySelectedBtn?.addEventListener("click", () => {
        if (state.gallerySelection.size === 0) {
            alert("Selecione ao menos uma foto para continuar.");
            return;
        }
        openPurchaseModal();
    });

    finalizeBtn?.addEventListener("click", openPurchaseModal);

    confirmBtn?.addEventListener("click", () => {
        if (state.gallerySelection.size === 0) {
            feedback.textContent = "Nenhuma foto selecionada para compra.";
            feedback.style.color = "var(--danger)";
            return;
        }
        const method = document.getElementById("paymentMethod")?.value || "Pix";
        feedback.style.color = "var(--success)";
        feedback.textContent = `Pagamento simulado com sucesso via ${method}. Pedido enviado para processamento.`;
    });
}

function init() {
    const safeRun = (callback) => {
        try {
            callback();
        } catch (error) {
            console.error(error);
        }
    };

    safeRun(setupSidebar);
    safeRun(setupMobileBottomNav);
    safeRun(setupModals);
    safeRun(setupAuth);
    safeRun(setupRegisterWizard);
    safeRun(setupAgendaNavigation);
    safeRun(renderAgenda);
    safeRun(setupSettings);
    safeRun(setupPortfolioManager);
    safeRun(setupSessionGalleryManager);
    safeRun(setupFinancialExport);
    safeRun(renderDashboard);
    safeRun(renderClients);
    safeRun(setupClientForm);
    safeRun(renderSessions);
    safeRun(setupSessions);
    safeRun(() => { void renderPortfolio(); });
    safeRun(renderClientContracts);
    safeRun(renderClientDashboard);
    safeRun(renderClientSessions);
    safeRun(renderGallery);
    safeRun(renderSessionGalleryManager);
    safeRun(updatePurchaseSummary);
    safeRun(setupPurchaseFlow);
}

document.addEventListener("DOMContentLoaded", init);
