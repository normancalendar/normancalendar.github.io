const SUPABASE_URL = "https://zlldjmfzcuawrprsqvmn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yWwO42p-m_KU5INUaKnUZA_8XvsyfTP";

const supabase = window.supabase.createClient(
  "https://zlldjmfzcuawrprsqvmn.supabase.co",
  "sb_publishable_yWwO42p-m_KU5INUaKnUZA_8XvsyfTP"
);

// ✅ HARDCODE ONE CALENDAR
const CALENDAR_ID = "YOUR_CALENDAR_ID";

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
  endInput: document.getElementById("endInput"),
  allDayInput: document.getElementById("allDayInput"),
  modalTitle: document.getElementById("modalTitle")
};

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

function renderHeader() {
  els.calendarHeader.innerHTML = weekDays
    .map(day => `<div>${day}</div>`)
    .join("");
}

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

function eventsForDay(day) {
  return state.events.filter(event => {
    const start = new Date(event.start_at);
    return sameDay(start, day);
  });
}

function renderCalendar() {
  els.currentLabel.textContent = formatMonthLabel(state.currentDate);

  const month = state.currentDate.getMonth();
  const today = new Date();
  const days = getMonthGrid(state.currentDate);

  els.calendarGrid.innerHTML = days
    .map(day => {
      const isOtherMonth = day.getMonth() !== month;
      const isToday = sameDay(day, today);
      const dayEvents = eventsForDay(day);

      return `
        <div class="day-cell ${isOtherMonth ? "other-month" : ""} ${isToday ? "today" : ""}">
          <div class="day-number">${day.getDate()}</div>
          ${dayEvents
            .map(
              event => `
              <div class="event-chip" data-event-id="${event.id}">
                ${event.title}
              </div>
            `
            )
            .join("")}
        </div>
      `;
    })
    .join("");
}

function openModal() {
  els.eventModal.classList.remove("hidden");
}

function closeModal() {
  els.eventModal.classList.add("hidden");
  els.eventForm.reset();
  els.eventId.value = "";
}

async function saveEvent(e) {
  e.preventDefault();

  const payload = {
    calendar_id: CALENDAR_ID,
    title: els.titleInput.value.trim(),
    description: els.descriptionInput.value.trim(),
    start_at: new Date(els.startInput.value).toISOString(),
    end_at: new Date(els.endInput.value).toISOString(),
    all_day: els.allDayInput.checked
  };

  let result;

  if (els.eventId.value) {
    result = await supabase
      .from("events")
      .update(payload)
      .eq("id", els.eventId.value);
  } else {
    result = await supabase.from("events").insert(payload);
  }

  if (result.error) {
    alert(result.error.message);
    return;
  }

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

function attachEvents() {
  els.newEventBtn.addEventListener("click", openModal);

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

async function init() {
  renderHeader();
  attachEvents();
  await loadEvents();
  renderCalendar();
}

init();
