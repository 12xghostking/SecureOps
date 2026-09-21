import React, { useEffect, useState } from 'react';
import type { SecurityFinding, SecuritySummary, TriageFindingRequest, FindingStatus } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/Badges';
import { ShieldCheck, Filter, X } from 'lucide-react';

export const SecurityFindingsPage: React.FC = () => {
  const [findings, setFindings] = useState<SecurityFinding[]>([]);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedTool, setSelectedTool] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

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
      const [fData, sData] = await Promise.all([
        api.getSecurityFindings(
          selectedSeverity !== 'ALL' ? selectedSeverity : undefined,
          selectedStatus !== 'ALL' ? selectedStatus : undefined
        ),
        api.getSecuritySummary(),
      ]);
      setFindings(fData);
      setSummary(sData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSeverity, selectedStatus]);

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

  const filteredFindings = findings.filter((f) => {
    if (selectedTool !== 'ALL' && f.tool.toLowerCase() !== selectedTool.toLowerCase()) return false;
    return true;
  });

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

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Filter size={14} /> SCANNER:
          </span>
          {['ALL', 'Semgrep', 'Gitleaks', 'Trivy', 'Checkov'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTool(t)}
              className="btn btn-secondary"
              style={{
                padding: '0.25rem 0.65rem',
                fontSize: '0.75rem',
                background: selectedTool === t ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                borderColor: selectedTool === t ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                color: selectedTool === t ? 'var(--accent-cyan)' : 'var(--text-secondary)'
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="High">High Only</option>
            <option value="Medium">Medium Only</option>
            <option value="Low">Low Only</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Open">Open Only</option>
            <option value="Resolved">Resolved Only</option>
            <option value="Suppressed">Suppressed Only</option>
          </select>
        </div>
      </div>

      {/* Findings Table */}
      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading findings...</div>
      ) : (
        <div className="card">
          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Scanner</th>
                  <th>Finding & Location</th>
                  <th>Service</th>
                  <th>Status</th>
                  <th>Remediation Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.map((f) => (
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
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
                      <span style={{ fontWeight: 600 }}>{f.applicationName}</span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: f.status === 'Open' ? '#ff8800' : f.status === 'Resolved' ? '#10b981' : 'var(--text-muted)'
                      }}>
                        {f.status}
                      </span>
                    </td>
                    <td>
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
