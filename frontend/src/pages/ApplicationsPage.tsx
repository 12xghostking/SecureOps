import React, { useEffect, useState, useMemo } from 'react';
import type { Application, CreateApplicationRequest } from '../types';
import { api } from '../services/api';
import {
  Plus,
  GitFork,
  Mail,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  Search,
  LayoutGrid,
  List,
  RotateCcw,
  AlertCircle,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

export const ApplicationsPage: React.FC = () => {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [selectedHealth, setSelectedHealth] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'tier' | 'cves' | 'deployments'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTier('ALL');
    setSelectedHealth('ALL');
    setSortBy('name');
    setSortOrder('asc');
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedTier !== 'ALL' || selectedHealth !== 'ALL';

  const filteredAndSortedApps = useMemo(() => {
    let list = apps.filter((app) => {
      if (selectedTier !== 'ALL' && app.tier !== selectedTier) return false;
      if (selectedHealth !== 'ALL' && app.healthStatus !== selectedHealth) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = app.name?.toLowerCase().includes(q);
        const matchesDesc = app.description?.toLowerCase().includes(q);
        const matchesLang = app.language?.toLowerCase().includes(q);
        const matchesEmail = app.ownerEmail?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesLang && !matchesEmail) {
          return false;
        }
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'tier') {
        comparison = (a.tier || '').localeCompare(b.tier || '');
      } else if (sortBy === 'cves') {
        comparison = (a.openVulnerabilitiesCount || 0) - (b.openVulnerabilitiesCount || 0);
      } else if (sortBy === 'deployments') {
        comparison = (a.activeDeploymentsCount || 0) - (b.activeDeploymentsCount || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return list;
  }, [apps, searchQuery, selectedTier, selectedHealth, sortBy, sortOrder]);

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

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="card filter-toolbar" style={{ marginBottom: '1.25rem' }}>
        {/* Search Input */}
        <div className="search-input-group">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, description, tech stack, email..."
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

        {/* Filters & View Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Tier Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '130px', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
          >
            <option value="ALL">All Tiers</option>
            <option value="Tier1_MissionCritical">Tier 1 (Mission Critical)</option>
            <option value="Tier2_BusinessCore">Tier 2 (Business Core)</option>
            <option value="Tier3_Internal">Tier 3 (Internal Support)</option>
          </select>

          {/* Health Status Filter */}
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
          >
            <option value="ALL">All Health</option>
            <option value="Healthy">Healthy</option>
            <option value="Degraded">Degraded</option>
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
              <option value="name">Name</option>
              <option value="tier">Tier</option>
              <option value="cves">Open CVEs</option>
              <option value="deployments">Deployments</option>
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

          {/* View Mode Toggle */}
          <div className="view-toggle-group">
            <button
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid size={15} /> Grid
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={15} /> Table
            </button>
          </div>

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

      {/* Main Content Area */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading services...
        </div>
      ) : filteredAndSortedApps.length === 0 ? (
        <div className="card empty-state">
          <AlertCircle className="empty-state-icon" />
          <div className="empty-state-title">
            {hasActiveFilters ? 'No Matching Services' : 'No Services Registered Yet'}
          </div>
          <p className="empty-state-desc">
            {hasActiveFilters
              ? 'No registered services match your search and filter criteria.'
              : 'Register your first service using the button above, or run security-gate.ps1 inside any project directory to register it automatically!'}
          </p>
          {hasActiveFilters ? (
            <button onClick={resetFilters} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              <RotateCcw size={14} /> Clear All Filters
            </button>
          ) : (
            <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              <Plus size={15} /> Register Service
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {filteredAndSortedApps.map((app) => {
            const isCritical = app.healthStatus === 'Degraded';
            return (
              <div key={app.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{app.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>{app.language}</span>
                  </div>

                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      background: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: isCritical ? '#ef4444' : '#10b981',
                      border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                    }}
                  >
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

                <div
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span>
                    Deployments: <strong style={{ color: 'var(--text-primary)' }}>{app.activeDeploymentsCount}</strong>
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      color: app.openVulnerabilitiesCount > 0 ? '#ff8800' : 'var(--text-muted)',
                    }}
                  >
                    <ShieldAlert size={14} /> {app.openVulnerabilitiesCount} Open CVEs
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {app.tier.replace('_', ' ')}
                  </span>
                  {app.repositoryUrl && (
                    <a
                      href={app.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--accent-blue)',
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      <GitFork size={13} /> Repo
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Service Name</th>
                  <th>Tier</th>
                  <th>Tech Stack</th>
                  <th>Health</th>
                  <th>Open CVEs</th>
                  <th>Deployments</th>
                  <th>Owner</th>
                  <th style={{ textAlign: 'right' }}>Repository</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedApps.map((app) => {
                  const isCritical = app.healthStatus === 'Degraded';
                  return (
                    <tr key={app.id}>
                      <td>
                        <strong style={{ color: 'var(--text-primary)' }}>{app.name}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {app.description}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.07)', color: 'var(--text-secondary)' }}>
                          {app.tier.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.775rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          {app.language}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            background: isCritical ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: isCritical ? '#ef4444' : '#10b981',
                            border: `1px solid ${isCritical ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          }}
                        >
                          {isCritical ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                          {app.healthStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            color: app.openVulnerabilitiesCount > 0 ? '#ff8800' : 'var(--text-muted)',
                          }}
                        >
                          <ShieldAlert size={13} /> {app.openVulnerabilitiesCount}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: '0.8rem' }}>{app.activeDeploymentsCount}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Mail size={12} /> {app.ownerEmail}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {app.repositoryUrl ? (
                          <a
                            href={app.repositoryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.725rem', display: 'inline-flex' }}
                          >
                            <ExternalLink size={12} /> Repo
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredAndSortedApps.length}</strong> of{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{apps.length}</strong> services
          </div>
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
