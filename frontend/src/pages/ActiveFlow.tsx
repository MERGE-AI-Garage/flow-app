import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flowInstances, tasks, users } from '../api';
import { FlowInstanceDetailResponse, FlowStatus, FieldType } from '../types';
import TimerDisplay from '../components/TimerDisplay';
import FlowDiagram from '../components/FlowDiagram';
import FlowProgress from '../components/FlowProgress';
import FormRenderer from '../components/FormRenderer';

/**
 * ActiveFlow Page - View and complete a flow instance
 *
 * Displays:
 * - Flow title, status, and elapsed time
 * - Visual diagram or list view of stages (toggle)
 * - Current stage instructions
 * - Form fields for current stage (if user is assignee)
 * - Complete button (or "Complete Flow" if final stage)
 *
 * POC simplifications:
 * - No activity logs
 * - No comments
 * - No reassignment
 * - No approval stage logic (approve/reject)
 */
const ActiveFlow: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [flowInstance, setFlowInstance] = useState<FlowInstanceDetailResponse | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Record<number, any>>({});
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('diagram');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load current user
      const userResponse = await users.getCurrentUser();
      setCurrentUserId(userResponse.data.id);

      // Load flow instance
      if (id) {
        const flowResponse = await flowInstances.get(Number(id));
        setFlowInstance(flowResponse.data);
      }
    } catch (err: any) {
      console.error('Failed to load flow instance:', err);
      setError(
        err.response?.data?.detail || 'Failed to load flow. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: number, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!flowInstance?.current_stage) return false;

    const currentStageFields = flowInstance.current_stage.form_fields || [];
    const requiredFields = currentStageFields.filter((f) => f.is_required);

    for (const field of requiredFields) {
      const value = formData[field.id];
      if (field.field_type === FieldType.CHECKBOX) {
        continue; // Checkboxes are never "required" in the validation sense
      }
      if (value === undefined || value === null || value === '') {
        return false;
      }
    }

    return true;
  };

  const handleComplete = async () => {
    if (!flowInstance?.current_stage) return;

    if (!validateForm()) {
      setError('Please fill in all required fields before completing this stage.');
      return;
    }

    // Find current task for this user
    const currentTask = (flowInstance.flow_template?.stages || [])
      .find((s) => s.id === flowInstance.current_stage_id)
      ?.id;

    if (!currentTask) {
      setError('Unable to find current task. Please refresh and try again.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // We need to get the task ID - for POC, we'll use the flow instance ID approach
      // In a real implementation, we'd need to track the actual task instance ID
      // For now, let's make an assumption that we can derive it or pass it differently

      // Complete the task - we'll need to modify this based on actual backend response
      // that includes task IDs in the flow instance detail
      const response = await tasks.complete(flowInstance.id, {
        form_data: formData,
      });

      // Show success message
      alert(response.data.message);

      // Navigate back to My Tasks
      navigate('/my-tasks');
    } catch (err: any) {
      console.error('Failed to complete task:', err);
      setError(
        err.response?.data?.detail ||
          'Failed to complete task. Please try again.'
      );
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error && !flowInstance) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
        <button
          className="btn btn-primary mt-4"
          onClick={() => navigate('/my-tasks')}
        >
          Back to My Tasks
        </button>
      </div>
    );
  }

  if (!flowInstance) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>Flow not found</span>
        </div>
        <button
          className="btn btn-primary mt-4"
          onClick={() => navigate('/my-tasks')}
        >
          Back to My Tasks
        </button>
      </div>
    );
  }

  const isAssignedToCurrentUser =
    currentUserId === flowInstance.current_assignee_id;
  const isCompleted = flowInstance.status === FlowStatus.COMPLETED;
  const currentStage = flowInstance.current_stage;
  const sortedStages = [...(flowInstance.flow_template?.stages || [])].sort(
    (a, b) => a.order - b.order
  );
  const nextStage = currentStage
    ? sortedStages.find((s) => s.order === currentStage.order + 1)
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-slate-900">{flowInstance.title}</h1>
          <div className="flex items-center gap-2">
            <TimerDisplay
              startedAt={flowInstance.started_at}
              completedAt={flowInstance.completed_at}
              className="text-lg"
            />
          </div>
        </div>
        {flowInstance.description && (
          <p className="text-slate-600">{flowInstance.description}</p>
        )}
        <div className="text-sm text-slate-500 mt-2">
          Template: {flowInstance.flow_template?.name || 'Unknown'} • Initiated by:{' '}
          {flowInstance.initiator?.full_name || flowInstance.initiator?.email || 'Unknown'}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* View Toggle */}
      <div className="flex justify-end mb-4">
        <div className="btn-group">
          <button
            className={`btn btn-sm ${viewMode === 'diagram' ? 'btn-active' : ''}`}
            onClick={() => setViewMode('diagram')}
          >
            Diagram View
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Flow Visualization */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div>
              <h2 className="text-lg font-bold mb-4">Flow Progress</h2>
              {viewMode === 'diagram' ? (
                <FlowDiagram
                  stages={flowInstance.flow_template?.stages || []}
                  currentStageId={flowInstance.current_stage_id}
                />
              ) : (
                <FlowProgress
                  stages={flowInstance.flow_template?.stages || []}
                  currentStageId={flowInstance.current_stage_id}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Current Stage Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-xl p-6">
            <div>
              {isCompleted ? (
                <div className="alert alert-success">
                  <span className="font-bold">✓ Flow Completed</span>
                </div>
              ) : currentStage ? (
                <>
                  <h2 className="text-2xl font-bold mb-4">
                    Current Stage: {currentStage.name}
                  </h2>

                  {/* Stage Instructions */}
                  {currentStage.description && (
                    <div className="alert alert-info mb-4">
                      <div>
                        <div className="font-semibold">Instructions:</div>
                        <p className="text-sm mt-1">{currentStage.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Assignee Info */}
                  <div className="mb-4">
                    <span className="font-semibold">Assigned to: </span>
                    {flowInstance.current_assignee ? (
                      <span>
                        {flowInstance.current_assignee.full_name ||
                          flowInstance.current_assignee.email}
                        {isAssignedToCurrentUser && (
                          <span className="badge badge-primary ml-2">You</span>
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-500">Unassigned</span>
                    )}
                  </div>

                  {/* Form Fields (only if assigned to current user) */}
                  {isAssignedToCurrentUser ? (
                    <>
                      <div className="divider"></div>
                      <h3 className="font-bold text-lg mb-4">Complete This Stage</h3>
                      <FormRenderer
                        fields={currentStage.form_fields || []}
                        values={formData}
                        onChange={handleFieldChange}
                      />

                      {/* Complete Button */}
                      <div className="card-actions justify-end mt-6">
                        <button
                          className="btn btn-primary btn-lg"
                          onClick={handleComplete}
                          disabled={submitting || !validateForm()}
                        >
                          {submitting ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Completing...
                            </>
                          ) : nextStage ? (
                            `Complete & Handoff to ${nextStage.name}`
                          ) : (
                            'Complete Flow'
                          )}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="alert alert-warning mt-4">
                      <span>
                        This task is currently assigned to another user. You cannot
                        complete this stage.
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="alert alert-info">
                  <span>No active stage</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/my-tasks')}
          disabled={submitting}
        >
          ← Back to My Tasks
        </button>
      </div>
    </div>
  );
};

export default ActiveFlow;
