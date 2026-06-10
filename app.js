const SUPABASE_URL = "https://zlldjmfzcuawrprsqvmn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGRqbWZ6Y3Vhd3JwcnNxdm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDk5MDUsImV4cCI6MjA5NjU4NTkwNX0.QhUkbTA3q33QiCfywvZ6xbS4ru_InCdYfwZ_be6DSdM";
const TABLE_NAME = "events";

const supabase = window.supabase.createClient(
  "https://zlldjmfzcuawrprsqvmn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGRqbWZ6Y3Vhd3JwcnNxdm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDk5MDUsImV4cCI6MjA5NjU4NTkwNX0.QhUkbTA3q33QiCfywvZ6xbS4ru_InCdYfwZ_be6DSdM"
);

const state = {
  currentWeekStart: startOfWeek(new Date()),
  events: [],
  activeEventId: null,
  realtimeChannel: null,
  theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
};

const els = {
  weekLabel: document.getElementById("weekLabel"),
  weekGrid: document.getElementById("weekGrid"),
  syncStatus: document.getElementById("syncStatus"),
  prevWeekBtn: document.getElementById("prevWeekBtn"),
  nextWeekBtn: document.getElementById("nextWeekBtn"),
  todayBtn: document.getElementById("todayBtn"),
  newEventBtn: document.getElementById("newEventBtn"),
  themeToggle: document.getElementById("themeToggle"),
  modal: document.getElementById("eventModal"),
  form: document.getElementById("eventForm"),
  modalTitle: document.getElementById("modalTitle"),
  eventId: document.getElementById("eventId"),
  titleInput: document.getElementById("titleInput"),
  detailsInput: document.getElementById("detailsInput"),
  startInput: document.getElementById("startInput"),
  endInput: document.getElementById("endInput"),
  colorInput: document.getElementById("colorInput"),
  formError: document.getElementById("formError"),
  deleteBtn: document.getElementById("deleteBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  closeModalBtn: document.getElementById("closeModalBtn")
};

document.documentElement.setAttribute("data-theme", state.theme);

init();

async function init() {
  bindEvents();
  renderWeek();
  await fetchEventsForVisibleWeek();
  setupRealtime();
}

function bindEvents() {
  els.prevWeekBtn.addEventListener("click", async () => {
    state.currentWeekStart = addDays(state.currentWeekStart, -7);
    renderWeek();
    await fetchEventsForVisibleWeek();
  });

  els.nextWeekBtn.addEventListener("click", async () => {
    state.currentWeekStart = addDays(state.currentWeekStart, 7);
    renderWeek();
    await fetchEventsForVisibleWeek();
  });

  els.todayBtn.addEventListener("click", async () => {
    state.currentWeekStart = startOfWeek(new Date());
    renderWeek();
    await fetchEventsForVisibleWeek();
  });

  els.newEventBtn.addEventListener("click", () => {
    openCreateModal();
  });

  els.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
  });

  els.form.addEventListener("submit", handleSaveEvent);
  els.deleteBtn.addEventListener("click", handleDeleteEvent);
  els.cancelBtn.addEventListener("click", closeModal);
  els.closeModalBtn.addEventListener("click", closeModal);

  els.modal.addEventListener("click", (event) => {
    const rect = els.modal.getBoundingClientRect();
    const inDialog =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (!inDialog) {
      closeModal();
    }
  });
}

async function fetchEventsForVisibleWeek() {
  try {
    setStatus("Syncing…");
    const start = new Date(state.currentWeekStart);
    const end = addDays(start, 7);

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString())
      .order("start_at", { ascending: true });

    if (error) throw error;

    state.events = data || [];
    renderWeek();
    setStatus("Live");
  } catch (error) {
    console.error(error);
    setStatus("Sync failed");
  }
}

function setupRealtime() {
  state.realtimeChannel = supabase
    .channel("shared-calendar-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_NAME },
      async () => {
        await fetchEventsForVisibleWeek();
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        setStatus("Live");
      }
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error(status, err);
        setStatus("Realtime error");
      }
    });
}

function renderWeek() {
  const weekStart = state.currentWeekStart;
  const weekEnd = addDays(weekStart, 6);
  els.weekLabel.textContent = `${formatLongDate(weekStart)} – ${formatLongDate(weekEnd)}`;

  const grid = [];
  grid.push(`<div class="time-corner"></div>`);

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const isToday = isSameDay(date, new Date());
    grid.push(`
      <div class="day-header ${isToday ? "today" : ""}">
        <strong>${date.toLocaleDateString([], { weekday: "long" })}</strong>
        <span>${date.toLocaleDateString([], { day: "numeric", month: "short" })}</span>
      </div>
    `);
  }

  for (let hour = 0; hour < 24; hour++) {
    grid.push(`<div class="time-label">${String(hour).padStart(2, "0")}:00</div>`);

    for (let day = 0; day < 7; day++) {
      const slotDate = addDays(weekStart, day);
      grid.push(`
        <div class="day-column"
             data-day-index="${day}"
             data-hour="${hour}"
             data-date="${slotDate.toISOString()}"
             aria-label="${slotDate.toDateString()} ${hour}:00"
             tabindex="0"></div>
      `);
    }
  }

  els.weekGrid.innerHTML = `
    ${grid.join("")}
    <div class="events-layer">${renderEventColumns()}</div>
  `;

  els.weekGrid.querySelectorAll(".day-column").forEach((cell) => {
    cell.addEventListener("dblclick", () => {
      const date = new Date(cell.dataset.date);
      date.setHours(Number(cell.dataset.hour), 0, 0, 0);
      const end = new Date(date);
      end.setHours(end.getHours() + 1);
      openCreateModal(date, end);
    });

    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const date = new Date(cell.dataset.date);
        date.setHours(Number(cell.dataset.hour), 0, 0, 0);
        const end = new Date(date);
        end.setHours(end.getHours() + 1);
        openCreateModal(date, end);
      }
    });
  });

  els.weekGrid.querySelectorAll("[data-open-event]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const eventId = btn.dataset.openEvent;
      const eventRecord = state.events.find((item) => String(item.id) === String(eventId));
      if (eventRecord) openEditModal(eventRecord);
    });
  });
}

function renderEventColumns() {
  const columns = [];
  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const left = `calc(${dayIndex} * ((100% - 72px) / 7))`;
    columns.push(`
      <div class="day-events-column" style="left:${left};">
        ${renderEventsForDay(dayIndex)}
      </div>
    `);
  }
  return columns.join("");
}

function renderEventsForDay(dayIndex) {
  const dayStart = addDays(state.currentWeekStart, dayIndex);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);

  const dayEvents = state.events.filter((event) => {
    const start = new Date(event.start_at);
    return start >= dayStart && start < dayEnd;
  });

  return dayEvents.map((event) => {
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const duration = Math.max(endMinutes - startMinutes, 30);

    const top = `${(startMinutes / 60) * 4}rem`;
    const height = `${Math.max((duration / 60) * 4, 2.75)}rem`;

    return `
      <article class="event-card" style="top:${top};height:${height};background:${escapeHtml(event.color || "#01696f")}">
        <button type="button" data-open-event="${event.id}" aria-label="Edit ${escapeHtml(event.title)}">
          <div class="event-time">${formatTime(start)} – ${formatTime(end)}</div>
          <div class="event-title">${escapeHtml(event.title)}</div>
          ${event.details ? `<div class="event-details">${escapeHtml(event.details)}</div>` : ""}
        </button>
      </article>
    `;
  }).join("");
}

function openCreateModal(startDate = null, endDate = null) {
  state.activeEventId = null;
  els.modalTitle.textContent = "New event";
  els.deleteBtn.classList.add("hidden");
  els.formError.textContent = "";
  els.form.reset();
  els.eventId.value = "";

  const start = startDate || roundToNextHour(new Date());
  const end = endDate || new Date(start.getTime() + 60 * 60 * 1000);

  els.titleInput.value = "";
  els.detailsInput.value = "";
  els.startInput.value = toDateTimeLocalValue(start);
  els.endInput.value = toDateTimeLocalValue(end);
  els.colorInput.value = "#01696f";

  els.modal.showModal();
}

function openEditModal(eventRecord) {
  state.activeEventId = eventRecord.id;
  els.modalTitle.textContent = "Edit event";
  els.deleteBtn.classList.remove("hidden");
  els.formError.textContent = "";

  els.eventId.value = eventRecord.id;
  els.titleInput.value = eventRecord.title || "";
  els.detailsInput.value = eventRecord.details || "";
  els.startInput.value = toDateTimeLocalValue(new Date(eventRecord.start_at));
  els.endInput.value = toDateTimeLocalValue(new Date(eventRecord.end_at));
  els.colorInput.value = eventRecord.color || "#01696f";

  els.modal.showModal();
}

function closeModal() {
  els.modal.close();
}

async function handleSaveEvent(event) {
  event.preventDefault();
  els.formError.textContent = "";

  const payload = {
    title: els.titleInput.value.trim(),
    details: els.detailsInput.value.trim(),
    start_at: new Date(els.startInput.value).toISOString(),
    end_at: new Date(els.endInput.value).toISOString(),
    color: els.colorInput.value
  };

  if (!payload.title) {
    els.formError.textContent = "Title is required.";
    return;
  }

  if (new Date(payload.end_at) <= new Date(payload.start_at)) {
    els.formError.textContent = "End time must be after start time.";
    return;
  }

  try {
    setStatus("Saving…");

    if (state.activeEventId) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update(payload)
        .eq("id", state.activeEventId);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from(TABLE_NAME)
        .insert(payload);

      if (error) throw error;
    }

    closeModal();
    await fetchEventsForVisibleWeek();
    setStatus("Live");
  } catch (error) {
    console.error(error);
    els.formError.textContent = error.message || "Could not save event.";
    setStatus("Save failed");
  }
}

async function handleDeleteEvent() {
  if (!state.activeEventId) return;

  const confirmed = window.confirm("Delete this event?");
  if (!confirmed) return;

  try {
    setStatus("Deleting…");

    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq("id", state.activeEventId);

    if (error) throw error;

    closeModal();
    await fetchEventsForVisibleWeek();
    setStatus("Live");
  } catch (error) {
    console.error(error);
    els.formError.textContent = error.message || "Could not delete event.";
    setStatus("Delete failed");
  }
}

function setStatus(text) {
  els.syncStatus.textContent = text;
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function roundToNextHour(date) {
  const copy = new Date(date);
  copy.setMinutes(0, 0, 0);
  copy.setHours(copy.getHours() + 1);
  return copy;
}

function formatLongDate(date) {
  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toDateTimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', """)
    .replaceAll("'", "&#039;");
}
