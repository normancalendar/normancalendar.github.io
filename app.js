const SUPABASE_URL = "https://zlldjmfzcuawrprsqvmn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGRqbWZ6Y3Vhd3JwcnNxdm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDk5MDUsImV4cCI6MjA5NjU4NTkwNX0.QhUkbTA3q33QiCfywvZ6xbS4ru_InCdYfwZ_be6DSdM";

const supabase = window.supabase.createClient(
  https://zlldjmfzcuawrprsqvmn.supabase.co,
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGRqbWZ6Y3Vhd3JwcnNxdm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDk5MDUsImV4cCI6MjA5NjU4NTkwNX0.QhUkbTA3q33QiCfywvZ6xbS4ru_InCdYfwZ_be6DSdM
);

// 🔥 IMPORTANT: set this
const CALENDAR_ID = "12db36a9-ea06-4b2e-adb3-fc04541d3d35";

const state = {
  currentDate: new Date(),
  events: []
};

const els = {
  newEventBtn: document.getElementById("newEventBtn"),
  calendarHeader: document.getElementById("calendarHeader"),
  calendarGrid: document.getElementById("calendarGrid"),
  currentLabel: document.getElementById("currentLabel"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  todayBtn: document.getElementById("todayBtn"),

  eventModal: document.getElementById("eventModal"),
  closeModalBtn: document.getElementById("closeModalBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  deleteBtn: document.getElementById("deleteBtn"),

  eventForm: document.getElementById("eventForm"),
  eventId: document.getElementById("eventId"),
  titleInput: document.getElementById("titleInput"),
  descriptionInput: document.getElementById("descriptionInput"),
  startInput: document.getElementById("startInput"),
  endInput: document.getElementById("endInput")
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ---------- DATE HELPERS ---------- */

function formatMonthLabel(date) {
  return date.toLocaleDateString([], {
    month: "long",
    year: "numeric"
  });
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getMonthGrid(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  const days = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  return days;
}

/* ---------- LOAD EVENTS ---------- */

async function loadEvents() {
  const start = new Date(
    state.currentDate.getFullYear(),
    state.currentDate.getMonth(),
    1
  );

  const end = new Date(
    state.currentDate.getFullYear(),
    state.currentDate.getMonth() + 1,
    1
  );

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("calendar_id", CALENDAR_ID)
    .gte("start_at", start.toISOString())
    .lt("start_at", end.toISOString())
    .order("start_at", { ascending: true });

  if (error) {
    alert(error.message);
    return;
  }

  state.events = data || [];
}

/* ---------- RENDER ---------- */

function renderHeader() {
  els.calendarHeader.innerHTML = weekDays
    .map(d => `<div>${d}</div>`)
    .join("");
}

function eventsForDay(day) {
  return state.events.filter(event =>
    sameDay(new Date(event.start_at), day)
  );
}

function renderCalendar() {
  els.currentLabel.textContent = formatMonthLabel(state.currentDate);

  const month = state.currentDate.getMonth();
  const today = new Date();
  const days = getMonthGrid(state.currentDate);

  els.calendarGrid.innerHTML = days
    .map(day => {
      const isOther = day.getMonth() !== month;
      const isToday = sameDay(day, today);
      const events = eventsForDay(day);

      return `
        <div class="day-cell ${isOther ? "other-month" : ""} ${isToday ? "today" : ""}" data-date="${day.toISOString()}">
          <div class="day-number">${day.getDate()}</div>

          ${events.map(e => `
            <div class="event-chip" data-id="${e.id}">
              ${e.title}
            </div>
          `).join("")}
        </div>
      `;
    })
    .join("");

  attachCalendarEvents();
}

/* ---------- INTERACTIONS ---------- */

function attachCalendarEvents() {
  document.querySelectorAll(".day-cell").forEach(cell => {
    cell.addEventListener("click", () => {
      openNewEvent(cell.dataset.date);
    });
  });

  document.querySelectorAll(".event-chip").forEach(chip => {
    chip.addEventListener("click", e => {
      e.stopPropagation();
      const id = chip.dataset.id;
      const event = state.events.find(ev => ev.id === id);
      if (event) openEditEvent(event);
    });
  });
}

/* ---------- MODAL ---------- */

function openModal() {
  els.eventModal.classList.remove("hidden");
}

function closeModal() {
  els.eventModal.classList.add("hidden");
  els.eventForm.reset();
  els.eventId.value = "";
}

function openNewEvent(dateISO) {
  const start = new Date(dateISO);
  start.setHours(9, 0);

  const end = new Date(dateISO);
  end.setHours(10, 0);

  els.eventId.value = "";
  els.titleInput.value = "";
  els.descriptionInput.value = "";
  els.startInput.value = start.toISOString().slice(0, 16);
  els.endInput.value = end.toISOString().slice(0, 16);

  els.deleteBtn.classList.add("hidden");
  openModal();
}

function openEditEvent(event) {
  els.eventId.value = event.id;
  els.titleInput.value = event.title;
  els.descriptionInput.value = event.description || "";
  els.startInput.value = event.start_at.slice(0, 16);
  els.endInput.value = event.end_at.slice(0, 16);

  els.deleteBtn.classList.remove("hidden");
  openModal();
}

/* ---------- CRUD ---------- */

async function saveEvent(e) {
  e.preventDefault();

  const payload = {
    calendar_id: CALENDAR_ID,
    title: els.titleInput.value.trim(),
    description: els.descriptionInput.value.trim(),
    start_at: new Date(els.startInput.value).toISOString(),
    end_at: new Date(els.endInput.value).toISOString()
  };

  let res;

  if (els.eventId.value) {
    res = await supabase
      .from("events")
      .update(payload)
      .eq("id", els.eventId.value);
  } else {
    res = await supabase.from("events").insert(payload);
  }

  if (res.error) return alert(res.error.message);

  closeModal();
  await loadEvents();
  renderCalendar();
}

async function deleteEvent() {
  const id = els.eventId.value;
  if (!id) return;

  await supabase.from("events").delete().eq("id", id);

  closeModal();
  await loadEvents();
  renderCalendar();
}

/* ---------- UI EVENTS ---------- */

function attachEvents() {
  els.newEventBtn.addEventListener("click", () => {
    const now = new Date();
    openNewEvent(now.toISOString());
  });

  els.prevBtn.addEventListener("click", async () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    await loadEvents();
    renderCalendar();
  });

  els.nextBtn.addEventListener("click", async () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    await loadEvents();
    renderCalendar();
  });

  els.todayBtn.addEventListener("click", async () => {
    state.currentDate = new Date();
    await loadEvents();
    renderCalendar();
  });

  els.closeModalBtn.addEventListener("click", closeModal);
  els.cancelBtn.addEventListener("click", closeModal);
  els.deleteBtn.addEventListener("click", deleteEvent);
  els.eventForm.addEventListener("submit", saveEvent);
}

/* ---------- INIT ---------- */

async function init() {
  renderHeader();
  attachEvents();
  await loadEvents();
  renderCalendar();
}

init();
