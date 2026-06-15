const SUPABASE_URL = "https://jrzqppjsubpzoynyqsjy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyenFwcGpzdWJwem95bnlxc2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjA3ODksImV4cCI6MjA5NjczNjc4OX0.gXhE8iqIG5ZsagBSXouBTVqU-a_3mnsuL1Byb_ZqiFs";

const supabaseClient = window.supabase.createClient(
  "https://jrzqppjsubpzoynyqsjy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyenFwcGpzdWJwem95bnlxc2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjA3ODksImV4cCI6MjA5NjczNjc4OX0.gXhE8iqIG5ZsagBSXouBTVqU-a_3mnsuL1Byb_ZqiFs"
);

const state = {
  events: [],
  filteredEvents: [],
  showImportantOnly: false
};


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

init();

function init() {

  // 🔹 START OF INIT

  fetchEvents();

  els.newEventBtn.onclick = openCreateModal;
  els.form.onsubmit = saveEvent;
  els.deleteBtn.onclick = deleteEvent;
  document.getElementById("backupBtn").onclick = downloadBackup;

  
  els.allMonth.onchange = () => {
    if (els.allMonth.checked) {
      els.allDay.checked = false;
      els.start.type = "date";
      els.end.type = "date";
  }
};

  els.allDay.onchange = () => {
    const type = els.allDay.checked ? "date" : "datetime-local";
    els.start.type = type;
    els.end.type = type;
  };

  // ✅ Search (uses shared filter system)
  els.search.addEventListener("input", applyFilters);

  // ✅ Important filter button
  const btn = document.getElementById("importantFilterBtn");

  btn.onclick = () => {
    state.showImportantOnly = !state.showImportantOnly;

    // visual state
    btn.classList.toggle("active");

    btn.textContent = state.showImportantOnly
      ? "Showing Important ✅"
      : "Show Important Only";

    applyFilters();
  };

  // 🔹 END OF INIT

}

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

async function fetchEvents() {
  const { data } = await supabaseClient
    .from("events")
    .select("*")
    .order("start_at");

  state.events = data || [];
  applyFilters();
}

function render() {
  els.container.innerHTML = "";

  const months = {};

  state.filteredEvents.forEach(e => {
    const d = new Date(e.start_at);
    const m = d.toLocaleString('default', { month: 'long' });

    if (!months[m]) months[m] = [];
    months[m].push(e);
  });

  Object.entries(months).forEach(([month, events]) => {
    events.sort((a, b) => {
    if (a.is_important && !b.is_important) return -1;
    if (!a.is_important && b.is_important) return 1;
    return new Date(a.start_at) - new Date(b.start_at);
});
    const section = document.createElement("div");
    section.className = "month";

    section.innerHTML = `<h2>${month}</h2>`;

    // click empty month space to add event
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
          <div class="last-updated">Updated ${timeAgo(ev.updated_at)}</div>
` : ""}
        
        ${ev.note ? `
          <div class="event-note-toggle">Show note ▼</div>
          <div class="event-note collapsed">
            <span class="note-text">${ev.note}</span>
           </div>
` : ""}
`;

// ✅ separate handler for note toggle
const toggle = row.querySelector(".event-note-toggle");

if (toggle) {
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();  // ✅ stops modal opening

    const note = row.querySelector(".event-note");
    const isExpanded = note.classList.contains("expanded");

    note.classList.toggle("expanded");
    note.classList.toggle("collapsed");

    toggle.textContent = isExpanded
      ? "Show note ▼"
      : "Hide note ▲";
  });
}  

      row.onclick = (e) => {
        e.stopPropagation();
        openEditModal(ev);
      };

      section.appendChild(row);
    });

    els.container.appendChild(section);
  });
}

function openCreateModal() {
  els.form.reset();
  els.eventId.value = "";

  els.allDay.checked = false;
  els.allDay.onchange(); // ✅ ensures correct input type

  els.modal.showModal();
}

function toLocalInputValue(utcString) {
  const date = new Date(utcString);

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);

  return local.toISOString().slice(0, 16);
}

function openEditModal(e) {
  els.eventId.value = e.id;
  els.title.value = e.title;
  els.lead.value = e.lead || "";
  els.contact.value = e.contact || "";
  els.note.value = e.note || "";
  els.details.value = e.details || "";
  els.important.checked = e.is_important || false;

  // ✅ Detect if event is all-day
  const startDate = new Date(e.start_at);
  const endDate = new Date(e.end_at);

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
    startDate.getHours() === 0 &&
    startDate.getMinutes() === 0 &&
    endDate.getHours() >= 23;

  // ✅ Set checkbox
  els.allDay.checked = isAllDay;

  // ✅ Trigger input type change (date vs datetime)
  els.allDay.onchange();

  // ✅ Set values AFTER type is set
  if (isAllDay) {
    // date-only format: YYYY-MM-DD
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

async function saveEvent(e) {
  e.preventDefault();

  // ✅ Step 1: get raw values FIRST
  let start = els.start.value;
  let end = els.end.value;

  // ✅ Step 2: handle all-day vs timed
if (els.allMonth.checked) {
  const startDate = new Date(els.start.value);

  const year = startDate.getFullYear();
  const month = startDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  start = new Date(firstDay).toISOString();
  end = new Date(lastDay.setHours(23, 59, 59)).toISOString();

} else if (els.allDay.checked) {
  start = new Date(start + "T00:00").toISOString();
  end = new Date(end + "T23:59").toISOString();

} else {
  start = new Date(start).toISOString();
  end = new Date(end).toISOString();
}
  // ✅ Step 3: build event AFTER processing
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

  // ✅ Step 4: save to Supabase
  try {
    if (els.eventId.value) {
      await supabaseClient.from("events")
        .update(event)
        .eq("id", els.eventId.value);
    } else {
      await supabaseClient.from("events")
        .insert([event]);
    }

    showToast("Saved ✅");

  } catch (err) {
    showToast("Save failed ❌", true);
  }

  // ✅ Step 5: refresh + close
  closeModal();
  fetchEvents();
}

async function deleteEvent() {
  await supabaseClient
    .from("events")
    .delete()
    .eq("id", els.eventId.value);

  closeModal();
  fetchEvents();
}

function downloadBackup() {
  const dataStr = JSON.stringify(state.events, null, 2);

  const blob = new Blob([dataStr], { type: "application/json" });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "events-backup.json";
  a.click();
}

function formatDateRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);

  const sameDay = s.toDateString() === e.toDateString();

  // ✅ FIXED operators
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

  if (sameDay) {
    return `${s.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short"
    })} 
    ${s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - 
    ${e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return `${s.toLocaleString()} → ${e.toLocaleString()}`;
}

function showToast(msg, error = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = error ? "#e74c3c" : "#2ecc71";

  t.classList.remove("hidden");

  setTimeout(() => {
    t.classList.add("hidden");
  }, 2000);
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

