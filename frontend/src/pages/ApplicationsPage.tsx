import React, { useEffect, useState } from 'react';
import type { Application, CreateApplicationRequest } from '../types';
import { api } from '../services/api';
import { Plus, GitFork, Mail, ShieldAlert, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateApplicationRequest>({
    name: '',
    description: '',
    repositoryUrl: '',
    ownerEmail: '',
    language: 'C# / ASP.NET Core',
    tier: 'Tier2_BusinessCore',
  });
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getApplications();
      setApps(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.createApplication(form);
      setShowModal(false);
      setForm({
        name: '',
        description: '',
        repositoryUrl: '',
        ownerEmail: '',
        language: 'C# / ASP.NET Core',
        tier: 'Tier2_BusinessCore',
      });
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to create application');
    }
  };

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Service Catalog</h1>
          <p className="page-subtitle">Managed microservices, registered repositories, and service tier governance</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} /> Register Service
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading services...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {apps.map((app) => {
            const isCritical = app.healthStatus === 'Degraded';
            return (
              <div key={app.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{app.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>{app.language}</span>
                  </div>

                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: isCritical ? '#ef4444' : '#10b981',
                    border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                  }}>
                    {isCritical ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                    {app.healthStatus}
                  </span>
                </div>

                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4, minHeight: '2.5rem' }}>
                  {app.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Mail size={13} /> {app.ownerEmail}
                  </span>
                </div>

                <div style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  border: '1px solid var(--border-subtle)'
                }}>
                  <span>Deployments: <strong style={{ color: 'var(--text-primary)' }}>{app.activeDeploymentsCount}</strong></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: app.openVulnerabilitiesCount > 0 ? '#ff8800' : 'var(--text-muted)' }}>
                    <ShieldAlert size={14} /> {app.openVulnerabilitiesCount} Open CVEs
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {app.tier.replace('_', ' ')}
                  </span>
                  <a
                    href={app.repositoryUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <GitFork size={13} /> Repo
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Register Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Register New Service</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#fca5a5', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Service Identifier Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. payment-service"
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Distributed payment processor"
                    className="form-input"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Git Repository URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/org/repo"
                    className="form-input"
                    value={form.repositoryUrl}
                    onChange={(e) => setForm({ ...form, repositoryUrl: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Owner Team Email</label>
                  <input
                    type="email"
                    required
                    placeholder="team@secureops.internal"
                    className="form-input"
                    value={form.ownerEmail}
                    onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Language / Framework</label>
                    <select
                      className="form-select"
                      value={form.language}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                    >
                      <option value="C# / ASP.NET Core">C# / ASP.NET Core</option>
                      <option value="TypeScript / Node.js">TypeScript / Node.js</option>
                      <option value="Python 3.12">Python 3.12</option>
                      <option value="Go">Go</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Service Criticality Tier</label>
                    <select
                      className="form-select"
                      value={form.tier}
                      onChange={(e) => setForm({ ...form, tier: e.target.value as any })}
                    >
                      <option value="Tier1_MissionCritical">Tier 1 (Mission Critical)</option>
                      <option value="Tier2_BusinessCore">Tier 2 (Business Core)</option>
                      <option value="Tier3_Internal">Tier 3 (Internal Support)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
