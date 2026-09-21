import React, { useEffect, useState } from 'react';
import { Shield, Activity, ExternalLink, Terminal } from 'lucide-react';
import { api } from '../services/api';

export const Navbar: React.FC = () => {
  const [health, setHealth] = useState<'Healthy' | 'Checking' | 'Offline'>('Checking');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.getHealth();
        setHealth(res.status === 'Healthy' ? 'Healthy' : 'Offline');
      } catch {
        setHealth('Offline');
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      height: '64px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 2rem',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'var(--accent-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-glow-cyan)'
        }}>
          <Shield size={20} color="#05101a" />
        </div>
        <div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            SecureOps
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: 600 }}>
            DevSecOps IDP
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        {/* Backend status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          padding: '0.3rem 0.75rem',
          borderRadius: '9999px',
          background: health === 'Healthy' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
          border: `1px solid ${health === 'Healthy' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          fontSize: '0.75rem',
          fontWeight: 600,
          color: health === 'Healthy' ? 'var(--status-success)' : 'var(--status-danger)'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: health === 'Healthy' ? 'var(--status-success)' : 'var(--status-danger)',
            display: 'inline-block',
            boxShadow: health === 'Healthy' ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
          }} />
          API: {health}
        </div>

        {/* Quick links to Swagger and Prometheus */}
        <a
          href="http://localhost:5000/swagger"
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
        >
          <Terminal size={14} />
          Swagger OpenAPI
          <ExternalLink size={12} style={{ opacity: 0.6 }} />
        </a>

        <a
          href="http://localhost:5000/metrics"
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary"
          style={{ padding: '0.35rem 0.75rem', fontSize: '0.775rem' }}
        >
          <Activity size={14} />
          OpenTelemetry Metrics
          <ExternalLink size={12} style={{ opacity: 0.6 }} />
        </a>
      </div>
    </header>
  );
};
