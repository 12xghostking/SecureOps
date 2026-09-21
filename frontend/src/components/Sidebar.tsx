import React from 'react';
import { LayoutDashboard, Layers, Rocket, ShieldAlert, GitPullRequest, Server } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'applications', label: 'Applications', icon: Layers },
    { id: 'deployments', label: 'Deployments', icon: Rocket },
    { id: 'security', label: 'Security Findings', icon: ShieldAlert },
    { id: 'pipelines', label: 'Pipelines', icon: GitPullRequest },
    { id: 'environments', label: 'Environments', icon: Server },
  ];

  return (
    <aside style={{
      width: '240px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.25rem 0.75rem'
    }}>
      <div style={{ padding: '0 0.75rem 1rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Platform Navigation
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                background: isActive ? 'rgba(0, 242, 254, 0.1)' : 'transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(0, 242, 254, 0.3)' : '1px solid transparent',
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '1rem 0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
          Mode: <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Dual-Mode Host/K8s</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          .NET 8 LTS • OpenTelemetry
        </div>
      </div>
    </aside>
  );
};
