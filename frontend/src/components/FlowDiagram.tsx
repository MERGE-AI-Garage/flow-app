import React from 'react';
import { Stage } from '../types';

interface FlowDiagramProps {
  stages: Stage[];
  currentStageId?: number | null;
  className?: string;
}

/**
 * FlowDiagram - Visual Mermaid-style diagram showing flow stages vertically
 *
 * Displays a top-down flow diagram with:
 * - Stage boxes with names
 * - Arrows showing progression
 * - Current stage highlighted
 * - Clean, modern styling
 *
 * POC simplification: Linear flow only (no branching), static diagram (no interactivity)
 * Usage: Active Flows and My Tasks views only (NOT in Flow Designer)
 *
 * @param stages - Array of stages in the flow
 * @param currentStageId - Optional ID of currently active stage (for highlighting)
 * @param className - Optional CSS classes for styling
 */
const FlowDiagram: React.FC<FlowDiagramProps> = ({
  stages,
  currentStageId = null,
  className = ''
}) => {
  // Sort stages by order
  const sortedStages = [...(stages || [])].sort((a, b) => a.order - b.order);

  if (!stages || stages.length === 0) {
    return (
      <div className={`text-gray-500 italic text-center ${className}`}>
        No stages defined for this flow
      </div>
    );
  }

  const currentStageIndex = currentStageId
    ? sortedStages.findIndex(s => s.id === currentStageId)
    : -1;

  return (
    <div className={`flex flex-col items-center py-4 ${className}`}>
      {sortedStages.map((stage, index) => {
        const isCurrent = stage.id === currentStageId;
        const isPast = currentStageIndex >= 0 && index < currentStageIndex;
        const isFuture = currentStageIndex >= 0 && index > currentStageIndex;

        return (
          <React.Fragment key={stage.id}>
            {/* Stage Box */}
            <div
              className={`relative w-full max-w-md px-6 py-4 rounded-lg border-2 transition-all ${
                isCurrent
                  ? 'border-primary bg-primary/10 shadow-lg scale-105'
                  : isPast
                  ? 'border-success bg-success/5'
                  : isFuture
                  ? 'border-base-300 bg-base-100 opacity-60'
                  : 'border-base-300 bg-base-100'
              }`}
            >
              {/* Stage Number Badge */}
              <div
                className={`absolute -top-3 -left-3 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-md ${
                  isCurrent
                    ? 'bg-primary text-primary-content'
                    : isPast
                    ? 'bg-success text-success-content'
                    : 'bg-base-300 text-base-content'
                }`}
              >
                {stage.order}
              </div>

              {/* Stage Content */}
              <div className="ml-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className={`font-bold text-lg ${
                      isCurrent ? 'text-primary' : 'text-base-content'
                    }`}
                  >
                    {stage.name}
                  </h3>
                  {isCurrent && (
                    <span className="badge badge-primary badge-sm">Current</span>
                  )}
                  {isPast && (
                    <span className="badge badge-success badge-sm">✓ Done</span>
                  )}
                </div>
                {stage.description && (
                  <p className="text-sm text-gray-600 mt-1">
                    {stage.description}
                  </p>
                )}
                {stage.is_approval_stage && (
                  <div className="badge badge-warning badge-sm mt-2">
                    Approval Required
                  </div>
                )}
              </div>
            </div>

            {/* Arrow to Next Stage */}
            {index < sortedStages.length - 1 && (
              <div className="flex flex-col items-center my-2">
                <div
                  className={`w-1 h-8 ${
                    isPast ? 'bg-success' : 'bg-base-300'
                  }`}
                />
                <svg
                  className={`w-6 h-6 ${
                    isPast ? 'text-success' : 'text-base-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a1 1 0 01-.707-.293l-7-7a1 1 0 011.414-1.414L10 15.586l6.293-6.293a1 1 0 011.414 1.414l-7 7A1 1 0 0110 18z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FlowDiagram;
