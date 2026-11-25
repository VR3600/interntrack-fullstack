import { auth, signOut, onAuthStateChanged } from '/firebase-client.js';

const API_BASE = '/api/applications';
const STATUSES = ['Applied', 'Online Test', 'Interview', 'Offer', 'Rejected'];
const STATUS_COLORS = {
  Applied: '#3b82f6',
  'Online Test': '#8b5cf6',
  Interview: '#f59e0b',
  Offer: '#10b981',
  Rejected: '#ef4444',
};
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1, #a855f7)',
  'linear-gradient(135deg, #3b82f6, #06b6d4)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #ec4899, #8b5cf6)',
];

let currentUser = null;
let allApplications = [];
let statusChartInstance = null;
let pendingDeleteId = null;
let currentView = localStorage.getItem('interntrack_view') || 'grid';
let monthlyGoal = Number(localStorage.getItem('interntrack_goal')) || 15;
let draggedAppId = null;

// DOM Elements
const authLoader = document.getElementById('authLoader');
const appShell = document.getElementById('appShell');
const userNameDisplay = document.getElementById('userNameDisplay');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const userAvatar = document.getElementById('userAvatar');
const greetingText = document.getElementById('greetingText');
const greetingSub = document.getElementById('greetingSub');
const goalLabel = document.getElementById('goalLabel');
const goalBarFill = document.getElementById('goalBarFill');
const editGoalBtn = document.getElementById('editGoalBtn');

const themeToggleBtn = document.getElementById('themeToggleBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const loadDemoNavBtn = document.getElementById('loadDemoNavBtn');
const logoutBtn = document.getElementById('logoutBtn');
const addAppBtn = document.getElementById('addAppBtn');
const emptyAddBtn = document.getElementById('emptyAddBtn');
const emptyDemoBtn = document.getElementById('emptyDemoBtn');

const statTotal = document.getElementById('statTotal');
const statInterview = document.getElementById('statInterview');
const statOffer = document.getElementById('statOffer');
const statRejected = document.getElementById('statRejected');
const statActiveRate = document.getElementById('statActiveRate');
const statTopStipend = document.getElementById('statTopStipend');
const avgStipendBadge = document.getElementById('avgStipendBadge');

const statusChartCanvas = document.getElementById('statusChart');
const chartEmptyState = document.getElementById('chartEmptyState');
const upcomingDeadlinesList = document.getElementById('upcomingDeadlinesList');

const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const sortSelect = document.getElementById('sortSelect');
const viewGridBtn = document.getElementById('viewGridBtn');
const viewKanbanBtn = document.getElementById('viewKanbanBtn');
const resultsCount = document.getElementById('resultsCount');
const kanbanTip = document.getElementById('kanbanTip');
const loadingCards = document.getElementById('loadingCards');
const emptyState = document.getElementById('emptyState');
const applicationsGrid = document.getElementById('applicationsGrid');
const kanbanBoard = document.getElementById('kanbanBoard');

// Modals
const appModal = document.getElementById('appModal');
const modalTitle = document.getElementById('modalTitle');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const appForm = document.getElementById('appForm');
const appIdInput = document.getElementById('appId');
const companyInput = document.getElementById('companyInput');
const roleInput = document.getElementById('roleInput');
const statusInput = document.getElementById('statusInput');
const stipendInput = document.getElementById('stipendInput');
const locationInput = document.getElementById('locationInput');
const deadlineInput = document.getElementById('deadlineInput');
const linkInput = document.getElementById('linkInput');
const notesInput = document.getElementById('notesInput');
const saveAppBtn = document.getElementById('saveAppBtn');

const deleteModal = document.getElementById('deleteModal');
const deleteCompanyName = document.getElementById('deleteCompanyName');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const toastContainer = document.getElementById('toastContainer');

// ===================== SPOTLIGHT HOVER EFFECT =====================
document.addEventListener('mousemove', (e) => {
  const card = e.target.closest('.spotlight-card');
  if (!card) return;
  const rect = card.getBoundingClientRect();
  card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
  card.style.setProperty('--my', `${e.clientY - rect.top}px`);
});

// ===================== PURE-JS CONFETTI CELEBRATION =====================
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#6366f1', '#a855f7', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];
  const pieces = Array.from({ length: 110 }, () => ({
    x: canvas.width / 2 + (Math.random() - 0.5) * 260,
    y: canvas.height * 0.35,
    w: Math.random() * 9 + 5,
    h: Math.random() * 5 + 4,
    vx: (Math.random() - 0.5) * 14,
    vy: Math.random() * -12 - 4,
    gravity: 0.35,
    angle: Math.random() * 360,
    spin: (Math.random() - 0.5) * 12,
    color: colors[Math.floor(Math.random() * colors.length)],
    opacity: 1,
  }));

  let frame = 0;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.angle += p.spin;
      if (frame > 75) p.opacity -= 0.025;

      if (p.opacity > 0 && p.y < canvas.height + 20) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.angle * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    frame++;
    if (alive) {
      requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  requestAnimationFrame(animate);
}

// ===================== HELPERS =====================
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAvatarGradient(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.28s ease';
    setTimeout(() => toast.remove(), 280);
  }, 3000);
}

function formatCurrency(amount) {
  const num = Number(amount);
  if (!num || num <= 0) return 'Unpaid / N/A';
  return `₹${num.toLocaleString('en-IN')}/mo`;
}

function getDaysRemaining(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

function buildCalendarUrl(app) {
  if (!app.deadline) return '';
  const dateCompact = app.deadline.replace(/-/g, '');
  const title = encodeURIComponent(`${app.company} — ${app.role} (${app.status})`);
  const details = encodeURIComponent(
    `Tracked via InternTrack.\nLocation: ${app.location || 'Remote'}\nNotes: ${app.notes || 'Best of luck!'}`
  );
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateCompact}/${dateCompact}&details=${details}`;
}

function animateNumber(el, target) {
  const start = Number(el.dataset.val) || 0;
  el.dataset.val = target;
  if (start === target) {
    el.textContent = target;
    return;
  }
  const duration = 520;
  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function setTimeGreeting(name) {
  const hr = new Date().getHours();
  const part = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  greetingText.textContent = `${part}, ${name}! 👋`;
}

async function authFetch(url, options = {}) {
  const token = await currentUser.getIdToken();
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ===================== THEME =====================
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('interntrack_theme', theme);
  themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

applyTheme(localStorage.getItem('interntrack_theme') || 'dark');

themeToggleBtn.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  renderChart();
});

// ===================== VIEW SWITCHER (GRID / KANBAN) =====================
function applyViewMode(mode) {
  currentView = mode;
  localStorage.setItem('interntrack_view', mode);
  viewGridBtn.classList.toggle('active', mode === 'grid');
  viewKanbanBtn.classList.toggle('active', mode === 'kanban');
  kanbanTip.classList.toggle('hidden', mode !== 'kanban');
  renderApplicationsView();
}

viewGridBtn.addEventListener('click', () => applyViewMode('grid'));
viewKanbanBtn.addEventListener('click', () => applyViewMode('kanban'));

// ===================== MONTHLY GOAL =====================
function updateGoalWidget() {
  const count = allApplications.length;
  const pct = Math.min(100, Math.round((count / monthlyGoal) * 100));
  goalLabel.textContent = `🎯 Monthly Goal: ${count} / ${monthlyGoal} (${pct}%)`;
  goalBarFill.style.width = `${pct}%`;
}

editGoalBtn.addEventListener('click', () => {
  const val = prompt('Apna monthly application target set karo (e.g., 20):', monthlyGoal);
  const parsed = Number(val);
  if (parsed && parsed > 0 && parsed <= 500) {
    monthlyGoal = parsed;
    localStorage.setItem('interntrack_goal', String(monthlyGoal));
    updateGoalWidget();
    showToast(`Monthly goal updated to ${monthlyGoal}!`, 'info');
  }
});

// ===================== AUTH GUARD =====================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '/auth.html';
    return;
  }

  currentUser = user;
  const displayName = user.displayName || user.email.split('@')[0];
  userNameDisplay.textContent = displayName;
  userEmailDisplay.textContent = user.email;
  userAvatar.textContent = displayName.charAt(0).toUpperCase();
  setTimeGreeting(displayName);

  authLoader.classList.add('hidden');
  appShell.classList.remove('hidden');

  viewGridBtn.classList.toggle('active', currentView === 'grid');
  viewKanbanBtn.classList.toggle('active', currentView === 'kanban');
  kanbanTip.classList.toggle('hidden', currentView !== 'kanban');

  await fetchApplications();
});

logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = '/auth.html';
});

// ===================== CRUD OPERATIONS =====================
async function fetchApplications() {
  loadingCards.classList.remove('hidden');
  applicationsGrid.innerHTML = '';
  kanbanBoard.innerHTML = '';
  emptyState.classList.add('hidden');

  try {
    allApplications = await authFetch(API_BASE);
    renderDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loadingCards.classList.add('hidden');
  }
}

async function handleSaveApplication(e) {
  e.preventDefault();
  const id = appIdInput.value;
  const prevApp = id ? allApplications.find((a) => a.id === id) : null;

  const payload = {
    company: companyInput.value.trim(),
    role: roleInput.value.trim(),
    status: statusInput.value,
    stipend: stipendInput.value ? Number(stipendInput.value) : 0,
    location: locationInput.value.trim() || 'Remote',
    deadline: deadlineInput.value,
    link: linkInput.value.trim(),
    notes: notesInput.value.trim(),
  };

  saveAppBtn.disabled = true;
  saveAppBtn.textContent = id ? 'Updating...' : 'Saving...';

  try {
    if (id) {
      const updated = await authFetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      allApplications = allApplications.map((item) => (item.id === id ? updated : item));
      showToast('Application updated!');
    } else {
      const created = await authFetch(API_BASE, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      allApplications.unshift(created);
      showToast('New application added!');
    }

    if (payload.status === 'Offer' && (!prevApp || prevApp.status !== 'Offer')) {
      launchConfetti();
      showToast(`🎉 Congrats on the ${payload.company} offer!`, 'success');
    }

    closeAppModal();
    renderDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    saveAppBtn.disabled = false;
    saveAppBtn.textContent = 'Save Application';
  }
}

async function handleQuickStatusChange(id, newStatus) {
  const target = allApplications.find((a) => a.id === id);
  if (!target || target.status === newStatus) return;

  // Optimistic UI update for snappy feel
  const oldStatus = target.status;
  target.status = newStatus;
  renderDashboard();

  try {
    const updated = await authFetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus }),
    });
    allApplications = allApplications.map((item) => (item.id === id ? updated : item));
    renderDashboard();

    if (newStatus === 'Offer') {
      launchConfetti();
      showToast(`🎉 Woohoo! ${target.company} moved to Offer!`, 'success');
    } else {
      showToast(`${target.company} moved to ${newStatus}`, 'info');
    }
  } catch (err) {
    target.status = oldStatus;
    renderDashboard();
    showToast(err.message, 'error');
  }
}

async function handleDeleteConfirm() {
  if (!pendingDeleteId) return;
  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    await authFetch(`${API_BASE}/${pendingDeleteId}`, { method: 'DELETE' });
    allApplications = allApplications.filter((item) => item.id !== pendingDeleteId);
    closeDeleteModal();
    renderDashboard();
    showToast('Application deleted!');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Yes, Delete';
  }
}

// ===================== 1-CLICK DEMO DATA =====================
async function loadDemoData() {
  const today = new Date();
  const futureDate = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  };

  const samples = [
    {
      company: 'Razorpay',
      role: 'Full-Stack Developer Intern',
      status: 'Offer',
      stipend: 45000,
      location: 'Bengaluru (Hybrid)',
      deadline: futureDate(5),
      link: 'https://razorpay.com/jobs/',
      notes: 'Cleared 2 technical rounds + HR. Offer letter received!',
    },
    {
      company: 'Google India',
      role: 'STEP / SWE Intern',
      status: 'Interview',
      stipend: 85000,
      location: 'Hyderabad',
      deadline: futureDate(2),
      link: 'https://careers.google.com/',
      notes: 'DSA round scheduled — focus on Graphs, DP & System basics.',
    },
    {
      company: 'Zomato',
      role: 'Frontend Engineering Intern',
      status: 'Online Test',
      stipend: 35000,
      location: 'Gurugram',
      deadline: futureDate(1),
      link: 'https://www.zomato.com/careers',
      notes: 'HackerRank OA link active for 48 hours. JS + React machine coding.',
    },
    {
      company: 'Atlassian',
      role: 'Software Engineer Intern',
      status: 'Applied',
      stipend: 75000,
      location: 'Remote (India)',
      deadline: futureDate(8),
      link: 'https://www.atlassian.com/company/careers',
      notes: 'Applied via LinkedIn referral with updated portfolio.',
    },
    {
      company: 'Flipkart',
      role: 'Backend Node.js Intern',
      status: 'Rejected',
      stipend: 40000,
      location: 'Bengaluru',
      deadline: '',
      link: 'https://www.flipkartcareers.com/',
      notes: 'Good learning experience in system design round.',
    },
  ];

  loadDemoNavBtn.disabled = true;
  emptyDemoBtn.disabled = true;
  showToast('Loading sample internships...', 'info');

  try {
    const createdList = await Promise.all(
      samples.map((item) =>
        authFetch(API_BASE, { method: 'POST', body: JSON.stringify(item) })
      )
    );
    allApplications = [...createdList, ...allApplications];
    renderDashboard();
    launchConfetti();
    showToast('✨ 5 sample applications loaded!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    loadDemoNavBtn.disabled = false;
    emptyDemoBtn.disabled = false;
  }
}

loadDemoNavBtn.addEventListener('click', loadDemoData);
emptyDemoBtn.addEventListener('click', loadDemoData);

// ===================== RENDER DASHBOARD =====================
function renderDashboard() {
  updateGoalWidget();
  renderStats();
  renderChart();
  renderDeadlines();
  renderApplicationsView();
}

function renderStats() {
  const total = allApplications.length;
  const interviews = allApplications.filter(
    (a) => a.status === 'Interview' || a.status === 'Online Test'
  ).length;
  const offers = allApplications.filter((a) => a.status === 'Offer').length;
  const rejected = allApplications.filter((a) => a.status === 'Rejected').length;
  const activePct = total > 0 ? Math.round(((total - rejected) / total) * 100) : 0;

  const stipends = allApplications.map((a) => Number(a.stipend) || 0).filter((v) => v > 0);
  const topStipend = stipends.length ? Math.max(...stipends) : 0;
  const avgStipend = stipends.length
    ? Math.round(stipends.reduce((sum, v) => sum + v, 0) / stipends.length)
    : 0;

  animateNumber(statTotal, total);
  animateNumber(statInterview, interviews);
  animateNumber(statOffer, offers);
  animateNumber(statRejected, rejected);

  statActiveRate.textContent = `${activePct}% active pipeline`;
  statTopStipend.textContent = `Top: ₹${topStipend.toLocaleString('en-IN')}/mo`;
  avgStipendBadge.textContent = `Avg: ₹${avgStipend.toLocaleString('en-IN')}/mo`;

  if (offers > 0) {
    greetingSub.textContent = `Awesome momentum — you already have ${offers} offer${offers > 1 ? 's' : ''} in your pocket! 🏆`;
  } else if (interviews > 0) {
    greetingSub.textContent = `You have ${interviews} active interview/test stage${interviews > 1 ? 's' : ''} — stay sharp! 🎯`;
  } else {
    greetingSub.textContent = `Let's land your next dream internship — keep your pipeline moving.`;
  }
}

function renderChart() {
  const counts = STATUSES.map((s) => allApplications.filter((app) => app.status === s).length);
  const hasData = counts.some((c) => c > 0);

  if (statusChartInstance) {
    statusChartInstance.destroy();
    statusChartInstance = null;
  }

  if (!hasData) {
    statusChartCanvas.classList.add('hidden');
    chartEmptyState.classList.remove('hidden');
    return;
  }

  statusChartCanvas.classList.remove('hidden');
  chartEmptyState.classList.add('hidden');

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  statusChartInstance = new Chart(statusChartCanvas, {
    type: 'doughnut',
    data: {
      labels: STATUSES,
      datasets: [
        {
          data: counts,
          backgroundColor: STATUSES.map((s) => STATUS_COLORS[s]),
          borderWidth: 0,
          hoverOffset: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '66%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: isDark ? '#e2e8f0' : '#334155',
            padding: 14,
            usePointStyle: true,
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
          },
        },
      },
    },
  });
}

function renderDeadlines() {
  const upcoming = allApplications
    .filter((a) => a.deadline && a.status !== 'Rejected' && a.status !== 'Offer')
    .map((a) => ({ ...a, daysLeft: getDaysRemaining(a.deadline) }))
    .filter((a) => a.daysLeft !== null && a.daysLeft >= -1)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 5);

  if (upcoming.length === 0) {
    upcomingDeadlinesList.innerHTML = `
      <p style="color: var(--text-muted); font-size: 0.86rem; text-align: center; padding: 48px 10px;">
        No upcoming deadlines right now. Add dates to get countdown reminders!
      </p>`;
    return;
  }

  upcomingDeadlinesList.innerHTML = upcoming
    .map((item) => {
      let badgeClass = 'badge-normal';
      let badgeText = `In ${item.daysLeft}d`;
      if (item.daysLeft < 0) {
        badgeClass = 'badge-urgent';
        badgeText = 'Passed';
      } else if (item.daysLeft === 0) {
        badgeClass = 'badge-urgent';
        badgeText = 'Today!';
      } else if (item.daysLeft <= 3) {
        badgeClass = 'badge-soon';
        badgeText = `${item.daysLeft}d left`;
      }

      return `
        <div class="deadline-item">
          <div class="deadline-info">
            <strong>${escapeHtml(item.company)} — ${escapeHtml(item.role)}</strong>
            <span>📅 ${escapeHtml(item.deadline)} • ${escapeHtml(item.status)}</span>
          </div>
          <span class="deadline-badge ${badgeClass}">${badgeText}</span>
        </div>`;
    })
    .join('');
}

function getFilteredApplications() {
  const query = searchInput.value.trim().toLowerCase();
  const statusVal = statusFilter.value;
  const sortVal = sortSelect.value;

  let filtered = allApplications.filter((app) => {
    const matchesQuery =
      !query ||
      app.company.toLowerCase().includes(query) ||
      app.role.toLowerCase().includes(query) ||
      (app.location && app.location.toLowerCase().includes(query)) ||
      (app.notes && app.notes.toLowerCase().includes(query));

    const matchesStatus = statusVal === 'All' || app.status === statusVal;
    return matchesQuery && matchesStatus;
  });

  if (sortVal === 'deadline') {
    filtered.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  } else if (sortVal === 'stipend') {
    filtered.sort((a, b) => (Number(b.stipend) || 0) - (Number(a.stipend) || 0));
  } else {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  return filtered;
}

function renderApplicationsView() {
  const filtered = getFilteredApplications();
  resultsCount.textContent = `Showing ${filtered.length} of ${allApplications.length} applications`;

  if (allApplications.length === 0 || (filtered.length === 0 && currentView === 'grid')) {
    applicationsGrid.innerHTML = '';
    kanbanBoard.innerHTML = '';
    applicationsGrid.classList.add('hidden');
    kanbanBoard.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  if (currentView === 'kanban') {
    applicationsGrid.classList.add('hidden');
    kanbanBoard.classList.remove('hidden');
    renderKanban(filtered);
  } else {
    kanbanBoard.classList.add('hidden');
    applicationsGrid.classList.remove('hidden');
    renderGridCards(filtered);
  }
}

function renderGridCards(list) {
  applicationsGrid.innerHTML = list
    .map((app, idx) => {
      const statusClass = `status-${app.status.replace(/\s+/g, '-')}`;
      const accent = STATUS_COLORS[app.status] || '#6366f1';
      const initial = (app.company || '?').charAt(0).toUpperCase();
      const avatarBg = getAvatarGradient(app.company);
      const daysLeft = getDaysRemaining(app.deadline);
      const urgentStyle =
        daysLeft !== null && daysLeft >= 0 && daysLeft <= 3
          ? 'border-color: var(--warning); color: var(--warning);'
          : '';
      const safeLink = app.link && /^https?:\/\//i.test(app.link) ? escapeHtml(app.link) : '';
      const calUrl = buildCalendarUrl(app);

      return `
        <article class="app-card spotlight-card" style="--card-accent: ${accent}; animation-delay: ${idx * 0.04}s;">
          <div class="card-top">
            <div class="company-row">
              <div class="company-avatar" style="background: ${avatarBg};">${escapeHtml(initial)}</div>
              <div class="company-title">
                <h4>${escapeHtml(app.company)}</h4>
                <p>${escapeHtml(app.role)}</p>
              </div>
            </div>
            <span class="status-pill ${statusClass}">${escapeHtml(app.status)}</span>
          </div>

          <div class="card-meta">
            <span class="meta-chip">💰 ${formatCurrency(app.stipend)}</span>
            <span class="meta-chip">📍 ${escapeHtml(app.location || 'Remote')}</span>
            ${app.deadline ? `<span class="meta-chip" style="${urgentStyle}">📅 ${escapeHtml(app.deadline)}</span>` : ''}
          </div>

          ${app.notes ? `<div class="card-notes">${escapeHtml(app.notes)}</div>` : ''}

          <div class="card-footer">
            <select class="quick-status" data-id="${app.id}" aria-label="Quick status">
              ${STATUSES.map(
                (s) => `<option value="${s}" ${app.status === s ? 'selected' : ''}>${s}</option>`
              ).join('')}
            </select>

            <div class="card-actions">
              ${calUrl ? `<a href="${calUrl}" target="_blank" rel="noopener noreferrer" class="action-btn" title="Add to Google Calendar">📅</a>` : ''}
              ${safeLink ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="action-btn" title="Open Job Portal">🔗</a>` : ''}
              <button type="button" class="action-btn edit-btn" data-id="${app.id}">Edit</button>
              <button type="button" class="action-btn delete delete-btn" data-id="${app.id}">Delete</button>
            </div>
          </div>
        </article>`;
    })
    .join('');
}

function renderKanban(list) {
  kanbanBoard.innerHTML = STATUSES.map((status) => {
    const colItems = list.filter((a) => a.status === status);
    const colColor = STATUS_COLORS[status];

    return `
      <div class="kanban-col" data-status="${status}" style="--col-color: ${colColor};">
        <div class="kanban-col-header">
          <strong>${status}</strong>
          <span class="kanban-count">${colItems.length}</span>
        </div>

        <div class="kanban-cards">
          ${
            colItems.length === 0
              ? `<p style="font-size:0.78rem; color:var(--text-muted); text-align:center; padding: 26px 8px;">Drop card here</p>`
              : colItems
                  .map(
                    (app) => `
                  <div class="kanban-card" draggable="true" data-id="${app.id}">
                    <h5>${escapeHtml(app.company)}</h5>
                    <p>${escapeHtml(app.role)}</p>
                    <div class="kanban-card-meta">
                      <span class="meta-chip">💰 ${formatCurrency(app.stipend)}</span>
                      ${app.deadline ? `<span class="meta-chip">📅 ${escapeHtml(app.deadline)}</span>` : ''}
                    </div>
                    <div class="kanban-card-footer">
                      <span class="kanban-hint">⋮⋮ Drag</span>
                      <div class="card-actions">
                        <button type="button" class="action-btn edit-btn" data-id="${app.id}">Edit</button>
                        <button type="button" class="action-btn delete delete-btn" data-id="${app.id}">✕</button>
                      </div>
                    </div>
                  </div>`
                  )
                  .join('')
          }
        </div>
      </div>`;
  }).join('');
}

// ===================== INTERACTION & DRAG-DROP EVENTS =====================
function handleCardActionsClick(e) {
  const editBtn = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');
  if (editBtn) {
    const app = allApplications.find((a) => a.id === editBtn.dataset.id);
    if (app) openAppModal(app);
  }
  if (deleteBtn) {
    const app = allApplications.find((a) => a.id === deleteBtn.dataset.id);
    if (app) openDeleteModal(app);
  }
}

applicationsGrid.addEventListener('click', handleCardActionsClick);
kanbanBoard.addEventListener('click', handleCardActionsClick);

applicationsGrid.addEventListener('change', (e) => {
  if (e.target.classList.contains('quick-status')) {
    handleQuickStatusChange(e.target.dataset.id, e.target.value);
  }
});

// Kanban Drag & Drop Delegation
kanbanBoard.addEventListener('dragstart', (e) => {
  const card = e.target.closest('.kanban-card');
  if (!card) return;
  draggedAppId = card.dataset.id;
  card.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedAppId);
});

kanbanBoard.addEventListener('dragend', (e) => {
  const card = e.target.closest('.kanban-card');
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.kanban-col.drag-over').forEach((c) => c.classList.remove('drag-over'));
  draggedAppId = null;
});

kanbanBoard.addEventListener('dragover', (e) => {
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('.kanban-col.drag-over').forEach((c) => {
    if (c !== col) c.classList.remove('drag-over');
  });
  col.classList.add('drag-over');
});

kanbanBoard.addEventListener('dragleave', (e) => {
  const col = e.target.closest('.kanban-col');
  if (col && !col.contains(e.relatedTarget)) {
    col.classList.remove('drag-over');
  }
});

kanbanBoard.addEventListener('drop', (e) => {
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  e.preventDefault();
  col.classList.remove('drag-over');
  const id = e.dataTransfer.getData('text/plain') || draggedAppId;
  const newStatus = col.dataset.status;
  if (id && newStatus) {
    handleQuickStatusChange(id, newStatus);
  }
});

// ===================== MODALS =====================
function openAppModal(app = null) {
  appForm.reset();
  if (app) {
    modalTitle.textContent = 'Edit Application';
    saveAppBtn.textContent = 'Update Application';
    appIdInput.value = app.id;
    companyInput.value = app.company || '';
    roleInput.value = app.role || '';
    statusInput.value = app.status || 'Applied';
    stipendInput.value = app.stipend || '';
    locationInput.value = app.location || '';
    deadlineInput.value = app.deadline || '';
    linkInput.value = app.link || '';
    notesInput.value = app.notes || '';
  } else {
    modalTitle.textContent = 'Add New Application';
    saveAppBtn.textContent = 'Save Application';
    appIdInput.value = '';
  }
  appModal.classList.remove('hidden');
  companyInput.focus();
}

function closeAppModal() {
  appModal.classList.add('hidden');
}

function openDeleteModal(app) {
  pendingDeleteId = app.id;
  deleteCompanyName.textContent = `${app.company} (${app.role})`;
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  pendingDeleteId = null;
  deleteModal.classList.add('hidden');
}

addAppBtn.addEventListener('click', () => openAppModal());
emptyAddBtn.addEventListener('click', () => openAppModal());
closeModalBtn.addEventListener('click', closeAppModal);
cancelModalBtn.addEventListener('click', closeAppModal);
cancelDeleteBtn.addEventListener('click', closeDeleteModal);
confirmDeleteBtn.addEventListener('click', handleDeleteConfirm);
appForm.addEventListener('submit', handleSaveApplication);

appModal.addEventListener('click', (e) => {
  if (e.target === appModal) closeAppModal();
});
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

// Search, Filter & Sort
searchInput.addEventListener('input', renderApplicationsView);
statusFilter.addEventListener('change', renderApplicationsView);
sortSelect.addEventListener('change', renderApplicationsView);

// ===================== EXPORT CSV =====================
exportCsvBtn.addEventListener('click', () => {
  if (allApplications.length === 0) {
    showToast('Export karne ke liye kam se kam 1 application add karo', 'error');
    return;
  }

  const headers = ['Company', 'Role', 'Status', 'Stipend (INR)', 'Location', 'Deadline', 'Link', 'Notes'];
  const escapeCsv = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;

  const rows = allApplications.map((a) =>
    [a.company, a.role, a.status, a.stipend || 0, a.location, a.deadline, a.link, a.notes]
      .map(escapeCsv)
      .join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `InternTrack_Applications_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('CSV downloaded successfully!');
});