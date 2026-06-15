// ==============================
// Supabase Setup
// ==============================
const SUPABASE_URL = "https://jrzqppjsubpzoynyqsjy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyenFwcGpzdWJwem95bnlxc2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjA3ODksImV4cCI6MjA5NjczNjc4OX0.gXhE8iqIG5ZsagBSXouBTVqU-a_3mnsuL1Byb_ZqiFs";

const supabaseClient = window.supabase.createClient(
  https://jrzqppjsubpzoynyqsjy.supabase.co,
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyenFwcGpzdWJwem95bnlxc2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjA3ODksImV4cCI6MjA5NjczNjc4OX0.gXhE8iqIG5ZsagBSXouBTVqU-a_3mnsuL1Byb_ZqiFs
);

// ==============================
// State
// ==============================
const state = {
  events: [],
  filteredEvents: [],
  showImportantOnly: false
};

// ==============================
// DOM Elements
// ==============================
const els = {
  container: document.getElementById("monthView"),
  modal: document.getElementById("eventModal"),
  form: document.getElementById("eventForm"),
  eventId: document.getElementById("eventId"),
  title: document.getElementById("titleInput"),
  details: document.getElementById("detailsInput"),
  lead: document.getElementById("leadInput"),
  contact: document.getElementById("contactInput"),
  note: document.getElementById("noteInput"),
  start: document.getElementById("startInput"),
  end: document.getElementById("endInput"),
  color: document.getElementById("colorInput"),
  deleteBtn: document.getElementById("deleteBtn"),
  newEventBtn: document.getElementById("newEventBtn"),
  search: document.getElementById("searchInput"),
  allDay: document.getElementById("allDayInput"),
  allMonth: document.getElementById("allMonthInput"),
  important: document.getElementById("importantInput"),
};

// ==============================
// Init
// ==============================
init();

function init() {
  fetchEvents();

  els.newEventBtn.onclick = openCreateModal;
  els.form.onsubmit = saveEvent;
  els.deleteBtn.onclick = deleteEvent;
  document.getElementById("backupBtn").onclick = downloadBackup;

  // All-month toggle
  els.allMonth.onchange = () => {
    if (els.allMonth.checked) {
      els.allDay.checked = false;
      els.start.type = "date";
      els.end.type = "date";
    }
  };

  // All-day toggle
  els.allDay.onchange = () => {
    if (els.allDay.checked) {
      els.allMonth.checked = false;
    }

    const type = els.allDay.checked ? "date" : "datetime-local";
    els.start.type = type;
    els.end.type = type;
  };

  // Search
  els.search.addEventListener("input", applyFilters);

  // Important filter button
  const btn = document.getElementById("importantFilterBtn");

  btn.onclick = () => {
    state.showImportantOnly = !state.showImportantOnly;

    btn.classList.toggle("active");

    btn.textContent = state.showImportantOnly
      ? "Showing Important ✅"
      : "Show Important Only";

    applyFilters();
  };
}

// ==============================
// Filtering
// ==============================
function applyFilters() {
  const query = els.search.value.toLowerCase();

  state.filteredEvents = state.events.filter(ev => {
    const matchesSearch =
      ev.title.toLowerCase().includes(query) ||
      (ev.details || "").toLowerCase().includes(query) ||
      (ev.lead || "").toLowerCase().includes(query);

    const matchesImportant =
      !state.showImportantOnly || ev.is_important;

    return matchesSearch && matchesImportant;
  });

  render();
}

// ==============================
// Fetch Data
// ==============================
async function fetchEvents() {
  const { data } = await supabaseClient
    .from("events")
    .select("*")
    .order("start_at");

  state.events = data || [];
  applyFilters();
}

// ==============================
// Render
// ==============================
function render() {
  els.container.innerHTML = "";

  const months = {};

  state.filteredEvents.forEach(e => {
    const d = new Date(e.start_at);
    const m = d.toLocaleString("default", { month: "long" });

    if (!months[m]) months[m] = [];
    months[m].push(e);
  });

  Object.entries(months).forEach(([month, events]) => {

    // sort important first
    events.sort((a, b) => {
      if (a.is_important && !b.is_important) return -1;
      if (!a.is_important && b.is_important) return 1;
      return new Date(a.start_at) - new Date(b.start_at);
    });

    const section = document.createElement("div");
    section.className = "month";
    section.innerHTML = `<h2>${month}</h2>`;

    section.onclick = (e) => {
      if (e.target.closest(".event-row")) return;
      openCreateModal();
    };

    events.forEach(ev => {
      const row = document.createElement("div");
      row.className = "event-row";
      row.style.borderLeftColor = ev.color || "#01696f";

      if (ev.is_important) {
        row.classList.add("important");
      }

      row.innerHTML = `
        <div>
          <div class="event-title">
            ${ev.is_important ? "📌 " : ""}${ev.title}
          </div>
          <div class="event-date">
            ${formatDateRange(ev.start_at, ev.end_at)}
          </div>
        </div>

        <div>${ev.details || ""}</div>
        <div>${ev.lead || ""}</div>
        <div>${ev.contact || ""}</div>

        ${ev.updated_at ? `
          <div class="last-updated">
            Updated ${timeAgo(ev.updated_at)}
          </div>
        ` : ""}

        ${ev.note ? `
          <div class="event-note-toggle">Show note ▼</div>
          <div class="event-note collapsed">
            <span class="note-text">${ev.note}</span>
          </div>
        ` : ""}
      `;

      // Note toggle
      const toggle = row.querySelector(".event-note-toggle");

      if (toggle) {
        toggle.addEventListener("click", (e) => {
          e.stopPropagation();

          const note = row.querySelector(".event-note");
          const isExpanded = note.classList.contains("expanded");

          note.classList.toggle("expanded");
          note.classList.toggle("collapsed");

          toggle.textContent = isExpanded
            ? "Show note ▼"
            : "Hide note ▲";
        });
      }

      // ✅ click to edit
      row.addEventListener("click", () => {
        openEditModal(ev);
      });

      section.appendChild(row);
    });

    els.container.appendChild(section);
  });
}

// ==============================
// Modal Logic
// ==============================
function openCreateModal() {
  els.form.reset();
  els.eventId.value = "";

  els.allDay.checked = false;
  els.allMonth.checked = false;
  els.allDay.onchange();

  els.modal.showModal();
}

function openEditModal(e) {
  els.eventId.value = e.id;
  els.title.value = e.title;
  els.details.value = e.details || "";
  els.lead.value = e.lead || "";
  els.contact.value = e.contact || "";
  els.note.value = e.note || "";
  els.important.checked = e.is_important || false;

  const startDate = new Date(e.start_at);
  const endDate = new Date(e.end_at);

  const isAllMonth =
    startDate.getDate() === 1 &&
    endDate.getDate() >= 28;

  const isAllDay =
    startDate.getHours() === 0 &&
    startDate.getMinutes() === 0 &&
    endDate.getHours() >= 23;

  els.allMonth.checked = isAllMonth;
  els.allDay.checked = !isAllMonth && isAllDay;

  if (els.allMonth.checked) {
    els.start.type = "date";
    els.end.type = "date";
  } else {
    els.allDay.onchange();
  }

  if (isAllMonth || isAllDay) {
    els.start.value = startDate.toISOString().slice(0, 10);
    els.end.value = endDate.toISOString().slice(0, 10);
  } else {
    els.start.value = toLocalInputValue(e.start_at);
    els.end.value = toLocalInputValue(e.end_at);
  }

  els.modal.showModal();
}

function closeModal() {
  els.modal.close();
}

// ==============================
// Save / Delete
// ==============================
async function saveEvent(e) {
  e.preventDefault();

  let start = els.start.value;
  let end = els.end.value;

  if (els.allMonth.checked) {
    const startDate = new Date(start);
    const year = startDate.getFullYear();
    const month = startDate.getMonth();

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    start = new Date(first).toISOString();
    end = new Date(last.setHours(23, 59, 59)).toISOString();

  } else if (els.allDay.checked) {
    start = new Date(start + "T00:00").toISOString();
    end = new Date(end + "T23:59").toISOString();

  } else {
    start = new Date(start).toISOString();
    end = new Date(end).toISOString();
  }

  const event = {
    title: els.title.value,
    details: els.details.value,
    lead: els.lead.value,
    contact: els.contact.value,
    note: els.note.value,
    start_at: start,
    end_at: end,
    color: els.color.value,
    is_important: els.important.checked
  };

  if (els.eventId.value) {
    await supabaseClient.from("events").update(event).eq("id", els.eventId.value);
  } else {
    await supabaseClient.from("events").insert([event]);
  }

  closeModal();
  fetchEvents();
}

async function deleteEvent() {
  await supabaseClient.from("events").delete().eq("id", els.eventId.value);
  closeModal();
  fetchEvents();
}

// ==============================
// Helpers
// ==============================
function formatDateRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);

  const isAllMonth =
    s.getDate() === 1 &&
    e.getDate() >= 28;

  if (isAllMonth) {
    return s.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric"
    });
  }

  const isAllDay =
    s.getHours() === 0 &&
    s.getMinutes() === 0 &&
    e.getHours() >= 23;

  if (isAllDay) {
    return s.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  const sameDay = s.toDateString() === e.toDateString();

  if (sameDay) {
    return `${s.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short"
    })} ${s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return `${s.toLocaleString()} → ${e.toLocaleString()}`;
}

function toLocalInputValue(utc) {
  const d = new Date(utc);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = [
    { label: "y", s: 31536000 },
    { label: "mo", s: 2592000 },
    { label: "d", s: 86400 },
    { label: "h", s: 3600 },
    { label: "m", s: 60 }
  ];

  for (let i of intervals) {
    const count = Math.floor(seconds / i.s);
    if (count > 0) return `${count}${i.label} ago`;
  }

  return "now";
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify(state.events, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "events-backup.json";
  a.click();
}
