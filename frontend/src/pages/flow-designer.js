import { users, flowTemplates, stages, formFields, flowRoles } from '../api.js';

// State management
let currentUser = null;
let currentFlow = null;
let allTemplates = [];
let allUsers = [];

// Initialize page
async function init() {
  try {
    // Load current user
    const userResponse = await users.getCurrentUser();
    currentUser = userResponse.data;
    document.getElementById('user-name').textContent = currentUser.full_name || currentUser.email;

    // Load all users for role assignment
    try {
      const usersResponse = await users.list();
      allUsers = usersResponse.data;
    } catch (error) {
      console.error('Failed to load users:', error);
      allUsers = [currentUser]; // Fallback to just current user
    }

    // Load flow templates
    await loadFlowTemplates();

    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Failed to initialize:', error);
    window.location.href = '/login.html';
  }
}

// Set up event listeners
function setupEventListeners() {
  // Hamburger menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');

  menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menuToggle.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.add('hidden');
    }
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login.html';
  });

  // New flow button
  document.getElementById('new-flow-btn').addEventListener('click', createNewFlow);

  // Add stage buttons
  document.getElementById('add-stage-btn').addEventListener('click', () => addStage());
  document.getElementById('add-first-stage-btn')?.addEventListener('click', () => addStage());

  // Save flow button
  document.getElementById('save-flow-btn').addEventListener('click', saveFlow);

  // Roles modal
  document.getElementById('manage-roles-btn').addEventListener('click', openRolesModal);
  document.getElementById('close-roles-modal').addEventListener('click', closeRolesModal);
  document.getElementById('close-roles-modal-btn').addEventListener('click', closeRolesModal);
  document.getElementById('roles-modal-overlay').addEventListener('click', closeRolesModal);
  document.getElementById('add-role-btn').addEventListener('click', addRole);
}

// Load flow templates
async function loadFlowTemplates() {
  try {
    const response = await flowTemplates.list();
    allTemplates = response.data;

    const listContainer = document.getElementById('templates-list');
    const emptyState = document.getElementById('templates-empty');

    if (allTemplates.length === 0) {
      listContainer.classList.add('hidden');
      emptyState.classList.remove('hidden');
    } else {
      listContainer.classList.remove('hidden');
      emptyState.classList.add('hidden');
      renderTemplatesList();
    }
  } catch (error) {
    console.error('Failed to load templates:', error);
  }
}

// Render templates list
function renderTemplatesList() {
  const listContainer = document.getElementById('templates-list');
  listContainer.innerHTML = '';

  allTemplates.forEach(template => {
    const item = document.createElement('div');
    item.className = `template-item ${currentFlow?.id === template.id ? 'active' : ''}`;
    item.dataset.templateId = template.id;
    item.innerHTML = `
      <div class="flex items-start justify-between mb-1">
        <h3 class="font-semibold text-sm text-gray-900 line-clamp-1">
          ${template.name}
        </h3>
        <span class="text-xs text-gray-500 ml-2">${template.stage_count} stages</span>
      </div>
      <p class="text-xs text-gray-600 line-clamp-2">
        ${template.description || 'No description'}
      </p>
    `;
    item.addEventListener('click', () => loadFlow(template.id));
    listContainer.appendChild(item);
  });
}

// Create new flow
async function createNewFlow() {
  try {
    const response = await flowTemplates.create({
      name: 'Untitled Flow',
      description: '',
      is_active: true
    });

    const newFlow = response.data;
    allTemplates.unshift(newFlow);
    await loadFlow(newFlow.id);
    renderTemplatesList();

    // Focus on name input
    document.getElementById('flow-name-input').focus();
    document.getElementById('flow-name-input').select();
  } catch (error) {
    console.error('Failed to create flow:', error);
    alert('Failed to create flow. Please try again.');
  }
}

// Load flow
async function loadFlow(flowId) {
  try {
    const response = await flowTemplates.get(flowId);
    currentFlow = response.data;

    // Update UI
    document.getElementById('welcome-state').classList.add('hidden');
    document.getElementById('flow-editor').classList.remove('hidden');

    // Populate form
    document.getElementById('flow-name-input').value = currentFlow.name;
    document.getElementById('flow-description-input').value = currentFlow.description || '';

    // Render stages
    renderStages();

    // Update templates list active state
    renderTemplatesList();
  } catch (error) {
    console.error('Failed to load flow:', error);
    alert('Failed to load flow. Please try again.');
  }
}

// Render stages
function renderStages() {
  const container = document.getElementById('stages-container');
  const emptyState = document.getElementById('stages-empty-state');

  if (!currentFlow.stages || currentFlow.stages.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = '';

  // Sort stages by order
  const sortedStages = [...currentFlow.stages].sort((a, b) => a.order - b.order);

  sortedStages.forEach((stage, index) => {
    const stageCard = createStageCard(stage, index + 1);
    container.appendChild(stageCard);
  });
}

// Create stage card
function createStageCard(stage, stageNumber) {
  const card = document.createElement('div');
  card.className = 'stage-card';
  card.dataset.stageId = stage.id;
  card.draggable = true;

  // Get assignment target name
  let assignmentTargetName = '';
  if (stage.assignment_type === 'user' && stage.assignment_target_id) {
    const user = allUsers.find(u => u.id === stage.assignment_target_id);
    assignmentTargetName = user ? (user.full_name || user.email) : '';
  } else if (stage.assignment_type === 'role' && stage.assignment_target_id) {
    const role = currentFlow.roles.find(r => r.id === stage.assignment_target_id);
    assignmentTargetName = role ? role.name : '';
  }

  card.innerHTML = `
    <!-- Drag Handle -->
    <div class="drag-handle absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing">
      <svg class="w-5 h-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
      </svg>
    </div>

    <!-- Stage Content -->
    <div class="pl-6">

      <!-- Stage Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3 flex-1">
          <!-- Stage Number Badge -->
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center">
            ${stageNumber}
          </div>

          <!-- Stage Name Input -->
          <input
            type="text"
            class="stage-name-input text-lg font-semibold text-gray-900 flex-1 border-0 border-b-2 border-transparent focus:border-primary-500 focus:outline-none focus:ring-0 px-2 py-1 transition-colors"
            placeholder="Stage Name"
            value="${stage.name}"
            data-stage-id="${stage.id}"
          />
        </div>

        <!-- Stage Actions -->
        <div class="flex items-center gap-2">
          <!-- Approval Stage Toggle -->
          <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900">
            <input type="checkbox" class="approval-stage-checkbox w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 focus:ring-2" ${stage.is_approval_stage ? 'checked' : ''} data-stage-id="${stage.id}">
            <span class="font-medium">Approval</span>
          </label>

          <!-- Delete Stage Button -->
          <button class="delete-stage-btn p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete stage" data-stage-id="${stage.id}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Stage Assignment Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Assigned To</label>
          <select class="assignment-select input-field text-sm py-2" data-stage-id="${stage.id}">
            <option value="">Select assignment...</option>
            <option value="user" ${stage.assignment_type === 'user' ? 'selected' : ''}>Specific User</option>
            <option value="role" ${stage.assignment_type === 'role' ? 'selected' : ''}>Flow Role</option>
            <option value="initiator" ${stage.assignment_type === 'initiator' ? 'selected' : ''}>Flow Initiator</option>
            <option value="external" ${stage.assignment_type === 'external' ? 'selected' : ''}>External Guest</option>
          </select>
        </div>

        <!-- Secondary Assignment Dropdown -->
        <div class="assignment-target-container ${(stage.assignment_type === 'user' || stage.assignment_type === 'role') ? '' : 'hidden'}">
          <label class="block text-sm font-semibold text-gray-700 mb-2">
            <span class="assignment-target-label">${stage.assignment_type === 'user' ? 'User' : 'Role'}</span>
          </label>
          <select class="assignment-target-select input-field text-sm py-2" data-stage-id="${stage.id}">
            <option value="">Select...</option>
            ${generateAssignmentOptions(stage.assignment_type, stage.assignment_target_id)}
          </select>
        </div>
      </div>

      <!-- Expandable: Stage Description & Form Fields -->
      <div class="border-t border-gray-200 pt-4">

        <!-- Toggle Button -->
        <button class="toggle-stage-details w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 mb-3">
          <span>Stage Instructions & Form Fields</span>
          <svg class="toggle-arrow w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        <!-- Collapsible Details Section -->
        <div class="stage-details-content">

          <!-- Stage Description -->
          <div class="mb-4">
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              Step Instructions
              <span class="text-gray-500 font-normal">(shown to assignee)</span>
            </label>
            <textarea
              class="stage-description-textarea input-field text-sm"
              rows="3"
              placeholder="Provide instructions for completing this stage..."
              data-stage-id="${stage.id}"
            >${stage.description || ''}</textarea>
          </div>

          <!-- Form Fields Section -->
          <div>
            <div class="flex items-center justify-between mb-3">
              <label class="block text-sm font-semibold text-gray-700">Form Fields</label>
              <button class="add-field-btn text-xs text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1" data-stage-id="${stage.id}">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                Add Field
              </button>
            </div>

            <!-- Form Fields List -->
            <div class="form-fields-list space-y-3" data-stage-id="${stage.id}">
              ${stage.form_fields.length > 0 ? renderFormFields(stage.form_fields) : '<p class="text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-300 rounded-lg">No form fields yet. Click "Add Field" to create one.</p>'}
            </div>
          </div>

        </div>
      </div>

    </div>
  `;

  // Add event listeners
  setupStageEventListeners(card, stage);

  return card;
}

// Generate assignment options
function generateAssignmentOptions(assignmentType, selectedId) {
  if (assignmentType === 'user') {
    return allUsers.map(user => `
      <option value="${user.id}" ${user.id === selectedId ? 'selected' : ''}>
        ${user.full_name || user.email}
      </option>
    `).join('');
  } else if (assignmentType === 'role') {
    return currentFlow.roles.map(role => `
      <option value="${role.id}" ${role.id === selectedId ? 'selected' : ''}>
        ${role.name}
      </option>
    `).join('');
  }
  return '';
}

// Render form fields
function renderFormFields(fields) {
  return fields.map(field => `
    <div class="form-field-item bg-gray-50 rounded-lg p-4 border border-gray-200" data-field-id="${field.id}">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3">

        <!-- Field Type -->
        <div class="md:col-span-3">
          <label class="block text-xs font-semibold text-gray-600 mb-1">Field Type</label>
          <select class="field-type-select w-full text-sm py-1.5 px-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500" data-field-id="${field.id}">
            <option value="text" ${field.field_type === 'text' ? 'selected' : ''}>Text</option>
            <option value="number" ${field.field_type === 'number' ? 'selected' : ''}>Number</option>
            <option value="date" ${field.field_type === 'date' ? 'selected' : ''}>Date</option>
            <option value="checkbox" ${field.field_type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
            <option value="attachment" ${field.field_type === 'attachment' ? 'selected' : ''}>Attachment</option>
          </select>
        </div>

        <!-- Field Label -->
        <div class="md:col-span-6">
          <label class="block text-xs font-semibold text-gray-600 mb-1">Field Label</label>
          <input
            type="text"
            class="field-label-input w-full text-sm py-1.5 px-3 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="e.g., Employee Name, Budget Amount..."
            value="${field.label}"
            data-field-id="${field.id}"
          />
        </div>

        <!-- Required & Delete -->
        <div class="md:col-span-3 flex items-end gap-2">
          <label class="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer hover:text-gray-900 flex-1">
            <input type="checkbox" class="field-required-checkbox w-3.5 h-3.5 text-primary-600 rounded border-gray-300 focus:ring-primary-500 focus:ring-1" ${field.required ? 'checked' : ''} data-field-id="${field.id}">
            <span class="font-medium">Required</span>
          </label>

          <button class="delete-field-btn p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete field" data-field-id="${field.id}">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  `).join('');
}

// Setup stage event listeners
function setupStageEventListeners(card, stage) {
  // Stage name input
  const nameInput = card.querySelector('.stage-name-input');
  nameInput.addEventListener('input', (e) => {
    updateStageField(stage.id, 'name', e.target.value);
  });

  // Approval checkbox
  const approvalCheckbox = card.querySelector('.approval-stage-checkbox');
  approvalCheckbox.addEventListener('change', (e) => {
    updateStageField(stage.id, 'is_approval_stage', e.target.checked);
  });

  // Delete stage button
  const deleteBtn = card.querySelector('.delete-stage-btn');
  deleteBtn.addEventListener('click', () => deleteStage(stage.id));

  // Assignment selects
  const assignmentSelect = card.querySelector('.assignment-select');
  assignmentSelect.addEventListener('change', (e) => {
    const value = e.target.value;
    const targetContainer = card.querySelector('.assignment-target-container');
    const targetLabel = card.querySelector('.assignment-target-label');
    const targetSelect = card.querySelector('.assignment-target-select');

    if (value === 'user') {
      targetLabel.textContent = 'User';
      targetContainer.classList.remove('hidden');
      targetSelect.innerHTML = '<option value="">Select...</option>' + generateAssignmentOptions('user');
      updateStageField(stage.id, 'assignment_type', 'user');
      updateStageField(stage.id, 'assignment_target_id', null);
    } else if (value === 'role') {
      targetLabel.textContent = 'Role';
      targetContainer.classList.remove('hidden');
      targetSelect.innerHTML = '<option value="">Select...</option>' + generateAssignmentOptions('role');
      updateStageField(stage.id, 'assignment_type', 'role');
      updateStageField(stage.id, 'assignment_target_id', null);
    } else {
      targetContainer.classList.add('hidden');
      updateStageField(stage.id, 'assignment_type', value);
      updateStageField(stage.id, 'assignment_target_id', null);
    }
  });

  const targetSelect = card.querySelector('.assignment-target-select');
  targetSelect.addEventListener('change', (e) => {
    const value = parseInt(e.target.value);
    updateStageField(stage.id, 'assignment_target_id', value || null);
  });

  // Toggle details
  const toggleBtn = card.querySelector('.toggle-stage-details');
  const detailsContent = card.querySelector('.stage-details-content');
  const toggleArrow = card.querySelector('.toggle-arrow');
  toggleBtn.addEventListener('click', () => {
    detailsContent.classList.toggle('expanded');
    toggleArrow.classList.toggle('rotate-180');
  });

  // Stage description
  const descriptionTextarea = card.querySelector('.stage-description-textarea');
  descriptionTextarea.addEventListener('input', (e) => {
    updateStageField(stage.id, 'description', e.target.value);
  });

  // Add field button
  const addFieldBtn = card.querySelector('.add-field-btn');
  addFieldBtn.addEventListener('click', () => addFormField(stage.id));

  // Form field event listeners
  setupFormFieldEventListeners(card, stage.id);

  // Drag and drop
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);
  card.addEventListener('dragover', handleDragOver);
  card.addEventListener('drop', handleDrop);
}

// Setup form field event listeners
function setupFormFieldEventListeners(container, stageId) {
  // Field type select
  container.querySelectorAll('.field-type-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const fieldId = parseInt(e.target.dataset.fieldId);
      updateFormField(stageId, fieldId, 'field_type', e.target.value);
    });
  });

  // Field label input
  container.querySelectorAll('.field-label-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const fieldId = parseInt(e.target.dataset.fieldId);
      updateFormField(stageId, fieldId, 'label', e.target.value);
    });
  });

  // Required checkbox
  container.querySelectorAll('.field-required-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const fieldId = parseInt(e.target.dataset.fieldId);
      updateFormField(stageId, fieldId, 'required', e.target.checked);
    });
  });

  // Delete field button
  container.querySelectorAll('.delete-field-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const fieldId = parseInt(e.target.dataset.fieldId);
      deleteFormField(stageId, fieldId);
    });
  });
}

// Update stage field
function updateStageField(stageId, field, value) {
  const stage = currentFlow.stages.find(s => s.id === stageId);
  if (stage) {
    stage[field] = value;
    // Changes will be saved when user clicks Save button
  }
}

// Update form field
function updateFormField(stageId, fieldId, field, value) {
  const stage = currentFlow.stages.find(s => s.id === stageId);
  if (stage) {
    const formField = stage.form_fields.find(f => f.id === fieldId);
    if (formField) {
      formField[field] = value;
      // Changes will be saved when user clicks Save button
    }
  }
}

// Add stage
async function addStage() {
  if (!currentFlow) return;

  try {
    const newOrder = currentFlow.stages.length + 1;
    const response = await stages.create(currentFlow.id, {
      name: `Stage ${newOrder}`,
      order: newOrder,
      description: '',
      assignment_type: 'initiator',
      assignment_target_id: null,
      is_approval_stage: false,
      form_fields: []
    });

    currentFlow.stages.push(response.data);
    renderStages();
  } catch (error) {
    console.error('Failed to add stage:', error);
    alert('Failed to add stage. Please try again.');
  }
}

// Delete stage
async function deleteStage(stageId) {
  if (!confirm('Delete this stage? This cannot be undone.')) return;

  try {
    await stages.delete(currentFlow.id, stageId);

    // Remove from currentFlow
    currentFlow.stages = currentFlow.stages.filter(s => s.id !== stageId);

    // Renumber remaining stages
    currentFlow.stages.forEach((stage, index) => {
      stage.order = index + 1;
    });

    renderStages();
  } catch (error) {
    console.error('Failed to delete stage:', error);
    alert('Failed to delete stage. Please try again.');
  }
}

// Add form field
async function addFormField(stageId) {
  try {
    const stage = currentFlow.stages.find(s => s.id === stageId);
    const newOrder = stage.form_fields.length + 1;

    const response = await formFields.create(currentFlow.id, stageId, {
      field_type: 'text',
      label: 'New Field',
      required: false,
      order: newOrder
    });

    stage.form_fields.push(response.data);
    renderStages();
  } catch (error) {
    console.error('Failed to add form field:', error);
    alert('Failed to add form field. Please try again.');
  }
}

// Delete form field
async function deleteFormField(stageId, fieldId) {
  if (!confirm('Delete this field?')) return;

  try {
    await formFields.delete(currentFlow.id, stageId, fieldId);

    const stage = currentFlow.stages.find(s => s.id === stageId);
    stage.form_fields = stage.form_fields.filter(f => f.id !== fieldId);

    renderStages();
  } catch (error) {
    console.error('Failed to delete form field:', error);
    alert('Failed to delete form field. Please try again.');
  }
}

// Drag and drop handlers
let draggedElement = null;

function handleDragStart(e) {
  draggedElement = e.currentTarget;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  draggedElement = null;
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault();
  }
  e.dataTransfer.dropEffect = 'move';
  return false;
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation();
  }

  if (draggedElement && draggedElement !== e.currentTarget) {
    // Swap positions
    const container = document.getElementById('stages-container');
    const allCards = Array.from(container.querySelectorAll('.stage-card'));
    const draggedIndex = allCards.indexOf(draggedElement);
    const targetIndex = allCards.indexOf(e.currentTarget);

    if (draggedIndex < targetIndex) {
      e.currentTarget.parentNode.insertBefore(draggedElement, e.currentTarget.nextSibling);
    } else {
      e.currentTarget.parentNode.insertBefore(draggedElement, e.currentTarget);
    }

    // Update order in data
    const newOrder = Array.from(container.querySelectorAll('.stage-card')).map((card, index) => {
      const stageId = parseInt(card.dataset.stageId);
      const stage = currentFlow.stages.find(s => s.id === stageId);
      stage.order = index + 1;
      return stage;
    });

    currentFlow.stages = newOrder;
    renderStages();
    // Changes will be saved when user clicks Save button
  }

  return false;
}

// Update save status
function updateSaveStatus(status) {
  const icon = document.getElementById('save-status-icon');
  const text = document.getElementById('save-status-text');

  if (status === 'saving') {
    icon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    `;
    icon.classList.remove('text-green-500', 'text-red-500', 'hidden');
    icon.classList.add('text-gray-400', 'animate-spin');
    text.textContent = 'Saving...';
  } else if (status === 'saved') {
    icon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    `;
    icon.classList.remove('text-gray-400', 'text-red-500', 'animate-spin', 'hidden');
    icon.classList.add('text-green-500');
    text.textContent = 'Saved successfully';
  } else if (status === 'error') {
    icon.innerHTML = `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    `;
    icon.classList.remove('text-green-500', 'text-gray-400', 'animate-spin', 'hidden');
    icon.classList.add('text-red-500');
    text.textContent = 'Save failed';
  }
}

// Save flow
async function saveFlow() {
  if (!currentFlow) return;

  updateSaveStatus('saving');

  try {
    // Update flow template
    await flowTemplates.update(currentFlow.id, {
      name: document.getElementById('flow-name-input').value,
      description: document.getElementById('flow-description-input').value,
    });

    // Update all stages
    for (const stage of currentFlow.stages) {
      await stages.update(currentFlow.id, stage.id, {
        name: stage.name,
        order: stage.order,
        description: stage.description,
        assignment_type: stage.assignment_type,
        assignment_target_id: stage.assignment_target_id,
        is_approval_stage: stage.is_approval_stage
      });

      // Update form fields
      for (const field of stage.form_fields) {
        await formFields.update(currentFlow.id, stage.id, field.id, {
          field_type: field.field_type,
          label: field.label,
          required: field.required,
          order: field.order
        });
      }
    }

    updateSaveStatus('saved');

    // Reload templates list to update stage count
    await loadFlowTemplates();
  } catch (error) {
    console.error('Failed to save flow:', error);
    updateSaveStatus('error');
  }
}

// Roles Modal
async function openRolesModal() {
  if (!currentFlow) return;

  document.getElementById('roles-modal').classList.remove('hidden');
  await loadRoles();
}

function closeRolesModal() {
  document.getElementById('roles-modal').classList.add('hidden');
}

async function loadRoles() {
  try {
    const response = await flowRoles.list(currentFlow.id);
    currentFlow.roles = response.data;
    renderRoles();
  } catch (error) {
    console.error('Failed to load roles:', error);
  }
}

function renderRoles() {
  const container = document.getElementById('roles-list');
  const emptyState = document.getElementById('roles-empty');

  if (currentFlow.roles.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  container.classList.remove('hidden');
  emptyState.classList.add('hidden');
  container.innerHTML = '';

  currentFlow.roles.forEach(role => {
    const card = document.createElement('div');
    card.className = 'role-card border border-gray-200 rounded-lg p-4';
    card.dataset.roleId = role.id;
    card.innerHTML = `
      <div class="flex items-start justify-between mb-3">
        <div>
          <h4 class="font-semibold text-gray-900">${role.name}</h4>
          <p class="text-xs text-gray-500">${role.user_ids.length} members assigned</p>
        </div>
        <button class="delete-role-btn text-gray-400 hover:text-red-600" title="Delete role" data-role-id="${role.id}">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>

      <label class="block text-xs font-semibold text-gray-600 mb-2">Assigned Members</label>
      <select multiple class="role-members-select w-full text-sm border border-gray-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-primary-500" size="4" data-role-id="${role.id}">
        ${allUsers.map(user => `
          <option value="${user.id}" ${role.user_ids.includes(user.id) ? 'selected' : ''}>
            ${user.full_name || user.email}
          </option>
        `).join('')}
      </select>
      <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
    `;

    // Delete button
    const deleteBtn = card.querySelector('.delete-role-btn');
    deleteBtn.addEventListener('click', () => deleteRole(role.id));

    // Members select
    const membersSelect = card.querySelector('.role-members-select');
    membersSelect.addEventListener('change', (e) => {
      const selectedUserIds = Array.from(e.target.selectedOptions).map(opt => parseInt(opt.value));
      updateRole(role.id, selectedUserIds);
    });

    container.appendChild(card);
  });
}

async function addRole() {
  const nameInput = document.getElementById('new-role-name');
  const name = nameInput.value.trim();

  if (!name) {
    alert('Please enter a role name');
    return;
  }

  try {
    await flowRoles.create(currentFlow.id, {
      name,
      user_ids: []
    });

    nameInput.value = '';
    await loadRoles();

    // Re-render stages to update assignment dropdowns
    renderStages();
  } catch (error) {
    console.error('Failed to add role:', error);
    alert('Failed to add role. Please try again.');
  }
}

async function updateRole(roleId, userIds) {
  try {
    await flowRoles.update(currentFlow.id, roleId, {
      user_ids: userIds
    });

    // Update in local state
    const role = currentFlow.roles.find(r => r.id === roleId);
    if (role) {
      role.user_ids = userIds;
    }

    await loadRoles();
  } catch (error) {
    console.error('Failed to update role:', error);
    alert('Failed to update role. Please try again.');
  }
}

async function deleteRole(roleId) {
  if (!confirm('Delete this role?')) return;

  try {
    await flowRoles.delete(currentFlow.id, roleId);
    await loadRoles();

    // Re-render stages to update assignment dropdowns
    renderStages();
  } catch (error) {
    console.error('Failed to delete role:', error);
    alert('Failed to delete role. Please try again.');
  }
}

// Initialize on page load
init();
