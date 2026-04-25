'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/lib/api';

interface Report {
  id: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  video: { id: string; title: string; userId: string };
}

interface Stats {
  users: number;
  videos: number;
  pendingReports: number;
  totalReports: number;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-gray-100 text-gray-500',
};

export default function AdminPage() {
  const router = useRouter();
  const { isLoggedIn, loading: authLoading } = useAuth();

  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.push('/auth/login');
  }, [isLoggedIn, authLoading, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    Promise.all([adminApi.getStats(), adminApi.getReports('PENDING')])
      .then(([s, r]) => { setStats(s); setReports(r); })
      .catch(() => setForbidden(true))
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  const loadReports = async (status: string) => {
    setFilter(status);
    setLoading(true);
    try {
      const r = await adminApi.getReports(status === 'ALL' ? undefined : status);
      setReports(r);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleResolve = async (reportId: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      const updated: Report = await adminApi.resolveReport(reportId, status);
      setReports(prev => prev.map(r => r.id === reportId ? updated : r));
      if (stats) {
        setStats(s => s ? { ...s, pendingReports: Math.max(0, s.pendingReports - 1) } : s);
      }
    } catch { /* ignore */ }
  };

  if (authLoading || (!isLoggedIn && !authLoading)) return null;

  if (forbidden) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-3">🚫</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
        <p className="text-gray-500 mb-4">You don&apos;t have permission to view this page.</p>
        <Link href="/" className="text-blue-600 hover:underline">← Back to home</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Users', value: stats.users, icon: '👤' },
              { label: 'Videos', value: stats.videos, icon: '🎬' },
              { label: 'Pending Reports', value: stats.pendingReports, icon: '⚠️' },
              { label: 'Total Reports', value: stats.totalReports, icon: '📋' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Reports */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'].map(s => (
                <button key={s} onClick={() => loadReports(s)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400">
              <div className="text-3xl mb-2">✅</div>
              <p>No {filter.toLowerCase()} reports</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div key={report.id} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[report.status]}`}>
                          {report.status}
                        </span>
                        <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          {report.reason.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <Link href={`/videos/${report.video.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600 truncate block">
                        🎬 {report.video.title}
                      </Link>
                      {report.details && (
                        <p className="text-sm text-gray-500 mt-1 italic">&quot;{report.details}&quot;</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Reported by <span className="font-medium">{report.user.name}</span> · {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {report.status === 'PENDING' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleResolve(report.id, 'RESOLVED')}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors">
                          Remove Video
                        </button>
                        <button onClick={() => handleResolve(report.id, 'DISMISSED')}
                          className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors">
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
