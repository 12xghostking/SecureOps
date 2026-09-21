import React, { useEffect, useState } from 'react';
import type { PipelineRun } from '../types';
import { api } from '../services/api';
import { StatusBadge, PipelineStageBar } from '../components/Badges';
import { GitBranch, Clock } from 'lucide-react';

export const PipelinesPage: React.FC = () => {
  const [pipelines, setPipelines] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getPipelines();
        setPipelines(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page-body">
      <div className="page-header">
        <div>
          <h1 className="page-title">CI/CD Security Pipelines</h1>
          <p className="page-subtitle">Automated build verification, static analysis, secret detection, and container scans</p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading CI/CD runs...</div>
      ) : (
        <div className="card">
          <div className="table-container" style={{ marginTop: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Run</th>
                  <th>Service</th>
                  <th>Branch & Commit</th>
                  <th>Trigger</th>
                  <th>Stages Flow</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pipelines.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                        {p.runNumber}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: 'var(--text-primary)' }}>{p.applicationName}</strong>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        <GitBranch size={13} color="var(--accent-purple)" />
                        {p.branch}
                      </div>
                      <div className="mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {p.commitSha} • {p.commitMessage}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.06)' }}>
                        {p.trigger}
                      </span>
                    </td>
                    <td style={{ minWidth: '320px' }}>
                      <PipelineStageBar stages={p.stages} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Clock size={12} /> {p.durationSeconds ? `${p.durationSeconds}s` : 'Running...'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
