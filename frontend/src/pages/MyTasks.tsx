import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { users } from '../api';
import { TaskInstanceDetailResponse } from '../types';
import TimerDisplay from '../components/TimerDisplay';
import { useUser } from '../contexts/UserContext';

/**
 * MyTasks Page - Display all tasks assigned to current user
 *
 * Shows:
 * - List of pending tasks grouped by flow template
 * - Flow title, current stage, elapsed time
 * - Click to navigate to ActiveFlow view
 *
 * POC simplifications:
 * - No filtering or sorting
 * - No search
 * - Flat list (grouping optional)
 */
function MyTasks(): React.ReactElement {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState<boolean>(true);
  const [tasks, setTasks] = useState<TaskInstanceDetailResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reload tasks whenever the current user changes
  useEffect(() => {
    if (currentUser) {
      loadTasks();
    }
  }, [currentUser]);

  const loadTasks = async (): Promise<void> => {
    if (!currentUser) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await users.getUserTasks(currentUser.id);
      const tasksArray = Array.isArray(response.data) ? response.data : [];
      setTasks(tasksArray);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: TaskInstanceDetailResponse) => {
    if (task.flow_instance) {
      navigate(`/flows/${task.flow_instance.id}`);
    }
  };

  const renderTaskCard = (task: TaskInstanceDetailResponse): React.ReactElement => {
    const flowInstance = task.flow_instance;
    const stage = task.stage;

    if (!flowInstance) return <></>;

    return (
      <div
        key={task.id}
        className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-slate-200 p-6"
        onClick={() => handleTaskClick(task)}
      >
        <div>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Flow Title */}
              <h4 className="text-lg font-semibold text-slate-900 mb-1">
                {flowInstance.title}
              </h4>

              {/* Current Stage */}
              <p className="text-sm text-slate-600 mb-2">
                Current Stage:{' '}
                <span className="font-medium text-primary">
                  {stage?.name || 'N/A'}
                </span>
              </p>

              {/* Flow Description */}
              {flowInstance.description && (
                <p className="text-sm text-slate-700 mb-2">
                  {flowInstance.description}
                </p>
              )}

              {/* Template Name */}
              <p className="text-xs text-slate-500 mb-2">
                Template: {flowInstance.flow_template?.name || 'Unknown'}
              </p>

              {/* Elapsed Time */}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <TimerDisplay
                  startedAt={flowInstance.started_at}
                  completedAt={flowInstance.completed_at}
                />
              </div>
            </div>

            {/* Status Badge */}
            <div>
              <span className="badge badge-primary">Pending</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Group tasks by flow template
  const groupedTasks = tasks.reduce<
    Record<string, TaskInstanceDetailResponse[]>
  >((acc, task) => {
    const templateName =
      task.flow_instance?.flow_template?.name || 'Other Flows';
    if (!acc[templateName]) {
      acc[templateName] = [];
    }
    acc[templateName].push(task);
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">My Tasks</h2>
          <p className="text-slate-600">Your assigned workflows and tasks</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/new-task')}
        >
          + Start New Task
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="loading loading-spinner loading-lg text-primary"></div>
          <p className="mt-2 text-slate-600">Loading your tasks...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="alert alert-error shadow-lg">
          <div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current flex-shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
          <button className="btn btn-sm" onClick={loadTasks}>
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-slate-900">
            No tasks assigned
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            You don't have any tasks assigned to you at the moment.
          </p>
          <button
            className="btn btn-primary mt-4"
            onClick={() => navigate('/new-task')}
          >
            Start a New Task
          </button>
        </div>
      )}

      {/* Tasks List - Grouped by Template */}
      {!loading && !error && tasks.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedTasks).map(([templateName, flowTasks]) => (
            <div key={templateName} className="mb-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                {templateName}
                <span className="badge badge-neutral ml-2">
                  {flowTasks.length}
                </span>
              </h3>
              <div className="space-y-3">
                {flowTasks.map(renderTaskCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTasks;
