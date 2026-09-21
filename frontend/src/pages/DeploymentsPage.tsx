import React, { useEffect, useState } from 'react';
import type { Deployment, Application, Environment, CreateDeploymentRequest } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/Badges';
import { Rocket, RotateCcw, Plus, X } from 'lucide-react';

export const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateDeploymentRequest>({
    applicationId: '',
    environmentId: '',
    version: '',
    commitSha: '',
    triggeredBy: 'Manual Portal Trigger',
  });
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [depData, appData, envData] = await Promise.all([
        api.getDeployments(),
        api.getApplications(),
        api.getEnvironments(),
      ]);
      setDeployments(depData);
      setApps(appData);
      setEnvs(envData);
      if (appData.length > 0 && envData.length > 0) {
        setForm((prev) => ({
          ...prev,
          applicationId: prev.applicationId || appData[0].id,
          environmentId: prev.environmentId || envData[0].id,
        }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createDeployment(form);
      setShowModal(false);
      setForm((prev) => ({ ...prev, version: '', commitSha: '' }));
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Deployment rejected by security gate');
    }
  };

  const handleRollback = async (d: Deployment) => {
    const target = prompt(`Enter target version to roll back ${d.applicationName} to:`, 'v1.0.0');
    if (!target) return;
    try {
      await api.rollbackDeployment(d.id, {
        deploymentId: d.id,
        targetVersion: target,
        performedBy: 'Lead DevSecOps Engineer',
      });
      await loadData();
    } catch (err: any) {
      alert('Rollback failed: ' + err.message);
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Deployments & Environment Promotion</h1>
          <p className="page-subtitle">Multi-environment deployments, automated policy evaluation, and instant rollbacks</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} /> Trigger Deployment
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading deployment history...</div>
      ) : (
        <div className="card">
          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Environment</th>
                  <th>Version</th>
                  <th>Commit</th>
                  <th>Triggered By</th>
                  <th>Status</th>
                  <th>Status Message</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{d.applicationName}</strong>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.07)' }}>
                        {d.environmentName}
                      </span>
                    </td>
                    <td>
                      <span className="mono">{d.version}</span>
                    </td>
                    <td>
                      <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{d.commitSha}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.triggeredBy}</span>
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: d.status === 'Failed' ? '#ef4444' : 'var(--text-secondary)' }}>
                        {d.statusMessage || 'Healthy'}
                      </span>
                    </td>
                    <td>
                      {d.status === 'Succeeded' && (
                        <button
                          onClick={() => handleRollback(d)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          title="Trigger emergency rollback"
                        >
                          <RotateCcw size={13} /> Rollback
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trigger Deployment Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Trigger New Deployment</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {error && (
                  <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Target Service</label>
                  <select
                    className="form-select"
                    value={form.applicationId}
                    onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
                  >
                    {apps.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Environment</label>
                  <select
                    className="form-select"
                    value={form.environmentId}
                    onChange={(e) => setForm({ ...form, environmentId: e.target.value })}
                  >
                    {envs.map((env) => (
                      <option key={env.id} value={env.id}>{env.name} ({env.type})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Version (SemVer)</label>
                    <input
                      type="text"
                      required
                      placeholder="v2.1.0"
                      className="form-input"
                      value={form.version}
                      onChange={(e) => setForm({ ...form, version: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Git Commit SHA</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 7a9b3c4"
                      className="form-input mono"
                      value={form.commitSha}
                      onChange={(e) => setForm({ ...form, commitSha: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Triggered By</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={form.triggeredBy}
                    onChange={(e) => setForm({ ...form, triggeredBy: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Rocket size={15} /> Execute Deployment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
