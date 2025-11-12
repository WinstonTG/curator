'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Synthetic data generator (will be replaced with real data)
function generateSyntheticData(days: number) {
  const data = [];
  const baseDate = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toISOString().split('T')[0],
      matchDiscoveryRate: 2.5 + Math.random() * 1.5, // Target: 3
      engagementSave: 12 + Math.random() * 6, // Target: 15%
      engagementAction: 4 + Math.random() * 3, // Target: 5%
      completionRate: 55 + Math.random() * 15, // Target: 60%
      timeToAction: 100 + Math.random() * 80, // Target: <120s
      errorRate: 0.5 + Math.random() * 1.5, // Target: <1%
    });
  }

  return data;
}

interface MetricCardProps {
  title: string;
  value: string;
  target: string;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
  status: 'good' | 'warning' | 'critical';
}

function MetricCard({ title, value, target, unit, trend, status }: MetricCardProps) {
  const statusColors = {
    good: 'border-green-500 bg-green-50',
    warning: 'border-yellow-500 bg-yellow-50',
    critical: 'border-red-500 bg-red-50',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${statusColors[status]}`}>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{value}</span>
        <span className="text-lg text-gray-500">{unit}</span>
        <span className="text-xl ml-auto">{trendIcons[trend]}</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">Target: {target} {unit}</p>
    </div>
  );
}

export default function MetricsPage() {
  const [data, setData] = useState<ReturnType<typeof generateSyntheticData>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data fetch
    setTimeout(() => {
      setData(generateSyntheticData(30));
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">Loading metrics...</p>
      </div>
    );
  }

  const latestData = data[data.length - 1];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Curator MVP Metrics Dashboard</h1>
          <p className="text-gray-600">
            Internal analytics • Last updated: {new Date().toLocaleString()}
          </p>
        </div>

        {/* Primary KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Match Discovery Rate"
            value={latestData.matchDiscoveryRate.toFixed(2)}
            target="≥3.0"
            unit="MD/day"
            trend={latestData.matchDiscoveryRate >= 3 ? 'up' : 'down'}
            status={latestData.matchDiscoveryRate >= 3 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Engagement (Save)"
            value={latestData.engagementSave.toFixed(1)}
            target="15"
            unit="%"
            trend={latestData.engagementSave >= 15 ? 'up' : 'down'}
            status={latestData.engagementSave >= 15 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Time to Action"
            value={Math.round(latestData.timeToAction).toString()}
            target="<120"
            unit="sec"
            trend={latestData.timeToAction <= 120 ? 'down' : 'up'}
            status={latestData.timeToAction <= 120 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Completion Rate"
            value={latestData.completionRate.toFixed(1)}
            target=">60"
            unit="%"
            trend={latestData.completionRate >= 60 ? 'up' : 'down'}
            status={latestData.completionRate >= 60 ? 'good' : 'warning'}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Match Discovery Rate Trend */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Match Discovery Rate (30 days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="matchDiscoveryRate" stroke="#8b5cf6" strokeWidth={2} name="MD/day" />
                <Line type="monotone" dataKey="3" stroke="#10b981" strokeWidth={1} strokeDasharray="5 5" name="Target" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement Conversion */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Engagement Conversion (30 days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="engagementSave" stroke="#3b82f6" strokeWidth={2} name="Save %" />
                <Line type="monotone" dataKey="engagementAction" stroke="#f59e0b" strokeWidth={2} name="Action %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Time to Action Distribution */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Time to Action (30 days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="timeToAction" fill="#06b6d4" name="Avg Time (sec)" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Completion & Error Rates */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Completion & Error Rates (30 days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="completionRate" stroke="#10b981" strokeWidth={2} name="Completion %" />
                <Line type="monotone" dataKey="errorRate" stroke="#ef4444" strokeWidth={2} name="Error %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">System Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Error Rate</p>
              <p className={`text-2xl font-bold ${latestData.errorRate < 1 ? 'text-green-600' : 'text-red-600'}`}>
                {latestData.errorRate.toFixed(2)}%
              </p>
              <p className="text-xs text-gray-500">Target: &lt;1%</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Data Freshness</p>
              <p className="text-2xl font-bold text-green-600">Live</p>
              <p className="text-xs text-gray-500">Updated every 5min</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Coverage</p>
              <p className="text-2xl font-bold text-blue-600">5/5</p>
              <p className="text-xs text-gray-500">Domains active</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Powered by synthetic data generator (dev mode) •{' '}
            <a href="/docs/product/mvp_scope.md" className="text-blue-600 hover:underline">
              View MVP Scope
            </a>{' '}
            •{' '}
            <a href="/analytics/metrics_dictionary.yaml" className="text-blue-600 hover:underline">
              Metrics Dictionary
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
