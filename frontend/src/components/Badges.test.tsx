import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { SeverityBadge, StatusBadge, MetricCard } from './Badges';

describe('Badges & MetricCard Components', () => {
  it('SeverityBadge renders Critical severity correctly', () => {
    render(<SeverityBadge severity="Critical" />);
    const badge = screen.getByText('CRITICAL');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.badge-critical')).not.toBeNull();
  });

  it('SeverityBadge renders High severity correctly', () => {
    render(<SeverityBadge severity="High" />);
    const badge = screen.getByText('HIGH');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.badge-high')).not.toBeNull();
  });

  it('StatusBadge renders Succeeded status correctly', () => {
    render(<StatusBadge status="Succeeded" />);
    const badge = screen.getByText('Succeeded');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.badge-success')).not.toBeNull();
  });

  it('StatusBadge renders Failed status correctly', () => {
    render(<StatusBadge status="Failed" />);
    const badge = screen.getByText('Failed');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.badge-failed')).not.toBeNull();
  });

  it('StatusBadge renders RolledBack status correctly', () => {
    render(<StatusBadge status="RolledBack" />);
    const badge = screen.getByText('Rolled Back');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.badge-medium')).not.toBeNull();
  });

  it('MetricCard renders title, value and subtitle', () => {
    render(
      <MetricCard
        title="Active Applications"
        value={12}
        subtitle="100% healthy"
        icon={<span data-testid="icon">icon</span>}
      />
    );
    expect(screen.getByText('Active Applications')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('100% healthy')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
