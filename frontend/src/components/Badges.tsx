import React from 'react';
import type { SeverityLevel, DeploymentStatus, PipelineStatus, PipelineStage } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, XCircle, Clock, RotateCcw } from 'lucide-react';

export const SeverityBadge: React.FC<{ severity: SeverityLevel }> = ({ severity }) => {
  const map: Record<SeverityLevel, { className: string; label: string; icon: React.ReactNode }> = {
    Critical: { className: 'badge-critical', label: 'CRITICAL', icon: <XCircle size={12} /> },
    High: { className: 'badge-high', label: 'HIGH', icon: <AlertTriangle size={12} /> },
    Medium: { className: 'badge-medium', label: 'MEDIUM', icon: <AlertCircle size={12} /> },
    Low: { className: 'badge-low', label: 'LOW', icon: <Info size={12} /> },
    Info: { className: 'badge-info', label: 'INFO', icon: <Info size={12} /> },
  };

  const item = map[severity] || map.Info;
  return (
    <span className={`badge ${item.className}`}>
      {item.icon}
      {item.label}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: DeploymentStatus | PipelineStatus | string }> = ({ status }) => {
  switch (status) {
    case 'Succeeded':
    case 'Success':
      return (
        <span className="badge badge-success">
          <CheckCircle2 size={12} /> {status}
        </span>
      );
    case 'InProgress':
    case 'Running':
      return (
        <span className="badge badge-running">
          <Clock size={12} /> {status}
        </span>
      );
    case 'Failed':
      return (
        <span className="badge badge-failed">
          <XCircle size={12} /> {status}
        </span>
      );
    case 'RolledBack':
      return (
        <span className="badge badge-medium">
          <RotateCcw size={12} /> Rolled Back
        </span>
      );
    default:
      return (
        <span className="badge badge-info">
          <Clock size={12} /> {status}
        </span>
      );
  }
};

export const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: string;
}> = ({ title, value, subtitle, icon, accent = 'var(--accent-cyan)' }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
        <div style={{ color: accent, background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem', borderRadius: '8px' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  );
};

export const PipelineStageBar: React.FC<{ stages: PipelineStage[] }> = ({ stages }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto', padding: '0.25rem 0' }}>
      {stages.map((stage, idx) => {
        const isSuccess = stage.status === 'Success';
        const isFailed = stage.status === 'Failed';
        const isRunning = stage.status === 'Running';
        const color = isSuccess ? '#10b981' : isFailed ? '#ef4444' : isRunning ? '#38bdf8' : '#64748b';

        return (
          <React.Fragment key={idx}>
            <div
              title={`${stage.name}: ${stage.status} (${stage.durationSeconds}s)`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px',
                background: `rgba(${isSuccess ? '16, 185, 129' : isFailed ? '239, 68, 68' : isRunning ? '56, 189, 248' : '100, 116, 139'}, 0.12)`,
                border: `1px solid ${color}40`,
                fontSize: '0.7rem',
                fontWeight: 600,
                color: color,
                whiteSpace: 'nowrap'
              }}
            >
              {stage.name}
              <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>{stage.durationSeconds}s</span>
            </div>
            {idx < stages.length - 1 && (
              <span style={{ color: 'var(--border-subtle)', fontSize: '0.7rem' }}>→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
