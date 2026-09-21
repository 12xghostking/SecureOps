import React, { useEffect, useState, useMemo } from 'react';
import type { SecurityFinding, SecuritySummary, TriageFindingRequest, FindingStatus, Application } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/Badges';
import { ShieldCheck, Filter, X, Search, RotateCcw, ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown } from 'lucide-react';

export const SecurityFindingsPage: React.FC = () => {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedApp, setSelectedApp] = useState<string>('ALL');
  const [fixOnly, setFixOnly] = useState<boolean>(false);

  // Sorting & Pagination
  const [sortBy, setSortBy] = useState<'severity' | 'newest' | 'app' | 'tool'>('severity');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Triage modal
  const [triagingFinding, setTriagingFinding] = useState<SecurityFinding | null>(null);
  const [triageForm, setTriageForm] = useState<TriageFindingRequest>({
    newStatus: 'Resolved',
    triagedBy: 'security-engineer@secureops.internal',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [fData, sData, appData] = await Promise.all([
        api.getSecurityFindings(
          selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
          selectedStatus !== 'ALL' ? selectedStatus : undefined
        ),
        api.getSecuritySummary(),
        api.getApplications().catch(() => [] as Application[]),
      ]);
      setFindings(fData);
      setSummary(sData);
      setApps(appData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSeverity, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTool, selectedSeverity, selectedStatus, selectedApp, searchQuery, fixOnly, pageSize]);

  const handleTriageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!triagingFinding) return;
    try {
      await api.triageFinding(triagingFinding.id, triageForm);
      setTriagingFinding(null);
      setTriageForm({
        newStatus: 'Resolved',
        triagedBy: 'security-engineer@secureops.internal',
        notes: '',
      });
      await loadData();
    } catch (err: any) {
      alert('Triage update failed: ' + err.message);
    }
  };

  const resetFilters = () => {
    setSelectedTool('ALL');
    setSelectedSeverity('ALL');
    setSelectedStatus('ALL');
    setSelectedApp('ALL');
    setSearchQuery('');
    setFixOnly(false);
    setSortBy('severity');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    selectedTool !== 'ALL' ||
    selectedSeverity !== 'ALL' ||
    selectedStatus !== 'ALL' ||
    selectedApp !== 'ALL' ||
    searchQuery.trim() !== '' ||
    fixOnly;

  const filteredAndSortedFindings = useMemo(() => {
    let result = findings.filter((f) => {
      if (selectedTool !== 'ALL' && f.tool.toLowerCase() !== selectedTool.toLowerCase()) return false;
      if (selectedApp !== 'ALL' && f.applicationName?.toLowerCase() !== selectedApp.toLowerCase()) return false;
      if (fixOnly && !f.cveId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = f.title?.toLowerCase().includes(q);
        const matchesDesc = f.description?.toLowerCase().includes(q);
        const matchesFile = f.filePath?.toLowerCase().includes(q);
        const matchesRule = f.ruleId?.toLowerCase().includes(q);
        const matchesCve = f.cveId?.toLowerCase().includes(q);
        const matchesApp = f.applicationName?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesFile && !matchesRule && !matchesCve && !matchesApp) {
          return false;
        }
      }
      return true;
    });

    const severityRanks: Record<string, number> = {
      Critical: 4,
      High: 3,
      Medium: 2,
      Low: 1,
      Info: 0,
    };

    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'severity') {
        const rankA = severityRanks[a.severity] ?? 0;
        const rankB = severityRanks[b.severity] ?? 0;
        comparison = rankA - rankB;
      } else if (sortBy === 'app') {
        comparison = (a.applicationName || '').localeCompare(b.applicationName || '');
      } else if (sortBy === 'tool') {
        comparison = (a.tool || '').localeCompare(b.tool || '');
      } else if (sortBy === 'newest') {
        comparison = (a.id || '').localeCompare(b.id || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [findings, selectedTool, selectedApp, fixOnly, searchQuery, sortBy, sortOrder]);

  const totalItems = filteredAndSortedFindings.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedFindings = filteredAndSortedFindings.slice(startIndex, startIndex + pageSize);

  // App options: combine apps from API and unique names from findings
  const appOptions = useMemo(() => {
    const set = new Set<string>();
    apps.forEach((a) => set.add(a.name));
    findings.forEach((f) => {
      if (f.applicationName) set.add(f.applicationName);
    });
    return Array.from(set).sort();
  }, [apps, findings]);

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Multi-Layer Security Findings & Triage</h1>
          <p className="page-subtitle">Unified triage across Semgrep (SAST), Gitleaks (Secrets), Trivy (CVEs), and Checkov (IaC)</p>
        </div>
      </div>

      {/* Summary KPI Banner */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid var(--accent-cyan)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL FINDINGS</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{summary.totalFindings}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #ff3366' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>CRITICAL</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ff3366' }}>{summary.criticalCount}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #ff8800' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>HIGH</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ff8800' }}>{summary.highCount}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #ffbb00' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>MEDIUM</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffbb00' }}>{summary.mediumCount}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #10b981' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>RESOLVED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>{summary.resolvedCount}</div>
          </div>
          <div className="card" style={{ padding: '0.85rem 1rem', borderLeft: '4px solid #64748b' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SUPPRESSED</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#94a3b8' }}>{summary.suppressedCount}</div>
          </div>
        </div>
      )}

      {/* Primary Toolbar: Search & Scanner Buttons */}
      <div className="card filter-toolbar" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search Input */}
          <div className="search-input-group">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              placeholder="Search findings by CVE, title, rule, path, app..."
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

          {/* Scanner Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.25rem' }}>
              <Filter size={13} /> SCANNER:
            </span>
            {['ALL', 'Semgrep', 'Gitleaks', 'Trivy', 'Checkov'].map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTool(t)}
                className="btn btn-secondary"
                style={{
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.75rem',
                  background: selectedTool === t ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                  borderColor: selectedTool === t ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  color: selectedTool === t ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem', color: '#ff8800' }}
              title="Reset all filters to default"
            >
              <RotateCcw size={13} /> Reset Filters
            </button>
          )}
        </div>

        {/* Secondary Filter Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
          {/* Application Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>App:</label>
            <select
              className="form-select"
              style={{ width: 'auto', minWidth: '130px', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
            >
              <option value="ALL">All Applications</option>
              {appOptions.map((app) => (
                <option key={app} value={app}>
                  {app}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Severity:</label>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</label>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Resolved">Resolved</option>
              <option value="Suppressed">Suppressed</option>
            </select>
          </div>

          {/* Fix / CVE Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.75rem',
              color: fixOnly ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              cursor: 'pointer',
              userSelect: 'none',
              marginLeft: '0.25rem',
            }}
          >
            <input
              type="checkbox"
              checked={fixOnly}
              onChange={(e) => setFixOnly(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: 'var(--accent-cyan)' }}
            />
            Has CVE ID
          </label>

          {/* Sort By */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <ArrowUpDown size={12} /> Sort:
            </label>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="severity">Severity</option>
              <option value="newest">Recent</option>
              <option value="app">Application</option>
              <option value="tool">Scanner</option>
            </select>

            <button
              className="btn btn-secondary"
              onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
              title={`Toggle sort order (Current: ${sortOrder.toUpperCase()})`}
            >
              {sortOrder.toUpperCase()}
            </button>

            {/* Page Size */}
            <select
              className="form-select"
              style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              title="Items per page"
            >
              <option value={10}>10 / page</option>
              <option value={15}>15 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Findings Table */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading findings...
        </div>
      ) : totalItems === 0 ? (
        <div className="card empty-state">
          <AlertCircle className="empty-state-icon" />
          <div className="empty-state-title">
            {hasActiveFilters ? 'No Matching Findings' : 'No Security Findings Detected'}
          </div>
          <p className="empty-state-desc">
            {hasActiveFilters
              ? 'No security findings match your active filters or search term. Try resetting your filters.'
              : 'Your applications are clean! Run security-gate.ps1 in a project repository to trigger automated security scanning.'}
          </p>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              <RotateCcw size={14} /> Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Severity</th>
                  <th style={{ width: '110px' }}>Scanner</th>
                  <th>Finding & Location</th>
                  <th style={{ width: '150px' }}>Service</th>
                  <th style={{ width: '110px' }}>Status</th>
                  <th style={{ width: '110px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedFindings.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <SeverityBadge severity={f.severity} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-blue)' }}>
                        {f.tool}
                      </span>
                      <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>{f.scanType}</div>
                    </td>
                    <td style={{ maxWidth: '420px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {f.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', lineHeight: 1.4 }}>
                        {f.description}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="mono" style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                          {f.filePath}:{f.lineNumber || 1}
                        </span>
                        {f.cveId && (
                          <span style={{ fontSize: '0.675rem', background: 'rgba(255, 51, 102, 0.1)', color: '#ff3366', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                            {f.cveId}
                          </span>
                        )}
                        <span className="mono" style={{ fontSize: '0.675rem', color: 'var(--text-muted)' }}>
                          Rule: {f.ruleId}
                        </span>
                      </div>
                      {f.triageNotes && (
                        <div style={{ marginTop: '0.4rem', padding: '0.35rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.04)', fontSize: '0.7rem', color: 'var(--accent-purple)' }}>
                          Triage note by {f.triagedBy}: "{f.triageNotes}"
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{f.applicationName}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: f.status === 'Open' ? '#ff8800' : f.status === 'Resolved' ? '#10b981' : 'var(--text-muted)',
                        }}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => setTriagingFinding(f)}
                        className="btn btn-secondary"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                      >
                        <ShieldCheck size={14} /> Triage
                      </button>
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
              <strong style={{ color: 'var(--text-primary)' }}>{totalItems}</strong> findings
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

      {/* Triage Modal */}
      {triagingFinding && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Security Triage Decision</h3>
              <button onClick={() => setTriagingFinding(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTriageSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem', padding: '0.75rem', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Finding:</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{triagingFinding.title}</div>
                  <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                    {triagingFinding.filePath}:{triagingFinding.lineNumber || 1}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Triage Status Decision</label>
                  <select
                    className="form-select"
                    value={triageForm.newStatus}
                    onChange={(e) => setTriageForm({ ...triageForm, newStatus: e.target.value as FindingStatus })}
                  >
                    <option value="Resolved">Resolved (Fix verified in codebase)</option>
                    <option value="Suppressed">Suppressed (Accepted risk with mitigation)</option>
                    <option value="FalsePositive">False Positive (Rule misidentification)</option>
                    <option value="InProgress">In Progress (Active remediation)</option>
                    <option value="Open">Reopen</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Triaged By (Auditor / Engineer)</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={triageForm.triagedBy}
                    onChange={(e) => setTriageForm({ ...triageForm, triagedBy: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Justification / Remediation Notes</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Document justification, commit hash, or compensating security controls..."
                    className="form-textarea"
                    value={triageForm.notes}
                    onChange={(e) => setTriageForm({ ...triageForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setTriagingFinding(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Triage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
