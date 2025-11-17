import React from 'react';
import { Stage } from '../types';

interface FlowProgressProps {
  stages: Stage[];
  currentStageId: number | null;
  className?: string;
}

/**
 * FlowProgress - Displays a vertical list of flow stages with current stage highlighted
 *
 * Shows stage order, name, and highlights the current active stage
 * POC simplification: No completion checkmarks, just current stage indicator
 *
 * @param stages - Array of stages in the flow
 * @param currentStageId - ID of the currently active stage (null if flow not started or completed)
 * @param className - Optional CSS classes for styling
 */
const FlowProgress: React.FC<FlowProgressProps> = ({
  stages,
  currentStageId,
  className = ''
}) => {
  // Sort stages by order
  const sortedStages = [...(stages || [])].sort((a, b) => a.order - b.order);

  if (!stages || stages.length === 0) {
    return (
      <div className={`text-gray-500 italic ${className}`}>
        No stages defined for this flow
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {sortedStages.map((stage, index) => {
        const isCurrent = stage.id === currentStageId;
        const isPast = currentStageId !== null && stage.order < (sortedStages.find(s => s.id === currentStageId)?.order || 0);

        return (
          <div
            key={stage.id}
            className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
              isCurrent
                ? 'border-primary bg-primary/10'
                : isPast
                ? 'border-success bg-success/5'
                : 'border-base-300 bg-base-100'
            }`}
          >
            {/* Stage Number Badge */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                isCurrent
                  ? 'bg-primary text-primary-content'
                  : isPast
                  ? 'bg-success text-success-content'
                  : 'bg-base-300 text-base-content'
              }`}
            >
              {stage.order}
            </div>

            {/* Stage Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold truncate ${
                    isCurrent ? 'text-primary' : ''
                  }`}
                >
                  {stage.name}
                </span>
                {isCurrent && (
                  <span className="badge badge-primary badge-sm">Current</span>
                )}
                {isPast && (
                  <span className="badge badge-success badge-sm">✓</span>
                )}
              </div>
              {stage.description && (
                <p className="text-sm text-gray-600 truncate mt-1">
                  {stage.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FlowProgress;
