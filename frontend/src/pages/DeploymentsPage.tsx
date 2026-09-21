import React, { useEffect, useState, useMemo } from 'react';
import type { Deployment, Application, Environment, CreateDeploymentRequest } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/Badges';
import { Rocket, RotateCcw, Plus, X, Search, ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown } from 'lucide-react';

export const DeploymentsPage: React.FC = () => {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<string>('ALL');
  const [selectedEnv, setSelectedEnv] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'newest' | 'app' | 'env' | 'status'>('newest');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

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
        api.getApplications().catch(() => [] as Application[]),
        api.getEnvironments().catch(() => [] as Environment[]),
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedApp, selectedEnv, selectedStatus, pageSize]);

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

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedApp('ALL');
    setSelectedEnv('ALL');
    setSelectedStatus('ALL');
    setSortBy('newest');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedApp !== 'ALL' ||
    selectedEnv !== 'ALL' ||
    selectedStatus !== 'ALL';

  // Derived filtered & sorted deployments
  const filteredAndSortedDeployments = useMemo(() => {
    let list = deployments.filter((d) => {
      if (selectedApp !== 'ALL' && d.applicationName?.toLowerCase() !== selectedApp.toLowerCase()) return false;
      if (selectedEnv !== 'ALL' && d.environmentName?.toLowerCase() !== selectedEnv.toLowerCase()) return false;
      if (selectedStatus !== 'ALL' && d.status?.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesApp = d.applicationName?.toLowerCase().includes(q);
        const matchesEnv = d.environmentName?.toLowerCase().includes(q);
        const matchesVer = d.version?.toLowerCase().includes(q);
        const matchesCommit = d.commitSha?.toLowerCase().includes(q);
        const matchesTrigger = d.triggeredBy?.toLowerCase().includes(q);
        const matchesStatus = d.statusMessage?.toLowerCase().includes(q);
        if (!matchesApp && !matchesEnv && !matchesVer && !matchesCommit && !matchesTrigger && !matchesStatus) {
          return false;
        }
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'newest') {
        comparison = (a.id || '').localeCompare(b.id || '');
      } else if (sortBy === 'app') {
        comparison = (a.applicationName || '').localeCompare(b.applicationName || '');
      } else if (sortBy === 'env') {
        comparison = (a.environmentName || '').localeCompare(b.environmentName || '');
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return list;
  }, [deployments, searchQuery, selectedApp, selectedEnv, selectedStatus, sortBy, sortOrder]);

  const totalItems = filteredAndSortedDeployments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedDeployments = filteredAndSortedDeployments.slice(startIndex, startIndex + pageSize);

  // App & Env options for filter dropdowns
  const appFilterOptions = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((a) => set.add(a.name));
    deployments.forEach((d) => {
      if (d.applicationName) set.add(d.applicationName);
    });
    return Array.from(set).sort();
  }, [apps, deployments]);

  const envFilterOptions = useMemo(() => {
    const set = new Set<string>();
    envs.forEach((e) => set.add(e.name));
    deployments.forEach((d) => {
      if (d.environmentName) set.add(d.environmentName);
    });
    return Array.from(set).sort();
  }, [envs, deployments]);

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

      {/* Filter & Search Toolbar */}
      <div className="card filter-toolbar" style={{ marginBottom: '1.25rem' }}>
        {/* Search Input */}
        <div className="search-input-group">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by app, env, version, commit, user..."
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')} title="Clear search">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Application Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '130px', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
          >
            <option value="ALL">All Applications</option>
            {appFilterOptions.map((app) => (
              <option key={app} value={app}>
                {app}
              </option>
            ))}
          </select>

          {/* Environment Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '130px', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            value={selectedEnv}
            onChange={(e) => setSelectedEnv(e.target.value)}
          >
            <option value="ALL">All Environments</option>
            {envFilterOptions.map((env) => (
              <option key={env} value={env}>
                {env}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Succeeded">Succeeded</option>
            <option value="Failed">Failed</option>
            <option value="InProgress">In Progress</option>
            <option value="RolledBack">Rolled Back</option>
          </select>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <ArrowUpDown size={12} />
            </span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="newest">Recent</option>
              <option value="app">Application</option>
              <option value="env">Environment</option>
              <option value="status">Status</option>
            </select>

            <button
              className="btn btn-secondary"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              title={`Toggle sort order (Current: ${sortOrder.toUpperCase()})`}
            >
              {sortOrder.toUpperCase()}
            </button>
          </div>

          {/* Page Size */}
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            title="Deployments per page"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
          </select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', color: '#ff8800' }}
              title="Reset all filters"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading deployment history...
        </div>
      ) : totalItems === 0 ? (
        <div className="card empty-state">
          <AlertCircle className="empty-state-icon" />
          <div className="empty-state-title">
            {hasActiveFilters ? 'No Matching Deployments' : 'No Deployments Recorded Yet'}
          </div>
          <p className="empty-state-desc">
            {hasActiveFilters
              ? 'No deployments match your active search and filter criteria.'
              : 'Trigger your first deployment using the button above or run your CI/CD pipeline with the security gate.'}
          </p>
          {hasActiveFilters ? (
            <button onClick={resetFilters} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              <RotateCcw size={14} /> Clear All Filters
            </button>
          ) : (
            <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              <Plus size={15} /> Trigger Deployment
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDeployments.map((d) => (
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
                    <td style={{ textAlign: 'right' }}>
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

          {/* Pagination Bar */}
          <div className="pagination-bar">
            <div>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{startIndex + 1}</strong> to{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{Math.min(startIndex + pageSize, totalItems)}</strong> of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> deployments
            </div>

            <div className="pagination-nav">
              <button
                className="pagination-btn"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <span style={{ padding: '0 0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Page {validCurrentPage} of {totalPages}
              </span>

              <button
                className="pagination-btn"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
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
                    {apps.length === 0 ? (
                      <option value="">No registered applications</option>
                    ) : (
                      apps.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Environment</label>
                  <select
                    className="form-select"
                    value={form.environmentId}
                    onChange={(e) => setForm({ ...form, environmentId: e.target.value })}
                  >
                    {envs.length === 0 ? (
                      <option value="">No environments available</option>
                    ) : (
                      envs.map((env) => (
                        <option key={env.id} value={env.id}>{env.name} ({env.type})</option>
                      ))
                    )}
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
                <button type="submit" className="btn btn-primary" disabled={apps.length === 0 || envs.length === 0}>
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
