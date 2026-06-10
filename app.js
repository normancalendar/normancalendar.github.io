const SUPABASE_URL = "https://zlldjmfzcuawrprsqvmn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInRlcyI6IkpXVCJ9...";
const TABLE_NAME = "events";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
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

  els.newEventBtn.addEventListener("click", () => openCreateModal());

  els.themeToggle.addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
  });

  els.form.addEventListener("submit", handleSaveEvent);
  els.deleteBtn.addEventListener("click", handleDeleteEvent);
  els.cancelBtn.addEventListener("click", closeModal);
  els.closeModalBtn.addEventListener("click", closeModal);
}

async function fetchEventsForVisibleWeek() {
  try {
    setStatus("Syncing…");
    const start = new Date(state.currentWeekStart);
    const end = addDays(start, 7);

    const { data, error } = await supabaseClient
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
