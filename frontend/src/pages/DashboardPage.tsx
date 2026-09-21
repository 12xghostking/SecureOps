import React, { useEffect, useState } from 'react';
import type { DashboardMetrics } from '../types';
import { api } from '../services/api';
import { MetricCard, SeverityBadge, StatusBadge } from '../components/Badges';
import { Layers, Rocket, ShieldAlert, CheckCircle2, AlertOctagon, GitPullRequest, ArrowUpRight } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Failed to load metrics', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading DevSecOps platform telemetry...</div>;
  }

  if (!metrics) {
    return <div style={{ padding: '2rem', color: 'var(--status-danger)' }}>Failed to connect to backend telemetry API.</div>;
  }

  const isGateBlocked = metrics.securityGateStatus === 'Blocked';

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">Executive DevSecOps Dashboard</h1>
          <p className="page-subtitle">Real-time platform telemetry, deployment visibility, and automated security gating</p>
        </div>

        {/* Security Gate Pill Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.5rem 1rem',
          borderRadius: '10px',
          background: isGateBlocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
          border: `1px solid ${isGateBlocked ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
          boxShadow: isGateBlocked ? 'var(--shadow-glow-danger)' : 'none'
        }}>
          {isGateBlocked ? <AlertOctagon size={18} color="var(--status-danger)" /> : <CheckCircle2 size={18} color="var(--status-success)" />}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Security Gate Policy</div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: isGateBlocked ? 'var(--status-danger)' : 'var(--status-success)' }}>
              {isGateBlocked ? 'GATES BLOCKED (Critical CVE Detected)' : 'GATES PASSED (Compliant)'}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        <MetricCard
          title="Registered Services"
          value={metrics.totalApplications}
          subtitle="Microservices in catalog"
          icon={<Layers size={20} />}
          accent="var(--accent-cyan)"
        />
        <MetricCard
          title="Active Deployments"
          value={metrics.activeDeployments}
          subtitle="Healthy across all environments"
          icon={<Rocket size={20} />}
          accent="#10b981"
        />
        <MetricCard
          title="Open Vulnerabilities"
          value={metrics.totalVulnerabilities}
          subtitle={`${metrics.criticalFindings} Critical • ${metrics.highFindings} High`}
          icon={<ShieldAlert size={20} />}
          accent={metrics.criticalFindings > 0 ? '#ff3366' : '#ff8800'}
        />
        <MetricCard
          title="Pipeline Pass Rate"
          value={`${metrics.passingPipelinesPercentage}%`}
          subtitle="CI/CD automated security gates"
          icon={<GitPullRequest size={20} />}
          accent="#818cf8"
        />
      </div>

      {/* Two Column Layout: Recent Deployments & Vulnerability Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
        
        {/* Recent Deployments Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recent Deployment Activity</h2>
            <button onClick={() => onNavigate('deployments')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              View All <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Env</th>
                  <th>Version</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentDeployments.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.applicationName}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)' }}>
                        {d.environmentName}
                      </span>
                    </td>
                    <td>
                      <span className="mono">{d.version}</span>
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Findings Summary Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Top Security Findings</h2>
            <button onClick={() => onNavigate('security')} className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}>
              Triage Center <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Severity</th>
                  <th>Scanner</th>
                  <th>Finding</th>
                  <th>Service</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentFindings.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <SeverityBadge severity={f.severity} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600 }}>{f.tool}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.title}
                      </div>
                      <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {f.filePath}:{f.lineNumber || 1}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem' }}>{f.applicationName}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
