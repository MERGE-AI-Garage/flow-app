import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { flowTemplates, flowInstances } from '../api';
import { FlowTemplate } from '../types';

/**
 * NewTask Page - Initiate a new flow instance
 *
 * Allows users to:
 * 1. Select a flow template from dropdown
 * 2. Enter a title (required)
 * 3. Enter a description (optional)
 * 4. Start the flow
 *
 * On success, redirects to the ActiveFlow view
 */
const NewTask: React.FC = () => {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<FlowTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await flowTemplates.list();
      const activeTemplates = (response.data || []).filter((t) => t.is_active);
      setTemplates(activeTemplates);

      // Auto-select first template if available
      if (activeTemplates.length > 0) {
        setSelectedTemplateId(activeTemplates[0].id);
      }
    } catch (err) {
      console.error('Failed to load flow templates:', err);
      setError('Failed to load flow templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTemplateId) {
      setError('Please select a flow template');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await flowInstances.create({
        flow_template_id: selectedTemplateId,
        title: title.trim(),
        description: description.trim() || undefined,
      });

      // Success! Navigate to the active flow view
      const flowInstanceId = response.data.id;
      navigate(`/flows/${flowInstanceId}`);
    } catch (err: any) {
      console.error('Failed to create flow instance:', err);
      setError(
        err.response?.data?.detail ||
          'Failed to start flow. Please try again.'
      );
      setSubmitting(false);
    }
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="alert alert-warning">
          <span>
            No active flow templates available. Please create a flow template
            first in the Flow Designer.
          </span>
        </div>
        <button
          className="btn btn-primary mt-4"
          onClick={() => navigate('/flows/designer')}
        >
          Go to Flow Designer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Start New Task</h1>

      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card bg-white shadow-xl border border-slate-200">
        <div className="card-body space-y-4">
          {/* Flow Template Selection */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">
                Flow Template <span className="text-error">*</span>
              </span>
            </label>
            <select
              className="select select-bordered w-full bg-white"
              value={selectedTemplateId || ''}
              onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
              required
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate?.description && (
              <label className="label">
                <span className="label-text-alt text-slate-600">
                  {selectedTemplate.description}
                </span>
              </label>
            )}
          </div>

          {/* Template Info */}
          {selectedTemplate && (
            <div className="alert alert-info">
              <div>
                <div className="font-semibold">
                  This flow has {selectedTemplate.stages?.length || 0} stages
                </div>
                {selectedTemplate.stages && selectedTemplate.stages.length > 0 && (
                  <div className="text-sm mt-1">
                    Stages:{' '}
                    {selectedTemplate.stages
                      .sort((a, b) => a.order - b.order)
                      .map((s) => s.name)
                      .join(' → ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">
                Title <span className="text-error">*</span>
              </span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full bg-white"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title for this task"
              required
            />
            <label className="label">
              <span className="label-text-alt text-slate-600">
                Give this task a unique, descriptive name
              </span>
            </label>
          </div>

          {/* Description Textarea */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Description</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full bg-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description or additional context"
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="card-actions justify-end mt-6">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => navigate('/my-tasks')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !title.trim()}
            >
              {submitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Starting Flow...
                </>
              ) : (
                'Start Flow'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewTask;
