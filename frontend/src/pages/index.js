import '../style.css';
import { users } from '../api.js';

const loading = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const tasksContainer = document.getElementById('tasks-container');
const userNameEl = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');

async function loadUserData() {
  try {
    const response = await users.getCurrentUser();
    const user = response.data;

    // Display user name
    userNameEl.textContent = user.full_name || user.email;
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
}

async function loadTasks() {
  try {
    const response = await users.getMyTasks();
    const data = response.data;

    loading.classList.add('hidden');

    if (!data.tasks || data.tasks.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      tasksContainer.classList.remove('hidden');
      renderTasks(data.tasks);
    }
  } catch (error) {
    console.error('Failed to load tasks:', error);
    loading.classList.add('hidden');
    emptyState.classList.remove('hidden');
  }
}

function renderTasks(tasks) {
  // Group tasks by flow type
  const groupedTasks = tasks.reduce((acc, task) => {
    const flowType = task.flow_type || 'Other';
    if (!acc[flowType]) {
      acc[flowType] = [];
    }
    acc[flowType].push(task);
    return acc;
  }, {});

  // Render each group
  tasksContainer.innerHTML = Object.entries(groupedTasks)
    .map(([flowType, tasks]) => `
      <div class="mb-6">
        <h3 class="text-xl font-semibold text-gray-900 mb-4">${flowType}</h3>
        <div class="space-y-3">
          ${tasks.map(task => renderTaskCard(task)).join('')}
        </div>
      </div>
    `)
    .join('');
}

function renderTaskCard(task) {
  return `
    <div class="card hover:shadow-lg transition-shadow duration-200 cursor-pointer">
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <h4 class="text-lg font-semibold text-gray-900 mb-1">
            ${task.title || 'Untitled Task'}
          </h4>
          <p class="text-sm text-gray-600 mb-2">
            Current Stage: <span class="font-medium text-primary-600">${task.current_stage || 'N/A'}</span>
          </p>
          ${task.description ? `<p class="text-sm text-gray-700 mb-2">${task.description}</p>` : ''}
          <div class="flex items-center gap-4 text-xs text-gray-500">
            ${task.elapsed_time ? `<span>⏱️ ${task.elapsed_time}</span>` : ''}
            ${task.assignee ? `<span>👤 ${task.assignee}</span>` : ''}
          </div>
        </div>
        <div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
            Active
          </span>
        </div>
      </div>
    </div>
  `;
}

// Logout handler
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('access_token');
  window.location.href = '/login.html';
});

// Check authentication and load data
const token = localStorage.getItem('access_token');
if (!token) {
  window.location.href = '/login.html';
} else {
  loadUserData();
  loadTasks();
}
