const SUPABASE_URL = "https://jrzqppjsubpzoynyqsjy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyenFwcGpzdWJwem95bnlxc2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjA3ODksImV4cCI6MjA5NjczNjc4OX0.gXhE8iqIG5ZsagBSXouBTVqU-a_3mnsuL1Byb_ZqiFs";

const supabaseClient = window.supabase.createClient(
  "https://jrzqppjsubpzoynyqsjy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyenFwcGpzdWJwem95bnlxc2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjA3ODksImV4cCI6MjA5NjczNjc4OX0.gXhE8iqIG5ZsagBSXouBTVqU-a_3mnsuL1Byb_ZqiFs"
);

const state = { events: [] };

const els = {
  container: document.getElementById("monthView"),
  modal: document.getElementById("eventModal"),
  form: document.getElementById("eventForm"),
  eventId: document.getElementById("eventId"),
  title: document.getElementById("titleInput"),
  details: document.getElementById("detailsInput"),
  start: document.getElementById("startInput"),
  end: document.getElementById("endInput"),
  color: document.getElementById("colorInput"),
  deleteBtn: document.getElementById("deleteBtn"),
  newEventBtn: document.getElementById("newEventBtn")
};

init();

function init() {
  fetchEvents();
  els.newEventBtn.onclick = openCreateModal;
  els.form.onsubmit = saveEvent;
  els.deleteBtn.onclick = deleteEvent;
}

async function fetchEvents() {
  const { data } = await supabaseClient
    .from("events")
    .select("*")
    .order("start_at");

  state.events = data || [];
  render();
}

function render() {
  els.container.innerHTML = "";

  const months = {};

  state.events.forEach(e => {
    const d = new Date(e.start_at);
    const m = d.toLocaleString('default', { month: 'long' });

    if (!months[m]) months[m] = [];
    months[m].push(e);
  });

  Object.entries(months).forEach(([month, events]) => {
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

      row.innerHTML = `
        <div>${ev.title}</div>
        <div>${ev.details || ""}</div>
        <div>—</div>
        <div>—</div>
      `;

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
  els.modal.showModal();
}

function openEditModal(e) {
  els.eventId.value = e.id;
  els.title.value = e.title;
  els.details.value = e.details || "";
  els.start.value = e.start_at.slice(0, 16);
  els.end.value = e.end_at.slice(0, 16);
  els.modal.showModal();
}

function closeModal() {
  els.modal.close();
}

async function saveEvent(e) {
  e.preventDefault();

  const event = {
    title: els.title.value,
    details: els.details.value,
    start_at: new Date(els.start.value).toISOString(),
    end_at: new Date(els.end.value).toISOString(),
    color: els.color.value
  };

  if (els.eventId.value) {
    await supabaseClient.from("events")
      .update(event)
      .eq("id", els.eventId.value);
  } else {
    await supabaseClient.from("events")
      .insert([event]);
  }

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
