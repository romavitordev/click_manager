(function () {
    const body = document.body;
    const page = body?.dataset.page || "";
    const storageKeys = {
        availability: "click_manager_availability",
        currentUser: "click_manager_current_user"
    };
    const weekdayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const shortWeekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const defaultSlots = ["09:00", "11:30", "15:00", "17:00"];

    function createDefaultAvailability() {
        return {
            0: { enabled: false, slots: [] },
            1: { enabled: true, slots: ["09:00", "11:30", "15:00", "17:00"] },
            2: { enabled: true, slots: ["09:00", "11:30", "15:00", "17:00"] },
            3: { enabled: true, slots: ["09:00", "11:30", "15:00", "17:00"] },
            4: { enabled: true, slots: ["09:00", "11:30", "15:00", "17:00"] },
            5: { enabled: false, slots: ["09:00", "11:30"] },
            6: { enabled: false, slots: [] }
        };
    }

    function loadAvailability() {
        try {
            const parsed = JSON.parse(window.localStorage.getItem(storageKeys.availability) || "null");
            return normalizeAvailability(parsed);
        } catch {
            return createDefaultAvailability();
        }
    }

    function normalizeAvailability(raw) {
        const fallback = createDefaultAvailability();
        const normalized = {};
        for (let weekday = 0; weekday < 7; weekday += 1) {
            const item = raw?.[weekday] ?? fallback[weekday];
            normalized[weekday] = {
                enabled: Boolean(item?.enabled),
                slots: Array.isArray(item?.slots) ? item.slots.filter((slot) => defaultSlots.includes(slot)) : [...fallback[weekday].slots]
            };
        }
        return normalized;
    }

    function saveAvailability(availability) {
        window.localStorage.setItem(storageKeys.availability, JSON.stringify(availability));
    }

    function setupLogout() {
        document.querySelectorAll("[data-logout]").forEach((button) => {
            button.addEventListener("click", () => {
                window.localStorage.removeItem(storageKeys.currentUser);
                window.location.href = "../index.html";
            });
        });
    }

    function setupEnsaiosFallback() {
        if (page !== "ensaios") {
            return;
        }

        const openButton = document.querySelector('[data-modal-open="sessionModal"]');
        const modal = document.getElementById("sessionModal");
        if (!openButton || !modal) {
            return;
        }

        openButton.addEventListener("click", () => {
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
        });

        modal.querySelectorAll("[data-modal-close]").forEach((button) => {
            button.addEventListener("click", () => {
                modal.classList.remove("is-open");
                modal.setAttribute("aria-hidden", "true");
            });
        });
    }

    function setupAgendaFallback() {
        if (page !== "agenda") {
            return;
        }

        const calendarRoot = document.getElementById("agendaCalendar");
        const settingsRoot = document.getElementById("weekdaySettings");
        const monthLabel = document.getElementById("calendarMonthLabel");
        const prevButton = document.getElementById("prevMonthBtn");
        const nextButton = document.getElementById("nextMonthBtn");
        const selectedDateLabel = document.getElementById("selectedDateLabel");
        const selectedDateStatus = document.getElementById("selectedDateStatus");
        const slotsRoot = document.getElementById("clientAvailabilitySlots");

        if (!calendarRoot || !settingsRoot || !monthLabel || !prevButton || !nextButton || !selectedDateLabel || !selectedDateStatus || !slotsRoot) {
            return;
        }

        const state = {
            availability: loadAvailability(),
            calendarDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            selectedDate: new Date().toISOString().split("T")[0]
        };

        function getAvailabilityForDate(dateString) {
            const date = new Date(dateString + "T12:00:00");
            const weekday = date.getDay();
            const config = state.availability[weekday];
            if (!config.enabled) {
                return { enabled: false, slots: [] };
            }
            return { enabled: true, slots: config.slots };
        }

        function renderSettings() {
            settingsRoot.classList.add("is-ready");
            settingsRoot.innerHTML = weekdayNames.map((name, weekday) => {
                const config = state.availability[weekday];
                return `
                    <div class="weekday-card">
                        <div class="weekday-card__top">
                            <div>
                                <strong>${name}</strong>
                                <div class="client-meta">${config.enabled ? "Disponível para agendamento" : "Fora da agenda"}</div>
                            </div>
                            <label class="switch">
                                <input type="checkbox" data-weekday="${weekday}" ${config.enabled ? "checked" : ""}>
                                <span></span>
                            </label>
                        </div>
                        <div class="slot-chips">
                            ${defaultSlots.map((slot) => `
                                <button class="slot-chip ${config.slots.includes(slot) ? "is-active" : ""}" type="button" data-slot="${weekday}|${slot}">
                                    ${slot}
                                </button>
                            `).join("")}
                        </div>
                    </div>
                `;
            }).join("");

            settingsRoot.querySelectorAll("[data-weekday]").forEach((input) => {
                input.addEventListener("change", () => {
                    const weekday = Number(input.dataset.weekday);
                    state.availability[weekday].enabled = input.checked;
                    saveAvailability(state.availability);
                    renderAll();
                });
            });

            settingsRoot.querySelectorAll("[data-slot]").forEach((button) => {
                button.addEventListener("click", () => {
                    const [weekdayRaw, slot] = button.dataset.slot.split("|");
                    const weekday = Number(weekdayRaw);
                    const slots = state.availability[weekday].slots;
                    const index = slots.indexOf(slot);
                    if (index >= 0) {
                        slots.splice(index, 1);
                    } else {
                        slots.push(slot);
                        slots.sort();
                    }
                    saveAvailability(state.availability);
                    renderAll();
                });
            });
        }

        function renderCalendar() {
            calendarRoot.classList.add("is-ready");
            monthLabel.textContent = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(state.calendarDate);

            const year = state.calendarDate.getFullYear();
            const month = state.calendarDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const offset = firstDay.getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const prevDays = new Date(year, month, 0).getDate();
            const items = [];

            for (let index = 0; index < 42; index += 1) {
                const dayNumber = index - offset + 1;
                let date;
                let outside = false;

                if (dayNumber <= 0) {
                    date = new Date(year, month - 1, prevDays + dayNumber);
                    outside = true;
                } else if (dayNumber > daysInMonth) {
                    date = new Date(year, month + 1, dayNumber - daysInMonth);
                    outside = true;
                } else {
                    date = new Date(year, month, dayNumber);
                }

                const iso = date.toISOString().split("T")[0];
                const availability = getAvailabilityForDate(iso);
                items.push(`
                    <button
                        class="calendar-day ${outside ? "is-outside" : ""} ${availability.enabled ? "" : "is-unavailable"} ${state.selectedDate === iso ? "is-selected" : ""}"
                        type="button"
                        data-date="${iso}"
                    >
                        <span class="calendar-day__number">${date.getDate()}</span>
                        <div class="calendar-day__meta">
                            ${availability.enabled
                                ? `<span class="calendar-chip calendar-chip--available">${availability.slots.length} horário${availability.slots.length !== 1 ? "s" : ""}</span>`
                                : `<span class="calendar-chip">${shortWeekdays[date.getDay()]} bloqueado</span>`
                            }
                        </div>
                    </button>
                `);
            }

            calendarRoot.innerHTML = items.join("");
            calendarRoot.querySelectorAll("[data-date]").forEach((button) => {
                button.addEventListener("click", () => {
                    state.selectedDate = button.dataset.date;
                    renderAll();
                });
            });
        }

        function renderSelectedDate() {
            const availability = getAvailabilityForDate(state.selectedDate);
            const date = new Date(state.selectedDate + "T12:00:00");
            selectedDateLabel.textContent = new Intl.DateTimeFormat("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric"
            }).format(date);

            if (!availability.enabled) {
                selectedDateStatus.textContent = "Este dia está fechado para agendamento.";
                slotsRoot.innerHTML = '<span class="slot-chip is-disabled">Sem horários disponíveis</span>';
                return;
            }

            selectedDateStatus.textContent = "Esses são os horários liberados atualmente para os clientes.";
            slotsRoot.innerHTML = availability.slots.length
                ? availability.slots.map((slot) => `<span class="slot-chip is-active">${slot}</span>`).join("")
                : '<span class="slot-chip is-disabled">Nenhum horário liberado</span>';
        }

        function renderAll() {
            renderSettings();
            renderCalendar();
            renderSelectedDate();
        }

        prevButton.addEventListener("click", () => {
            state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
            renderCalendar();
        });

        nextButton.addEventListener("click", () => {
            state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
            renderCalendar();
        });

        renderAll();
    }

    document.addEventListener("DOMContentLoaded", () => {
        setupLogout();
        setupEnsaiosFallback();
        setupAgendaFallback();
    });
})();
