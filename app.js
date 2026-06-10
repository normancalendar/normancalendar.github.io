const SUPABASE_URL = "https://zlldjmfzcuawrprsqvmn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGRqbWZ6Y3Vhd3JwcnNxdm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDk5MDUsImV4cCI6MjA5NjU4NTkwNX0.QhUkbTA3q33QiCfywvZ6xbS4ru_InCdYfwZ_be6DSdM";
const TABLE_NAME = "events";

const supabaseClient = window.supabase.createClient(
  "https://zlldjmfzcuawrprsqvmn.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsbGRqbWZ6Y3Vhd3JwcnNxdm1uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDk5MDUsImV4cCI6MjA5NjU4NTkwNX0.QhUkbTA3q33QiCfywvZ6xbS4ru_InCdYfwZ_be6DSdM"
);

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function countEventsInWeek(startDate) {
  const start = new Date(startDate);
  const end = addDays(start, 7);

  return state.events.filter(e => {
    const eventDate = new Date(e.start_at);
    return eventDate >= start && eventDate < end;
  }).length;
}

function updateWeekBadges() {
  const prevWeek = addDays(state.currentWeekStart, -7);
  const nextWeek = addDays(state.currentWeekStart, 7);

  const prevCount = countEventsInWeek(prevWeek);
  const nextCount = countEventsInWeek(nextWeek);

  const prevBadge = document.getElementById("prevBadge");
  const nextBadge = document.getElementById("nextBadge");

  prevBadge.textContent = prevCount > 0 ? prevCount : "";
  nextBadge.textContent = nextCount > 0 ? nextCount : "";
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ===== STATE =====

const state = {
  currentWeekStart: startOfWeek(new Date()),
  events: [],
  realtimeChannel: null
};

// ===== ELEMENTS =====

const els = {
  weekLabel: document.getElementById("weekLabel"),
  weekGrid: document.getElementById("weekGrid"),
  syncStatus: document.getElementById("syncStatus"),
  prevWeekBtn: document.getElementById("prevWeekBtn"),
  nextWeekBtn: document.getElementById("nextWeekBtn"),
  todayBtn: document.getElementById("todayBtn"),
  newEventBtn: document.getElementById("newEventBtn"),
  modal: document.getElementById("eventModal"),
  form: document.getElementById("eventForm"),
  modalTitle: document.getElementById("modalTitle"),
  eventId: document.getElementById("eventId"),
  titleInput: document.getElementById("titleInput"),
  detailsInput: document.getElementById("detailsInput"),
  startInput: document.getElementById("startInput"),
  endInput: document.getElementById("endInput"),
  colorInput: document.getElementById("colorInput"),
  deleteBtn: document.getElementById("deleteBtn"),
  cancelBtn: document.getElementById("cancelBtn"),
  closeModalBtn: document.getElementById("closeModalBtn")
};

// ===== INIT =====

init();

async function init() {
  bindEvents();
  renderWeek();
  await fetchEventsForVisibleWeek();
  setupRealtime();
}

// ===== EVENTS =====

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

  els.newEventBtn.addEventListener("click", openCreateModal);

  els.form.addEventListener("submit", handleSaveEvent);
  els.deleteBtn.addEventListener("click", handleDeleteEvent);
  els.cancelBtn.addEventListener("click", closeModal);
  els.closeModalBtn.addEventListener("click", closeModal);
}

// ===== RENDER =====

function renderWeek() {
  els.weekGrid.innerHTML = "";

  const spacer = document.createElement("div");
  spacer.className = "time-column";
  els.weekGrid.appendChild(spacer);

  for (let i = 0; i < 7; i++) {
  const day = addDays(state.currentWeekStart, i);

  // ✅ CREATE COLUMN FIRST (this was missing)
  const col = document.createElement("div");
  col.className = "day-column";

  // ✅ highlight today
  if (sameDay(day, new Date())) {
    col.classList.add("today");
  }

  const header = document.createElement("div");
  header.className = "day-header";
  header.textContent = day.toDateString();
  col.appendChild(header);

  // ✅ NOW attach click handler (correct placement)
  col.addEventListener("click", (e) => {
    if (e.target.closest(".event")) return;

    openCreateModal();

    const clickedDate = new Date(day);

    clickedDate.setHours(9, 0);
    els.startInput.value = clickedDate.toISOString().slice(0, 16);

    clickedDate.setHours(10, 0);
    els.endInput.value = clickedDate.toISOString().slice(0, 16);
  });

    state.events
      .filter(e => sameDay(new Date(e.start_at), day))
      .forEach(e => {
        const item = document.createElement("div");
        item.className = "event";
        item.style.background = e.color || "#3b82f6";

        const start = new Date(e.start_at).toLocaleTimeString([], {
  hour: '2-digit',
  minute: '2-digit'
});

        item.innerHTML = `
        <div class="event-time">${start}</div>
        <div class="event-title">${e.title}</div>
        ${e.details ? `<div class="event-details">${e.details}</div>` : ""}
`;


        item.addEventListener("click", () => openEditModal(e));

        col.appendChild(item);
      });

    els.weekGrid.appendChild(col);
  }

  els.weekLabel.textContent = "Week of " + state.currentWeekStart.toDateString();

  updateWeekBadges();
}

// ===== DATA =====

async function fetchEventsForVisibleWeek() {
  try {
    setStatus("Syncing…");

    const start = new Date(state.currentWeekStart);
    const end = addDays(start, 7);

    const { data, error } = await supabaseClient
      .from(TABLE_NAME)
      .select("*")
      .lt("start_at", end.toISOString())
      .gt("end_at", start.toISOString());

    if (error) throw error;

    state.events = data || [];
    renderWeek();
    setStatus("Live");
  } catch (error) {
    console.error(error);
  }
}

// ===== MODAL =====

function openCreateModal() {
  els.modalTitle.textContent = "New Event";
  els.form.reset();
  els.eventId.value = "";
  els.modal.showModal(); 
  els.deleteBtn.classList.add("hidden");

}

function openEditModal(event) {
  els.eventId.value = event.id;
  els.titleInput.value = event.title;
  els.detailsInput.value = event.details || "";
  els.startInput.value = event.start_at.slice(0, 16);
  els.endInput.value = event.end_at.slice(0, 16);
  els.colorInput.value = event.color || "#3b82f6";
  els.modal.showModal(); 
  els.deleteBtn.classList.remove("hidden");
}

function closeModal() {
  els.modal.close(); 
  els.deleteBtn.classList.add("hidden");
}

// ===== CRUD =====

async function handleSaveEvent(e) {
  e.preventDefault();

  const event = {
    title: els.titleInput.value,
    details: els.detailsInput.value,
    start_at: new Date(els.startInput.value).toISOString(),
    end_at: new Date(els.endInput.value).toISOString(),
    color: els.colorInput.value
  };

  try {
    let error;

    if (els.eventId.value) {
      ({ error } = await supabaseClient
        .from(TABLE_NAME)
        .update(event)
        .eq("id", els.eventId.value));
    } else {
      ({ error } = await supabaseClient
        .from(TABLE_NAME)
        .insert([event]));
    }

    if (error) {
      console.error("Save error:", error);
      alert(error.message);
      return;
    }

    closeModal();
    await fetchEventsForVisibleWeek();
  } catch (err) {
    console.error(err);
  }
}

async function handleDeleteEvent() {
  if (!els.eventId.value) return;

  await supabaseClient
    .from(TABLE_NAME)
    .delete()
    .eq("id", els.eventId.value);

  closeModal();
  fetchEventsForVisibleWeek();
}

// ===== REALTIME =====

function setupRealtime() {
  state.realtimeChannel = supabaseClient
    .channel("events")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE_NAME },
      () => fetchEventsForVisibleWeek()
    )
    .subscribe();
}

// ===== STATUS =====

function setStatus(text) {
  if (els.syncStatus) {
    els.syncStatus.textContent = text;
  }
} 
