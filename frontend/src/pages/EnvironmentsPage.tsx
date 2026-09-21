import React, { useEffect, useState } from 'react';
import type { Environment } from '../types';
import { api } from '../services/api';
import { Server, CheckCircle2, Shield, Globe } from 'lucide-react';

export const EnvironmentsPage: React.FC = () => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getEnvironments();
        setEnvironments(data);
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
          <h1 className="page-title">Infrastructure & Environments</h1>
          <p className="page-subtitle">Kubernetes cluster fleet, network topology, and environment health</p>
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)' }}>Loading environment topology...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
          {environments.map((env) => (
            <div key={env.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{env.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {env.type}</span>
                </div>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  <CheckCircle2 size={12} /> {env.healthStatus}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Server size={14} /> Cluster</span>
                  <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{env.clusterName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Globe size={14} /> Region</span>
                  <span>{env.region}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Shield size={14} /> Governance</span>
                  <span>{env.isProduction ? 'Strict Production Gate' : 'Dev Policy Baseline'}</span>
                </div>
              </div>

              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: '1px solid var(--border-subtle)'
              }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Workloads</span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {env.activeDeploymentsCount} services
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
