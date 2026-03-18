(() => {
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

    const STORAGE_KEYS = {
        profile: "click_manager_profile",
        settings: "click_manager_settings",
        users: "click_manager_users",
        contracts: "click_manager_contracts"
    };

    const params = new URLSearchParams(window.location.search);
    const inviteFromPhotographer = ["client", "1", "true", "photographer"].includes((params.get("role") || params.get("client") || params.get("invite") || params.get("source") || "").toLowerCase());
    const incomingAccessStage = (params.get("stage") || params.get("access") || "").trim();
    const incomingPhotographerHandle = (params.get("photographer") || params.get("handle") || params.get("user") || "").trim();

    const readStorage = (key, fallback) => {
        try {
            const raw = window.localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    };

    const writeStorage = (key, value) => {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // Ignora falha local de storage.
        }
    };

    const state = {
        users: readStorage(STORAGE_KEYS.users, []),
        contracts: readStorage(STORAGE_KEYS.contracts, []),
        profile: readStorage(STORAGE_KEYS.profile, {
            sessionPrice: 0,
            monthlyAverageSessions: 0
        }),
        settings: readStorage(STORAGE_KEYS.settings, {})
    };

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
                : { value: "client", title: "Sou cliente", description: "Quero acompanhar ensaio, contrato e galeria.", icon: "bi-person-badge-fill" }
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
        { name: "photographerHandle", group: "Referência", title: "Qual é o @ do fotógrafo responsável pelo seu ensaio?", hint: "Use o @ do perfil do fotógrafo. Se o link já veio personalizado, isso pode vir preenchido.", type: "text", placeholder: "@helenaduarte" },
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
            accessStage: incomingAccessStage,
            photographerHandle: incomingPhotographerHandle
        },
        index: 0
    };

    function getSteps() {
        const resolvedRole = wizardState.values.role || (inviteFromPhotographer ? "client" : "photographer");
        if (resolvedRole === "client") {
            const steps = incomingAccessStage ? clientSteps.filter((step) => step.name !== "accessStage") : clientSteps;
            return [roleStep].concat(steps);
        }
        return [roleStep].concat(photographerSteps);
    }

    function getCurrentStep() {
        return getSteps()[wizardState.index];
    }

    function renderChoiceStep(step) {
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
                if (step.name === "role") {
                    wizardState.index = 0;
                }
                renderStep();
            });
        });
    }

    function renderStep() {
        const steps = getSteps();
        if (wizardState.index >= steps.length) {
            wizardState.index = steps.length - 1;
        }

        const step = getCurrentStep();
        questionGroup.textContent = step.group;
        questionTitle.textContent = step.title;
        questionHint.textContent = step.hint || "";

        if (step.type === "choice") {
            renderChoiceStep(step);
        } else if (step.type === "select") {
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
        } else {
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

            const currentInput = inputRoot.querySelector(`[name="${step.name}"]`);
            currentInput?.addEventListener("keydown", (event) => {
                if (event.key !== "Enter") {
                    return;
                }
                event.preventDefault();
                if (!validateCurrentStep()) {
                    return;
                }
                if (wizardState.index === total - 1) {
                    submitButton.click();
                    return;
                }
                wizardState.index += 1;
                renderStep();
            });
        }

        const total = steps.length;
        const current = wizardState.index + 1;
        progressBar.style.width = `${(current / total) * 100}%`;
        stepLabel.textContent = `Etapa ${current}`;
        stepCounter.textContent = `${current} / ${total}`;
        feedback.textContent = "";
        prevButton.hidden = wizardState.index === 0;
        const isLastStep = wizardState.index === total - 1;
        nextButton.hidden = isLastStep;
        submitButton.hidden = !isLastStep;
    }

    function validateCurrentStep() {
        const step = getCurrentStep();
        if (step.type === "choice") {
            if (!wizardState.values[step.name]) {
                feedback.textContent = step.name === "role"
                    ? "Escolha seu perfil para continuar."
                    : "Escolha uma opção para continuar.";
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

    function registerUser(payload) {
        const role = payload.role;
        const fullName = (payload.fullName || "").trim();
        const email = (payload.email || "").trim();
        const password = (payload.password || "").trim();

        if (!fullName || !email || !password || password.length < 6 || !email.includes("@")) {
            return { ok: false, message: "Verifique nome, e-mail e senha. A senha precisa ter pelo menos 6 caracteres.", color: "var(--danger)" };
        }

        if (state.users.some((item) => item.email === email)) {
            return { ok: false, message: "Já existe uma conta com este e-mail.", color: "var(--danger)" };
        }

        if (role === "photographer") {
            const sessionPrice = Number(payload.sessionPrice || 0);
            const monthlyAverageSessions = Number(payload.monthlyAverageSessions || 0);
            if (sessionPrice <= 0 || monthlyAverageSessions <= 0) {
                return { ok: false, message: "Informe valor do ensaio e média mensal para configurar o painel.", color: "var(--danger)" };
            }

            state.profile = { sessionPrice, monthlyAverageSessions };
            writeStorage(STORAGE_KEYS.profile, state.profile);
            state.settings = {
                ...state.settings,
                professionalName: fullName,
                publicName: (payload.publicName || "").trim() || fullName,
                city: (payload.city || "").trim() || state.settings.city,
                instagram: (payload.instagram || "").trim() || state.settings.instagram,
                sessionPrice,
                monthlyAverageSessions
            };
            writeStorage(STORAGE_KEYS.settings, state.settings);
        }

        const newUser = {
            id: Date.now(),
            role,
            fullName,
            email,
            password,
            photographerName: (payload.photographerName || payload.photographerHandle || "").trim(),
            photographerHandle: (payload.photographerHandle || "").trim(),
            shareCode: (payload.shareCode || "").trim(),
            publicName: (payload.publicName || "").trim(),
            city: (payload.city || "").trim(),
            instagram: (payload.instagram || "").trim(),
            specialty: (payload.specialty || "").trim(),
            accessStage: (payload.accessStage || "").trim(),
            shootType: (payload.shootType || "").trim(),
            preferredDate: (payload.preferredDate || "").trim(),
            whatsapp: (payload.whatsapp || "").trim()
        };
        state.users.push(newUser);
        writeStorage(STORAGE_KEYS.users, state.users);

        if (role === "client") {
            const contract = {
                id: `CTR-${Date.now()}`,
                clientEmail: email,
                clientName: fullName,
                photographerName: newUser.photographerHandle || newUser.photographerName || "Fotógrafo responsável",
                shareCode: newUser.shareCode || newUser.accessStage || newUser.shootType || "Solicitação direta",
                status: "Pendente",
                signedAt: null,
                title: newUser.accessStage
                    ? `Fluxo do cliente: ${newUser.accessStage.toLowerCase()}`
                    : newUser.shootType
                        ? `Contrato para ${newUser.shootType.toLowerCase()}`
                        : "Contrato de prestação de serviço fotográfico"
            };
            state.contracts.push(contract);
            writeStorage(STORAGE_KEYS.contracts, state.contracts);
            return { ok: true, message: "Cadastro do cliente concluído. Faça login para continuar.", color: "var(--success)" };
        }

        return { ok: true, message: "Cadastro criado com sucesso. Faça login para acessar o painel.", color: "var(--success)" };
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

        const result = registerUser(wizardState.values);
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
})();
