import React, { useState, useEffect } from 'react'
import { users, flowTemplates, stages, formFields } from '../api'
import {
  User,
  FlowTemplate,
  Stage,
  FormField,
  FieldType,
  AssignmentType,
} from '../types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface StageEditModalProps {
  stage: Stage
  stageNumber: number
  allUsers: User[]
  onClose: () => void
  onSave: (updatedStage: Stage) => Promise<void>
  onDelete: () => Promise<void>
  updateStageField: (stageId: number, field: keyof Stage, value: any) => void
  updateStageFields: (stageId: number, updates: Partial<Stage>) => void
  addFormField: (stageId: number) => Promise<void>
  updateFormField: (stageId: number, fieldId: number, field: keyof FormField, value: any) => void
  deleteFormField: (stageId: number, fieldId: number) => Promise<void>
}

interface FormFieldItemProps {
  field: FormField
  stageId: number
  updateFormField: (stageId: number, fieldId: number, field: keyof FormField, value: any) => void
  deleteFormField: (stageId: number, fieldId: number) => Promise<void>
}

interface SortableStageCardProps {
  stage: Stage
  index: number
  allUsers: User[]
  isEditMode: boolean
  onEditStage: (stage: Stage) => void
}

function SortableStageCard({ stage, index, allUsers, isEditMode, onEditStage }: SortableStageCardProps): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: stage.id,
    transition: {
      duration: 150, // milliseconds (default is 250)
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    }
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 150ms cubic-bezier(0.25, 1, 0.5, 1)',
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => isEditMode && onEditStage(stage)}
      className={`p-4 rounded-lg border transition-all ${
        isEditMode
          ? 'cursor-pointer hover:border-primary hover:bg-slate-50'
          : 'cursor-default'
      } border-slate-200 bg-slate-50`}
    >
      <div className="flex items-center gap-4">
        {isEditMode && (
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-6 h-6 text-slate-400 hover:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
            </svg>
          </div>
        )}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-primary flex items-center justify-center font-bold shadow-sm">
            {index + 1}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-900 text-base mb-1">{stage.name}</h3>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {stage.assignment_target_id
                ? allUsers.find(u => u.id === stage.assignment_target_id)?.full_name ||
                  allUsers.find(u => u.id === stage.assignment_target_id)?.email ||
                  'Unknown User'
                : 'Not assigned'}
            </span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {stage.form_fields?.length || 0} fields
            </span>
            {stage.is_approval_stage && (
              <span className="badge badge-accent badge-sm">Approval</span>
            )}
          </div>
        </div>
        {isEditMode && (
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}

function FlowDesigner(): React.ReactElement {
  const [currentUser] = useState<User>({
    id: 1,
    email: 'test@example.com',
    full_name: 'Test User',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  const [currentFlow, setCurrentFlow] = useState<FlowTemplate | null>(null)
  const [allTemplates, setAllTemplates] = useState<FlowTemplate[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [editingStage, setEditingStage] = useState<Stage | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    initializeDesigner()
  }, [])

  const initializeDesigner = async (): Promise<void> => {
    try {
      // Load all users for role assignment
      try {
        console.log('🔍 Loading users...')
        const usersResponse = await users.list()
        console.log('📦 Users response:', usersResponse)
        console.log('👥 Users data:', usersResponse.data)
        const usersList = Array.isArray(usersResponse.data) ? usersResponse.data : [currentUser]
        console.log('✅ Final users list:', usersList)
        setAllUsers(usersList)
      } catch (error) {
        console.error('❌ Failed to load users:', error)
        setAllUsers([currentUser])
      }

      // Load flow templates
      await loadFlowTemplates()
    } catch (error) {
      console.error('Failed to initialize:', error)
      setAllUsers([currentUser])
    } finally {
      setLoading(false)
    }
  }

  const loadFlowTemplates = async (): Promise<void> => {
    try {
      const response = await flowTemplates.list()
      const templates = Array.isArray(response.data) ? response.data : []
      setAllTemplates(templates)
    } catch (error) {
      console.error('Failed to load templates:', error)
      setAllTemplates([])
    }
  }

  const createNewFlow = async (): Promise<void> => {
    try {
      const response = await flowTemplates.create({
        name: 'Untitled Flow',
        description: '',
      })
      const newFlow = response.data
      const currentTemplates = Array.isArray(allTemplates) ? allTemplates : []
      setAllTemplates([newFlow, ...currentTemplates])
      await loadFlow(newFlow.id)
      setIsEditMode(true)
    } catch (error) {
      console.error('Failed to create flow:', error)
      alert('Failed to create flow. Please try again.')
    }
  }

  const loadFlow = async (flowId: number): Promise<void> => {
    try {
      const response = await flowTemplates.get(flowId)
      const flowData = response.data

      const safeFlow: FlowTemplate = {
        ...flowData,
        stages: (flowData.stages || []).map(stage => ({
          ...stage,
          form_fields: stage.form_fields || []
        }))
      }

      setCurrentFlow(safeFlow)
      setIsEditMode(false)

      // Update template in list with fresh data
      const currentTemplates = Array.isArray(allTemplates) ? allTemplates : []
      setAllTemplates(currentTemplates.map(template =>
        template.id === flowId ? safeFlow : template
      ))
    } catch (error) {
      console.error('Failed to load flow:', error)
      alert('Failed to load flow. Please try again.')
    }
  }

  const updateFlowField = (field: keyof FlowTemplate, value: any): void => {
    if (!currentFlow) return
    setCurrentFlow({ ...currentFlow, [field]: value })
  }

  const updateStageField = (stageId: number, field: keyof Stage, value: any): void => {
    if (!currentFlow) return
    console.log('📝 Updating stage field:', { stageId, field, value })
    const updatedStages = currentFlow.stages.map(stage =>
      stage.id === stageId ? { ...stage, [field]: value } : stage
    )
    console.log('📝 Updated stages:', updatedStages)

    // Log the specific stage that was updated
    const updatedStage = updatedStages.find(s => s.id === stageId)
    console.log('📝 Updated stage object:', updatedStage)
    console.log('📝 Updated stage assignment_target_id:', updatedStage?.assignment_target_id)

    setCurrentFlow({ ...currentFlow, stages: updatedStages })
    // Removed setModalKey - was causing input to lose focus on every keystroke
    console.log('📝 State updated')
  }

  const updateStageFields = (stageId: number, updates: Partial<Stage>): void => {
    if (!currentFlow) return
    console.log('📝 Updating stage fields:', { stageId, updates })
    const updatedStages = currentFlow.stages.map(stage =>
      stage.id === stageId ? { ...stage, ...updates } : stage
    )

    // Log the specific stage that was updated
    const updatedStage = updatedStages.find(s => s.id === stageId)
    console.log('📝 Updated stage object:', updatedStage)
    console.log('📝 Updated stage assignment_target_id:', updatedStage?.assignment_target_id)

    setCurrentFlow({ ...currentFlow, stages: updatedStages })
    // Removed setModalKey - was causing input to lose focus on every keystroke
    console.log('📝 State updated')
  }

  const addStage = async (): Promise<void> => {
    if (!currentFlow) return

    try {
      const newOrder = (currentFlow.stages || []).length + 1
      const response = await stages.create(currentFlow.id, {
        name: `Stage ${newOrder}`,
        order: newOrder,
        assignment_type: AssignmentType.USER,
        assignment_target_id: undefined,
        is_approval_stage: false,
        description: undefined,
      })

      const newStage: Stage = {
        ...response.data,
        form_fields: response.data.form_fields || []
      }

      const updatedStages = [...(currentFlow.stages || []), newStage]

      setCurrentFlow({
        ...currentFlow,
        stages: updatedStages
      })

      const currentTemplates = Array.isArray(allTemplates) ? allTemplates : []
      setAllTemplates(currentTemplates.map(template =>
        template.id === currentFlow.id
          ? { ...template, stage_count: updatedStages.length }
          : template
      ))
    } catch (error) {
      console.error('Failed to add stage:', error)
      alert('Failed to add stage. Please try again.')
    }
  }

  const deleteStage = async (stageId: number): Promise<void> => {
    if (!currentFlow) return
    if (!confirm('Delete this stage? This cannot be undone.')) return

    try {
      await stages.delete(currentFlow.id, stageId)

      const updatedStages = currentFlow.stages
        .filter(s => s.id !== stageId)
        .map((stage, index) => ({ ...stage, order: index + 1 }))

      setCurrentFlow({ ...currentFlow, stages: updatedStages })

      const currentTemplates = Array.isArray(allTemplates) ? allTemplates : []
      setAllTemplates(currentTemplates.map(template =>
        template.id === currentFlow.id
          ? { ...template, stage_count: updatedStages.length }
          : template
      ))
    } catch (error) {
      console.error('Failed to delete stage:', error)
      alert('Failed to delete stage. Please try again.')
    }
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (!currentFlow || !over || active.id === over.id) return

    const oldIndex = currentFlow.stages.findIndex(s => s.id === active.id)
    const newIndex = currentFlow.stages.findIndex(s => s.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reorderedStages = arrayMove(currentFlow.stages, oldIndex, newIndex)
      .map((stage, index) => ({ ...stage, order: index + 1 }))

    setCurrentFlow({ ...currentFlow, stages: reorderedStages })

    const currentTemplates = Array.isArray(allTemplates) ? allTemplates : []
    setAllTemplates(currentTemplates.map(template =>
      template.id === currentFlow.id
        ? { ...template, stage_count: reorderedStages.length }
        : template
    ))
  }

  const addFormField = async (stageId: number): Promise<void> => {
    if (!currentFlow) return

    try {
      const stage = currentFlow.stages.find(s => s.id === stageId)
      if (!stage) {
        console.error('Stage not found:', stageId)
        return
      }

      const newOrder = (stage.form_fields || []).length + 1

      const response = await formFields.create(currentFlow.id, stageId, {
        field_type: FieldType.TEXT,
        label: 'New Field',
        is_required: false,
        order: newOrder
      })

      const updatedStages = currentFlow.stages.map(s =>
        s.id === stageId
          ? { ...s, form_fields: [...(s.form_fields || []), response.data] }
          : s
      )
      setCurrentFlow({ ...currentFlow, stages: updatedStages })
    } catch (error) {
      console.error('Failed to add form field:', error)
      alert('Failed to add form field. Please try again.')
    }
  }

  const updateFormField = (stageId: number, fieldId: number, field: keyof FormField, value: any): void => {
    if (!currentFlow) return

    const updatedStages = currentFlow.stages.map(stage => {
      if (stage.id === stageId) {
        const updatedFields = stage.form_fields.map(f =>
          f.id === fieldId ? { ...f, [field]: value } : f
        )
        return { ...stage, form_fields: updatedFields }
      }
      return stage
    })
    setCurrentFlow({ ...currentFlow, stages: updatedStages })
  }

  const deleteFormField = async (stageId: number, fieldId: number): Promise<void> => {
    if (!currentFlow) return
    if (!confirm('Delete this field?')) return

    try {
      await formFields.delete(currentFlow.id, stageId, fieldId)

      const updatedStages = currentFlow.stages.map(stage =>
        stage.id === stageId
          ? { ...stage, form_fields: stage.form_fields.filter(f => f.id !== fieldId) }
          : stage
      )
      setCurrentFlow({ ...currentFlow, stages: updatedStages })
    } catch (error) {
      console.error('Failed to delete form field:', error)
      alert('Failed to delete form field. Please try again.')
    }
  }

  const deleteFlow = async (flowId: number, event?: React.MouseEvent): Promise<void> => {
    event?.stopPropagation()

    if (!confirm('Are you sure you want to delete this flow? This cannot be undone.')) {
      return
    }

    try {
      await flowTemplates.delete(flowId)

      const currentTemplates = Array.isArray(allTemplates) ? allTemplates : []
      setAllTemplates(currentTemplates.filter(t => t.id !== flowId))

      if (currentFlow?.id === flowId) {
        setCurrentFlow(null)
      }
    } catch (error) {
      console.error('Failed to delete flow:', error)
      alert('Failed to delete flow. Please try again.')
    }
  }

  const saveFlow = async (): Promise<void> => {
    if (!currentFlow) return

    setSaveStatus('saving')

    try {
      await flowTemplates.update(currentFlow.id, {
        name: currentFlow.name,
        description: currentFlow.description,
      })

      for (const stage of currentFlow.stages) {
        await stages.update(currentFlow.id, stage.id, {
          name: stage.name,
          order: stage.order,
          description: stage.description,
          assignment_type: stage.assignment_type,
          assignment_target_id: stage.assignment_target_id,
          is_approval_stage: stage.is_approval_stage,
        })

        for (const field of stage.form_fields) {
          const updateData: any = {
            field_type: field.field_type,
            label: field.label,
            order: field.order
          }

          // Only include 'required' if it has a defined value (not undefined)
          if (field.is_required !== undefined) {
            updateData.required = field.is_required
          }

          console.log('🔧 Updating field:', field.id, 'with data:', updateData)
          try {
            await formFields.update(currentFlow.id, stage.id, field.id, updateData)
          } catch (fieldError: any) {
            console.error('❌ Failed to update field:', field.id)
            console.error('❌ Error response:', fieldError.response?.data)
            console.error('❌ Error detail array:', fieldError.response?.data?.detail)
            if (fieldError.response?.data?.detail) {
              fieldError.response.data.detail.forEach((err: any, idx: number) => {
                console.error(`❌ Error ${idx}:`, JSON.stringify(err, null, 2))
              })
            }
            throw fieldError
          }
        }
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)

      await loadFlowTemplates()
    } catch (error) {
      console.error('Failed to save flow:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Flow Templates List */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Flow Templates</h2>
            <button onClick={createNewFlow} className="btn btn-primary btn-sm">
              <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
          </div>

          {/* Templates List */}
          <div className="space-y-2">
            {(allTemplates || []).length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-10 w-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-slate-600 mb-4">No flow templates yet</p>
                <button className="btn btn-sm btn-ghost text-primary" onClick={createNewFlow}>
                  Create your first flow
                </button>
              </div>
            ) : (
              (allTemplates || []).map((template) => (
                <div
                  key={template.id}
                  onClick={() => loadFlow(template.id)}
                  className={`cursor-pointer p-4 rounded-lg border transition-colors relative group ${
                    currentFlow?.id === template.id
                      ? 'bg-blue-50 border-primary'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="font-semibold text-sm text-slate-900 line-clamp-1 flex-1 pr-2">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {currentFlow?.id === template.id
                          ? (currentFlow.stages?.length || 0)
                          : (template.stages?.length || 0)} stages
                      </span>
                      <button
                        onClick={(e) => deleteFlow(template.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost btn-xs btn-square text-error hover:bg-error hover:text-white"
                        title="Delete flow"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {template.description || 'No description'}
                  </p>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Flow Editor */}
        <section className="lg:col-span-9">
          {!currentFlow ? (
            <div className="card bg-white shadow-sm border border-slate-200">
              <div className="card-body text-center p-12">
                <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Welcome to Flow Designer</h3>
                <p className="text-slate-600 mb-6">Select a flow template from the left or create a new one to get started</p>
                <button className="btn btn-primary" onClick={createNewFlow}>
                  Create New Flow
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Flow Header */}
              <div className="card bg-white shadow-sm border border-slate-200 mb-6">
                <div className="card-body">
                  {isEditMode ? (
                    <>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={currentFlow.name}
                            onChange={(e) => updateFlowField('name', e.target.value)}
                            placeholder="Flow Name"
                            className="input input-bordered w-full text-2xl font-bold bg-white"
                          />
                          <textarea
                            value={currentFlow.description || ''}
                            onChange={(e) => updateFlowField('description', e.target.value)}
                            placeholder="Add a description..."
                            rows={2}
                            className="textarea textarea-bordered w-full mt-2 text-sm resize-none bg-white"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await saveFlow()
                              setIsEditMode(false)
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            {saveStatus === 'saving' && <span className="loading loading-spinner loading-xs"></span>}
                            {saveStatus === 'saved' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>}
                            {(saveStatus === 'idle' || saveStatus === 'error') && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                            Save
                          </button>
                          <button
                            onClick={() => {
                              loadFlow(currentFlow.id)
                            }}
                            className="btn btn-ghost btn-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      {saveStatus === 'saved' && (
                        <div className="alert alert-success">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span>Saved successfully!</span>
                        </div>
                      )}

                      {saveStatus === 'error' && (
                        <div className="alert alert-error">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <span>Save failed. Please try again.</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">{currentFlow.name}</h1>
                        {currentFlow.description && (
                          <p className="text-sm text-slate-600">{currentFlow.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setIsEditMode(true)}
                        className="btn btn-primary btn-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Stages Section */}
              <div className="card bg-white shadow-sm border border-slate-200">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Workflow Stages</h2>
                    {isEditMode && (
                      <button onClick={addStage} className="btn btn-primary btn-sm">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Stage
                      </button>
                    )}
                  </div>

                  {currentFlow.stages?.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-lg">
                      <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No stages yet</h3>
                      <p className="text-sm text-slate-600 mb-6">Start building your workflow by adding the first stage</p>
                      <button onClick={addStage} className="btn btn-primary">
                        Add First Stage
                      </button>
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={currentFlow.stages.map(s => s.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {(currentFlow.stages || []).map((stage, index) => (
                            <SortableStageCard
                              key={stage.id}
                              stage={stage}
                              index={index}
                              allUsers={allUsers}
                              isEditMode={isEditMode}
                              onEditStage={setEditingStage}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>

              {/* Stage Edit Modal */}
              {editingStage && (() => {
                // Get the current version of the stage from currentFlow (with all updates)
                console.log('🔄 currentFlow.stages:', currentFlow.stages)
                const currentStageData = currentFlow.stages.find(s => s.id === editingStage.id)
                if (!currentStageData) return null

                console.log('🔄 Rendering modal with stage:', currentStageData)
                console.log('🔄 Stage assignment_target_id:', currentStageData.assignment_target_id)

                return (
                  <StageEditModal
                    key={`modal-${editingStage.id}-${currentStageData.assignment_target_id}`}
                    stage={currentStageData}
                    stageNumber={currentFlow.stages.findIndex(s => s.id === editingStage.id) + 1}
                    allUsers={allUsers}
                    onClose={() => setEditingStage(null)}
                    onSave={async (updatedStage) => {
                      const updatedStages = currentFlow.stages.map(s =>
                        s.id === updatedStage.id ? updatedStage : s
                      )
                      setCurrentFlow({ ...currentFlow, stages: updatedStages })
                      setEditingStage(null)
                    }}
                    onDelete={async () => {
                      await deleteStage(editingStage.id)
                      setEditingStage(null)
                    }}
                    updateStageField={updateStageField}
                    updateStageFields={updateStageFields}
                    addFormField={addFormField}
                    updateFormField={updateFormField}
                    deleteFormField={deleteFormField}
                  />
                )
              })()}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

// Stage Edit Modal Component
function StageEditModal({
  stage,
  stageNumber,
  allUsers,
  onClose,
  onSave,
  onDelete,
  updateStageField,
  updateStageFields,
  addFormField,
  updateFormField,
  deleteFormField
}: StageEditModalProps): React.ReactElement {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gray-800 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-primary flex items-center justify-center font-bold text-lg">
              {stageNumber}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Edit Stage</h2>
              <p className="text-sm text-gray-300">Configure stage details and form fields</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle text-white hover:bg-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Stage Name */}
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">Stage Name</label>
            <input
              type="text"
              value={stage.name}
              onChange={(e) => updateStageField(stage.id, 'name', e.target.value)}
              placeholder="Enter stage name..."
              className="input input-bordered w-full bg-white"
            />
          </div>

          {/* Assignment & Approval Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Assigned To</label>
              <select
                value={stage.assignment_target_id ?? ''}
                onClick={(e) => {
                  console.log('👆 Select clicked!', e.target)
                  console.log('👆 Current stage.assignment_target_id:', stage.assignment_target_id)
                }}
                onChange={(e) => {
                  console.log('🎯 User selection changed:', e.target.value)
                  const value = e.target.value
                  const userId = value === '' ? null : parseInt(value)
                  console.log('🎯 Parsed user ID:', userId)
                  console.log('🎯 Stage ID:', stage.id)

                  // Update both fields at once to avoid race condition
                  updateStageFields(stage.id, {
                    assignment_target_id: userId,
                    assignment_type: userId !== null ? AssignmentType.USER : stage.assignment_type
                  })

                  console.log('🎯 Updated stage assignment')
                }}
                className="select select-bordered bg-white w-full pr-10 border-2 border-gray-300 focus:border-primary"
              >
                <option value="">Select user...</option>
                {Array.isArray(allUsers) && allUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Approval Settings</label>
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={stage.is_approval_stage}
                  onChange={(e) => updateStageField(stage.id, 'is_approval_stage', e.target.checked)}
                  className="checkbox checkbox-primary"
                />
                <div>
                  <span className="font-medium text-gray-900">Requires Approval</span>
                  <p className="text-xs text-gray-500">Assignee must approve to proceed</p>
                </div>
              </label>
            </div>
          </div>

          {/* Stage Instructions */}
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700">
              Stage Instructions
              <span className="text-xs text-gray-500 font-normal ml-2">(shown to assignee)</span>
            </label>
            <textarea
              value={stage.description || ''}
              onChange={(e) => updateStageField(stage.id, 'description', e.target.value)}
              placeholder="Provide detailed instructions for completing this stage..."
              rows={4}
              className="textarea textarea-bordered bg-white w-full"
            />
          </div>

          {/* Form Fields Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-700">Form Fields</label>
              <button
                onClick={() => addFormField(stage.id)}
                className="btn btn-primary btn-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Field
              </button>
            </div>

            {stage.form_fields?.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <svg className="mx-auto h-10 w-10 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm text-gray-600 mb-2">No form fields yet</p>
                <p className="text-xs text-gray-500">Click "Add Field" to create a form field for this stage</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stage.form_fields.map(field => (
                  <FormFieldItem
                    key={field.id}
                    field={field}
                    stageId={stage.id}
                    updateFormField={updateFormField}
                    deleteFormField={deleteFormField}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onDelete}
            className="btn btn-error btn-outline"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Stage
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button
              onClick={() => onSave(stage)}
              className="btn btn-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Form Field Item Component
function FormFieldItem({ field, stageId, updateFormField, deleteFormField }: FormFieldItemProps): React.ReactElement {
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-primary-300 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-3">
          <label className="label"><span className="label-text text-xs font-bold text-gray-700">Field Type</span></label>
          <select
            value={field.field_type}
            onChange={(e) => updateFormField(stageId, field.id, 'field_type', e.target.value as FieldType)}
            className="select select-bordered select-sm w-full bg-white"
          >
            <option value={FieldType.TEXT}>Text</option>
            <option value={FieldType.NUMBER}>Number</option>
            <option value={FieldType.DATE}>Date</option>
            <option value={FieldType.ATTACHMENT}>Attachment</option>
            <option value={FieldType.CHECKBOX}>Checkbox</option>
          </select>
        </div>

        <div className="md:col-span-6">
          <label className="label"><span className="label-text text-xs font-bold text-gray-700">Field Label</span></label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => updateFormField(stageId, field.id, 'label', e.target.value)}
            placeholder="e.g., Employee Name, Budget Amount..."
            className="input input-bordered input-sm w-full bg-white"
          />
        </div>

        <div className="md:col-span-3 flex items-end gap-2">
          <label className="label cursor-pointer gap-2 flex-1">
            <input
              type="checkbox"
              checked={field.is_required}
              onChange={(e) => updateFormField(stageId, field.id, 'is_required', e.target.checked)}
              className="checkbox checkbox-primary checkbox-sm"
            />
            <span className="label-text text-xs font-medium">Required</span>
          </label>

          <button
            onClick={() => deleteFormField(stageId, field.id)}
            className="btn btn-ghost btn-sm btn-square text-error hover:bg-error hover:text-white"
            title="Delete field"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default FlowDesigner
