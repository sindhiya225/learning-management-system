const state = {
  token: localStorage.getItem("token") || "",
  user: null,
  authTab: "admin",
  authError: "",
  loading: false,
  adminPage: "dashboard",
  employeePage: "course",
  toast: "",
  dashboard: null,
  adminEmployees: [],
  adminCourse: null,
  employeeCourse: null,
  player: { playing: false, timer: null },
};

const loginForm = { email: "", password: "" };

function initials(name) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function renderToast() {
  return state.toast ? `<div class="toast">${state.toast}</div>` : "";
}

function notify(message) {
  state.toast = message;
  render();
  setTimeout(() => {
    state.toast = "";
    render();
  }, 2200);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

function render() {
  const root = document.getElementById("root");
  if (!state.user) root.innerHTML = renderAuth();
  else if (state.user.role === "admin") root.innerHTML = renderAdminApp();
  else root.innerHTML = renderEmployeeApp();
}

function renderAuth() {
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">LearnFlow</div>
        <div class="auth-sub">Your organisational learning platform</div>
        <div class="auth-tabs">
          <button class="auth-tab ${state.authTab === "admin" ? "active" : ""}" data-auth-tab="admin">Admin</button>
          <button class="auth-tab ${state.authTab === "employee" ? "active" : ""}" data-auth-tab="employee">Employee</button>
        </div>
        <div class="field">
          <label>Email</label>
          <input id="login-email" type="email" value="${loginForm.email}" placeholder="${state.authTab === "admin" ? "admin@org.com" : "sarah@org.com"}" />
        </div>
        <div class="field">
          <label>Password</label>
          <input id="login-password" type="password" value="${loginForm.password}" placeholder="${state.authTab === "admin" ? "admin123" : "emp123"}" />
        </div>
        ${state.authError ? `<div class="err">${state.authError}</div>` : ""}
        <button class="btn" id="login-btn">${state.loading ? "Signing in..." : "Sign in"}</button>
        <div class="helper">${state.authTab === "admin" ? "<strong>Admin:</strong> admin@org.com / admin123" : "<strong>Employee:</strong> sarah@org.com / emp123"}</div>
      </div>
      ${renderToast()}
    </div>
  `;
}

function renderSidebarFooter() {
  return `
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="avatar">${initials(state.user.name)}</div>
        <div>
          <div class="user-name">${state.user.name}</div>
          <div class="user-email">${state.user.email}</div>
        </div>
      </div>
      <button class="btn outline" style="margin-top:0.85rem" id="logout-btn">Sign out</button>
    </div>
  `;
}

function renderAdminApp() {
  const nav = [["dashboard", "Dashboard", "◦"], ["employees", "Employees", "👥"], ["course", "Course", "▶"]];
  const content = { dashboard: renderDashboard(), employees: renderEmployees(), course: renderCourseManagement() }[state.adminPage];
  return `
    <div class="app">
      <aside class="sidebar">
        <div class="sidebar-logo">LearnFlow</div>
        <div class="sidebar-role">Admin Panel</div>
        <div class="nav">
          ${nav.map(([id, label, icon]) => `<div class="nav-item ${state.adminPage === id ? "active" : ""}" data-admin-page="${id}"><span>${icon}</span><span>${label}</span></div>`).join("")}
        </div>
        ${renderSidebarFooter()}
      </aside>
      <main class="main">${content}</main>
      ${renderToast()}
    </div>
  `;
}

function renderDashboard() {
  const dashboard = state.dashboard;
  if (!dashboard) return `<div class="page-header"><div class="page-title">Dashboard</div><div class="page-sub">Loading dashboard...</div></div>`;
  const { stats, course, employees, weeklyCompletions } = dashboard;
  const completionRate = stats.allocatedCount ? Math.round((stats.completedCount / stats.allocatedCount) * 100) : 0;
  const usedPercent = course.totalViews ? Math.round((course.usedViews / course.totalViews) * 100) : 0;
  const maxWeekly = Math.max(...weeklyCompletions.map((item) => item.total), 1);
  return `
    <div class="page-header">
      <div class="page-title">Dashboard</div>
      <div class="page-sub">Course analytics and team progress overview</div>
    </div>
    <section class="stat-grid">
      <article class="stat-card"><div class="stat-label">Total Employees</div><div class="stat-val">${stats.totalEmployees}</div><div class="stat-meta">Registered in the system</div></article>
      <article class="stat-card"><div class="stat-label">Allocated</div><div class="stat-val">${stats.allocatedCount}</div><div class="stat-meta">Have course access</div><div class="stat-bar"><div class="stat-fill" style="width:${(stats.allocatedCount / Math.max(stats.totalEmployees, 1)) * 100}%"></div></div></article>
      <article class="stat-card"><div class="stat-label">Completed</div><div class="stat-val">${stats.completedCount}</div><div class="stat-meta">${completionRate}% completion rate</div><div class="stat-bar"><div class="stat-fill" style="width:${completionRate}%;background:var(--green)"></div></div></article>
      <article class="stat-card"><div class="stat-label">Views Left</div><div class="stat-val">${course.totalViews - course.usedViews}</div><div class="stat-meta">${usedPercent}% used</div><div class="stat-bar"><div class="stat-fill" style="width:${usedPercent}%;background:var(--amber)"></div></div></article>
    </section>
    <section class="chart-grid">
      <article class="chart-card">
        <div class="chart-title">Completions this week</div>
        <div class="bar-chart">
          ${weeklyCompletions.map((item, index) => `<div class="bar-col ${index === 3 ? "active" : ""}"><div class="bar-val">${item.total}</div><div class="bar" style="height:${Math.max(12, (item.total / maxWeekly) * 84)}px"></div><div class="bar-lbl">${item.day}</div></div>`).join("")}
        </div>
      </article>
      <article class="chart-card">
        <div class="chart-title">Progress distribution</div>
        <div class="donut-wrap">
          ${renderDonut(stats.completedCount, stats.inProgressCount, stats.notStartedCount)}
          <div>
            <div class="legend-item"><span class="legend-dot" style="background:var(--green)"></span>Completed (${stats.completedCount})</div>
            <div class="legend-item"><span class="legend-dot" style="background:var(--accent)"></span>In progress (${stats.inProgressCount})</div>
            <div class="legend-item"><span class="legend-dot" style="background:var(--surface3)"></span>Not started (${stats.notStartedCount})</div>
          </div>
        </div>
      </article>
    </section>
    <section class="table-wrap">
      <div class="table-header"><div class="table-title">Employee progress report</div></div>
      <table>
        <thead><tr><th>Name</th><th>Status</th><th>Progress</th><th>Completed</th></tr></thead>
        <tbody>
          ${employees.map((employee) => {
            const status = employee.completed ? `<span class="badge green">Completed</span>` : employee.allocated && employee.progress > 0 ? `<span class="badge blue">In Progress</span>` : employee.allocated ? `<span class="badge amber">Allocated</span>` : `<span class="badge red">Not Allocated</span>`;
            return `<tr><td><div class="user-chip"><div class="avatar">${initials(employee.name)}</div><div class="user-name">${employee.name}</div></div></td><td>${status}</td><td><div class="metric-row"><div class="progress-track" style="flex:1;margin-top:0"><div class="progress-fill" style="width:${employee.progress}%"></div></div><span>${employee.progress}%</span></div></td><td>${employee.completedAt || '<span class="muted">—</span>'}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderDonut(completed, inProgress, notStarted) {
  const total = Math.max(completed + inProgress + notStarted, 1);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const cArc = (completed / total) * circumference;
  const iArc = (inProgress / total) * circumference;
  return `
    <svg viewBox="0 0 80 80" width="86" height="86" aria-hidden="true">
      <circle cx="40" cy="40" r="${radius}" fill="none" stroke="var(--surface3)" stroke-width="10"></circle>
      <circle cx="40" cy="40" r="${radius}" fill="none" stroke="var(--green)" stroke-width="10" stroke-dasharray="${cArc} ${circumference - cArc}" transform="rotate(-90 40 40)"></circle>
      <circle cx="40" cy="40" r="${radius}" fill="none" stroke="var(--accent)" stroke-width="10" stroke-dasharray="${iArc} ${circumference - iArc}" stroke-dashoffset="${-cArc}" transform="rotate(-90 40 40)"></circle>
      <text x="40" y="44" fill="var(--text)" font-size="14" font-weight="700" text-anchor="middle">${Math.round((completed / total) * 100)}%</text>
    </svg>
  `;
}

function renderEmployees() {
  const employees = state.adminEmployees;
  const course = state.adminCourse;
  const availableEmployees = employees.filter((employee) => !employee.allocated);
  const usedPercent = course?.totalViews ? Math.round((course.usedViews / course.totalViews) * 100) : 0;
  return `
    <div class="page-header">
      <div class="page-title">Employees</div>
      <div class="page-sub">Manage course allocation and track access</div>
    </div>
    <section class="alloc-form">
      <div class="table-title">Allocate course access</div>
      <div class="metric-row" style="margin-top:0.8rem">
        <span class="helper" style="margin-top:0">Views used</span>
        <div class="views-track" style="flex:1;margin-top:0"><div class="views-fill" style="width:${usedPercent}%"></div></div>
        <span>${course?.usedViews || 0} / ${course?.totalViews || 0}</span>
      </div>
      ${availableEmployees.length ? `
        <div class="checkbox-wrap">
          ${availableEmployees.map((employee) => `<label class="checkbox-pill"><input type="checkbox" value="${employee.id}" class="allocation-checkbox" />${employee.name}</label>`).join("")}
        </div>
        <button class="btn" style="width:auto" id="allocate-btn">Allocate selected</button>
      ` : `<div class="helper">All employees have already been allocated to the course.</div>`}
    </section>
    <section class="table-wrap">
      <div class="table-header"><div class="table-title">All employees</div></div>
      <table>
        <thead><tr><th>Employee</th><th>Email</th><th>Access</th><th>Progress</th><th>Action</th></tr></thead>
        <tbody>
          ${employees.map((employee) => `<tr><td><div class="user-chip"><div class="avatar">${initials(employee.name)}</div><div class="user-name">${employee.name}</div></div></td><td>${employee.email}</td><td>${employee.allocated ? '<span class="badge green">Active</span>' : '<span class="badge red">No Access</span>'}</td><td>${employee.completed ? '<span class="badge purple">Done</span>' : `${employee.progress}%`}</td><td>${employee.allocated ? `<button class="inline-btn revoke-btn" data-employee-id="${employee.id}">Revoke</button>` : '<span class="muted">—</span>'}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>
  `;
}

function renderCourseManagement() {
  const course = state.adminCourse;
  if (!course) return `<div class="page-header"><div class="page-title">Course Management</div><div class="page-sub">Loading course...</div></div>`;
  return `
    <div class="page-header">
      <div class="page-title">Course Management</div>
      <div class="page-sub">Manage your organisation's course details</div>
    </div>
    <section class="alloc-form">
      <div class="table-title">Course details</div>
      <div class="field" style="margin-top:1rem"><label>Title</label><input id="course-title" value="${course.title}" /></div>
      <div class="field"><label>Description</label><textarea id="course-description">${course.description}</textarea></div>
      <div class="form-row">
        <div class="field"><label>Duration (minutes)</label><input id="course-duration" type="number" min="1" value="${course.durationMinutes}" /></div>
        <div class="field"><label>Total views</label><input id="course-views" type="number" min="${course.usedViews}" value="${course.totalViews}" /></div>
      </div>
      <button class="btn" style="width:auto" id="save-course-btn">Save changes</button>
    </section>
    <section class="stat-grid">
      <article class="stat-card"><div class="stat-label">Total views</div><div class="stat-val">${course.totalViews}</div></article>
      <article class="stat-card"><div class="stat-label">Used views</div><div class="stat-val">${course.usedViews}</div></article>
      <article class="stat-card"><div class="stat-label">Remaining</div><div class="stat-val">${course.totalViews - course.usedViews}</div></article>
    </section>
  `;
}

function renderEmployeeApp() {
  const nav = [["course", "My Course", "▶"], ["progress", "My Progress", "◎"]];
  const content = { course: renderEmployeeCourse(), progress: renderEmployeeProgress() }[state.employeePage];
  return `
    <div class="app">
      <aside class="sidebar">
        <div class="sidebar-logo">LearnFlow</div>
        <div class="sidebar-role">Employee Portal</div>
        <div class="nav">
          ${nav.map(([id, label, icon]) => `<div class="nav-item ${state.employeePage === id ? "active" : ""}" data-employee-page="${id}"><span>${icon}</span><span>${label}</span></div>`).join("")}
        </div>
        ${renderSidebarFooter()}
      </aside>
      <main class="main">${content}</main>
      ${renderToast()}
    </div>
  `;
}

function renderEmployeeCourse() {
  const data = state.employeeCourse;
  if (!data) return `<div class="page-header"><div class="page-title">My Course</div><div class="page-sub">Loading your course...</div></div>`;
  if (!data.progress.allocated) {
    return `<div class="page-header"><div class="page-title">My Course</div></div><div class="empty-state"><div class="completed-title" style="color:var(--text)">No Course Yet</div><div class="page-sub">You have not been allocated the course yet. Please contact your admin.</div></div>`;
  }
  return `
    <div class="page-header">
      <div class="page-title">My Course</div>
      <div class="page-sub">Watch, learn, and mark the course as completed</div>
    </div>
    ${data.progress.completed ? `<div class="completed-banner"><div class="completed-title">Course Completed</div><div class="page-sub">You completed "${data.course.title}" on ${data.progress.completedAt}</div></div>` : ""}
    <section class="player-wrap">
      <div class="video-area" id="video-area">
        <div class="play-overlay">
          ${state.player.playing ? `<div class="play-btn">❚❚</div><div class="helper" style="color:#fff">Playing... ${data.progress.progress}%</div>` : `<div class="play-btn">▶</div><div class="helper" style="color:#fff">${data.progress.completed ? "Playback complete" : "Click play to simulate the lesson"}</div>`}
        </div>
        <div class="playing-bar" style="width:${data.progress.progress}%"></div>
      </div>
      <div class="player-info">
        <div class="player-title">${data.course.title}</div>
        <div class="player-meta">${data.course.durationMinutes} min · ${data.course.description}</div>
        <div class="progress-track"><div class="progress-fill" style="width:${data.progress.progress}%"></div></div>
        <div class="player-controls">
          <div>Progress: ${data.progress.progress}%</div>
          <div style="display:flex;gap:0.65rem">
            ${data.progress.completed ? `<span class="badge green">Completed</span>` : `<button class="ctrl-btn" id="play-btn">${state.player.playing ? "Pause" : "Play"}</button><button class="ctrl-btn primary" id="complete-btn" ${data.progress.progress < 100 ? "disabled" : ""}>Mark Complete</button>`}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderEmployeeProgress() {
  const data = state.employeeCourse;
  if (!data) return `<div class="page-header"><div class="page-title">My Progress</div><div class="page-sub">Loading progress...</div></div>`;
  const progress = data.progress.progress;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dash = (progress / 100) * circumference;
  return `
    <div class="page-header"><div class="page-title">My Progress</div></div>
    <section class="two-col-grid">
      <article class="stat-card">
        <div class="stat-label">Course progress</div>
        <div class="progress-hero" style="margin-top:0.7rem">
          <svg viewBox="0 0 80 80" width="78" height="78" aria-hidden="true">
            <circle cx="40" cy="40" r="${radius}" fill="none" stroke="var(--surface3)" stroke-width="8"></circle>
            <circle cx="40" cy="40" r="${radius}" fill="none" stroke="${data.progress.completed ? "var(--green)" : "var(--accent)"}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${dash} ${circumference - dash}" transform="rotate(-90 40 40)"></circle>
            <text x="40" y="44" fill="var(--text)" font-size="14" font-weight="700" text-anchor="middle">${progress}%</text>
          </svg>
          <div><div class="stat-val">${progress}%</div><div class="stat-meta">of course watched</div><div style="margin-top:0.5rem">${data.progress.completed ? '<span class="badge green">Completed</span>' : data.progress.allocated ? '<span class="badge blue">In Progress</span>' : '<span class="badge red">Not Started</span>'}</div></div>
        </div>
      </article>
      <article class="stat-card">
        <div class="stat-label">Status summary</div>
        <div style="margin-top:0.85rem;display:grid;gap:0.7rem">
          <div class="metric-row"><span>Course access</span><strong>${data.progress.allocated ? "Active" : "None"}</strong></div>
          <div class="metric-row"><span>Started</span><strong>${data.progress.startedAt || "—"}</strong></div>
          <div class="metric-row"><span>Completed</span><strong>${data.progress.completedAt || "—"}</strong></div>
          <div class="metric-row"><span>Duration</span><strong>${data.course.durationMinutes} min</strong></div>
        </div>
      </article>
    </section>
    <section class="table-wrap">
      <div class="table-header"><div class="table-title">Course details</div></div>
      <table><tbody><tr><td>Title</td><td>${data.course.title}</td></tr><tr><td>Description</td><td>${data.course.description}</td></tr><tr><td>Duration</td><td>${data.course.durationMinutes} minutes</td></tr><tr><td>Your progress</td><td>${progress}% ${data.progress.completed ? "— Complete" : ""}</td></tr></tbody></table>
    </section>
  `;
}

function clearPlayback() {
  if (state.player.timer) clearInterval(state.player.timer);
  state.player.timer = null;
  state.player.playing = false;
}

async function loadAdminData() {
  const [dashboard, employees, course] = await Promise.all([
    api("/api/admin/dashboard"),
    api("/api/admin/employees"),
    api("/api/admin/course"),
  ]);
  state.dashboard = dashboard;
  state.adminEmployees = employees.employees;
  state.adminCourse = course.course;
}

async function loadEmployeeData() {
  state.employeeCourse = await api("/api/employee/course");
}

async function loadSession() {
  if (!state.token) {
    render();
    return;
  }
  try {
    const response = await api("/api/auth/me");
    state.user = response.user;
    if (state.user.role === "admin") await loadAdminData();
    else await loadEmployeeData();
  } catch (error) {
    logout();
  }
  render();
}

async function login() {
  state.loading = true;
  state.authError = "";
  render();
  try {
    const payload = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: loginForm.email.trim(), password: loginForm.password }),
    });
    state.token = payload.token;
    state.user = payload.user;
    localStorage.setItem("token", state.token);
    if (state.user.role === "admin") await loadAdminData();
    else await loadEmployeeData();
  } catch (error) {
    state.authError = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

function logout() {
  clearPlayback();
  state.token = "";
  state.user = null;
  state.dashboard = null;
  state.adminEmployees = [];
  state.adminCourse = null;
  state.employeeCourse = null;
  localStorage.removeItem("token");
  render();
}

async function allocateSelectedEmployees() {
  const employeeIds = Array.from(document.querySelectorAll(".allocation-checkbox:checked")).map((box) => Number(box.value));
  try {
    await api("/api/admin/allocations", {
      method: "POST",
      body: JSON.stringify({ employeeIds }),
    });
    await loadAdminData();
    notify("Course allocated successfully.");
  } catch (error) {
    notify(error.message);
  }
}

async function revokeEmployee(employeeId) {
  try {
    await api(`/api/admin/allocations/${employeeId}`, { method: "DELETE" });
    await loadAdminData();
    notify("Employee access revoked.");
  } catch (error) {
    notify(error.message);
  }
}

async function saveCourse() {
  try {
    const title = document.getElementById("course-title").value.trim();
    const description = document.getElementById("course-description").value.trim();
    const durationMinutes = Number(document.getElementById("course-duration").value);
    const totalViews = Number(document.getElementById("course-views").value);
    await api("/api/admin/course", {
      method: "PUT",
      body: JSON.stringify({ title, description, durationMinutes, totalViews }),
    });
    await loadAdminData();
    notify("Course updated successfully.");
  } catch (error) {
    notify(error.message);
  }
}

function togglePlayback() {
  if (!state.employeeCourse || state.employeeCourse.progress.completed) return;
  if (state.player.playing) {
    clearPlayback();
    render();
    return;
  }
  state.player.playing = true;
  state.player.timer = setInterval(async () => {
    const current = state.employeeCourse.progress.progress;
    const next = Math.min(100, current + 2);
    try {
      await api("/api/employee/progress", {
        method: "POST",
        body: JSON.stringify({ progress: next }),
      });
      state.employeeCourse.progress.progress = next;
      state.employeeCourse.progress.startedAt = state.employeeCourse.progress.startedAt || new Date().toLocaleDateString("en-GB");
      if (next >= 100) clearPlayback();
    } catch (error) {
      clearPlayback();
      notify(error.message);
    }
    render();
  }, 350);
  render();
}

async function markCompleted() {
  try {
    const response = await api("/api/employee/complete", { method: "POST" });
    clearPlayback();
    state.employeeCourse.progress.progress = response.progress.progress;
    state.employeeCourse.progress.completed = response.progress.completed;
    state.employeeCourse.progress.completedAt = response.progress.completedAt;
    notify("Course marked as completed.");
  } catch (error) {
    notify(error.message);
  }
}

document.addEventListener("click", async (event) => {
  const adminPage = event.target.closest("[data-admin-page]")?.dataset.adminPage;
  const employeePage = event.target.closest("[data-employee-page]")?.dataset.employeePage;
  const authTab = event.target.closest("[data-auth-tab]")?.dataset.authTab;
  const revokeButton = event.target.closest(".revoke-btn");
  const clickedVideoArea = event.target.closest("#video-area");
  if (authTab) {
    state.authTab = authTab;
    state.authError = "";
    render();
    return;
  }
  if (adminPage) {
    state.adminPage = adminPage;
    render();
    return;
  }
  if (employeePage) {
    state.employeePage = employeePage;
    render();
    return;
  }
  if (event.target.id === "login-btn") return login();
  if (event.target.id === "logout-btn") return logout();
  if (event.target.id === "allocate-btn") return allocateSelectedEmployees();
  if (revokeButton) return revokeEmployee(revokeButton.dataset.employeeId);
  if (event.target.id === "save-course-btn") return saveCourse();
  if (event.target.id === "play-btn" || clickedVideoArea) return togglePlayback();
  if (event.target.id === "complete-btn") return markCompleted();
});

document.addEventListener("input", (event) => {
  if (event.target.id === "login-email") loginForm.email = event.target.value;
  if (event.target.id === "login-password") loginForm.password = event.target.value;
});

loadSession();
