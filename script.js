

(() => {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const KEY = "taskflow_tasks_v1";
  const THEME = "taskflow_theme_v1";

  let tasks = [];
  let filter = "all";
  let editingId = null;
  let deletedTask = null;

  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
    tasks = Array.isArray(saved) ? saved : [];
  } catch {
    tasks = [];
  }

  const form = $("#task-form");
  const title = $("#task-title");
  const category = $("#task-category");
  const priority = $("#task-priority");
  const dueDate = $("#task-due-date");
  const notes = $("#task-notes");
  const list = $("#task-list");
  const empty = $("#empty-state");

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(tasks));
    $("#sync-status").textContent = "Saved on this device";
  }

  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function renderStats() {
    const completed = tasks.filter(t => t.completed).length;
    const active = tasks.length - completed;
    const overdue = tasks.filter(t =>
      !t.completed && t.dueDate && t.dueDate < today()
    ).length;

    $("#stat-total").textContent = tasks.length;
    $("#stat-active").textContent = active;
    $("#stat-completed").textContent = completed;
    $("#stat-overdue").textContent = overdue;
    $("#completion-rate").textContent =
      `${tasks.length ? Math.round(completed / tasks.length * 100) : 0}% completion`;

    $("#nav-all").textContent = tasks.length;
    $("#nav-active").textContent = active;
    $("#nav-completed").textContent = completed;
    $("#nav-today").textContent = tasks.filter(t =>
      !t.completed && t.dueDate === today()
    ).length;
  }

  function render() {
    save();
    list.replaceChildren();

    const search = $("#task-search").value.trim().toLowerCase();
    const catFilter = $("#category-filter").value;

    const visible = tasks.filter(t => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !t.completed) ||
        (filter === "completed" && t.completed) ||
        (filter === "today" && t.dueDate === today() && !t.completed);

      const matchesCategory =
        catFilter === "all" || t.category === catFilter;

      const matchesSearch =
        !search ||
        [t.title, t.notes, t.category, t.priority]
          .some(v => String(v || "").toLowerCase().includes(search));

      return matchesFilter && matchesCategory && matchesSearch;
    });

    visible.sort((a, b) => {
      if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
      return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
    });

    visible.forEach(task => {
      const card = element("article", "task-item" + (task.completed ? " completed" : ""));

      const checkbox = element("input", "task-checkbox");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(task.completed);
      checkbox.setAttribute("aria-label", "Complete task");
      checkbox.addEventListener("change", () => {
        task.completed = checkbox.checked;
        render();
      });

      const content = element("div", "task-content");
      content.append(element("h3", "task-item-title", task.title));

      if (task.notes) {
        content.append(element("p", "task-notes-text", task.notes));
      }

      const meta = element("div", "task-meta");
      meta.append(element("span", "task-category-tag", task.category || "Personal"));
      meta.append(element("span", `priority-tag priority-${task.priority || "medium"}`,
        `${(task.priority || "medium").toUpperCase()} priority`));

      if (task.dueDate) {
        const due = element("span", "task-due-date", `Due ${task.dueDate}`);
        if (!task.completed && task.dueDate < today()) due.classList.add("overdue");
        meta.append(due);
      }

      content.append(meta);

      const actions = element("div", "task-actions");

      const edit = element("button", "text-button", "Edit");
      edit.type = "button";
      edit.addEventListener("click", () => {
        editingId = task.id;
        title.value = task.title;
        category.value = task.category || "Personal";
        priority.value = task.priority || "medium";
        dueDate.value = task.dueDate || "";
        notes.value = task.notes || "";
        form.querySelector('[type="submit"]').textContent = "Save changes";
        title.focus();
        form.scrollIntoView({ behavior: "smooth", block: "center" });
      });

      const del = element("button", "text-button", "Delete");
      del.type = "button";
      del.addEventListener("click", () => {
        const index = tasks.findIndex(t => t.id === task.id);
        deletedTask = { task, index };
        tasks.splice(index, 1);
        if (editingId === task.id) resetForm();
        render();
      });

      actions.append(edit, del);
      card.append(checkbox, content, actions);
      list.append(card);
    });

    empty.hidden = visible.length > 0;
    $("#task-count").textContent = `${visible.length} tasks`;
    $("#undo-delete").hidden = !deletedTask;
    renderStats();
  }

  function resetForm() {
    form.reset();
    category.value = "Personal";
    priority.value = "medium";
    editingId = null;
    form.querySelector('[type="submit"]').textContent = "+ Add task";
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const taskTitle = title.value.trim();
    if (!taskTitle) return;

    if (editingId) {
      const task = tasks.find(t => t.id === editingId);
      if (task) {
        task.title = taskTitle;
        task.category = category.value;
        task.priority = priority.value;
        task.dueDate = dueDate.value;
        task.notes = notes.value.trim();
      }
    } else {
      tasks.push({
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        title: taskTitle,
        category: category.value,
        priority: priority.value,
        dueDate: dueDate.value,
        notes: notes.value.trim(),
        completed: false,
        createdAt: Date.now()
      });
    }

    resetForm();
    render();
    title.focus();
  });

  document.querySelectorAll(".filter").forEach(button => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter || "all";
      document.querySelectorAll(".filter").forEach(b =>
        b.classList.toggle("active", b === button)
      );

      $("#page-title").textContent = ({
        all: "All tasks",
        active: "Active tasks",
        completed: "Completed tasks",
        today: "Due today"
      })[filter] || "All tasks";

      render();
    });
  });

  $("#task-search").addEventListener("input", render);
  $("#category-filter").addEventListener("change", render);

  $("#clear-completed").addEventListener("click", () => {
    const count = tasks.filter(t => t.completed).length;
    if (!count) {
      alert("No completed tasks to clear.");
      return;
    }
    if (confirm(`Delete all ${count} completed tasks?`)) {
      tasks = tasks.filter(t => !t.completed);
      deletedTask = null;
      render();
    }
  });

  $("#undo-delete").addEventListener("click", () => {
    if (!deletedTask) return;
    tasks.splice(deletedTask.index, 0, deletedTask.task);
    deletedTask = null;
    render();
  });

  $("#theme-toggle").addEventListener("click", () => {
    const dark = document.body.classList.toggle("dark-mode");
    localStorage.setItem(THEME, dark ? "dark" : "light");
    $("#theme-toggle").textContent = dark ? "☀️ Light mode" : "🌙 Dark mode";
  });

  if (localStorage.getItem(THEME) === "dark") {
    document.body.classList.add("dark-mode");
    $("#theme-toggle").textContent = "☀️ Light mode";
  }

  $("#export-button").addEventListener("click", () => {
    const blob = new Blob(
      [JSON.stringify({ tasks }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "taskflow-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  });

  $("#import-file").addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = JSON.parse(await file.text());
      const imported = Array.isArray(data) ? data : data.tasks;
      if (!Array.isArray(imported)) throw new Error("Invalid backup file");

      if (confirm("Import backup? This replaces your current tasks.")) {
        tasks = imported
          .filter(t => t && typeof t.title === "string" && t.title.trim())
          .map(t => ({
            id: t.id || (Date.now() + Math.random()).toString(),
            title: t.title,
            notes: t.notes || "",
            category: t.category || "Personal",
            priority: t.priority || "medium",
            dueDate: t.dueDate || "",
            completed: Boolean(t.completed),
            createdAt: t.createdAt || Date.now()
          }));

        deletedTask = null;
        render();
        alert("Backup imported successfully!");
      }
    } catch {
      alert("Could not read this backup file.");
    }

    event.target.value = "";
  });

  // Local mode: no Supabase account needed.
  $("#auth-status").textContent =
    "Local mode: your tasks are saved in this browser.";
  $("#auth-form").querySelectorAll("input, button").forEach(el => {
    el.disabled = true;
  });
  $("#logout-button").hidden = true;
  $("#user-badge").textContent = "TF";

  const now = new Date();
  $("#today-label").textContent = now.toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric"
  }).toUpperCase();

  render();
})();
