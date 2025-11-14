'use client';

import { useState } from 'react';
import { useFeatureFlag } from '@/lib/featureFlags';

interface ExportStatus {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  downloadUrl?: string;
}

interface DeleteStatus {
  status: 'idle' | 'confirming' | 'loading' | 'success' | 'error';
  message?: string;
}

export default function DataControlsPage() {
  const isPrivacyFeatureEnabled = useFeatureFlag('FEATURE_PRIVACY');
  const [exportStatus, setExportStatus] = useState<ExportStatus>({ status: 'idle' });
  const [deleteStatus, setDeleteStatus] = useState<DeleteStatus>({ status: 'idle' });

  // Feature flag check
  if (!isPrivacyFeatureEnabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold mb-4">Data Controls</h1>
          <p className="text-gray-600">
            Privacy features are currently disabled. Please contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  const handleExportData = async () => {
    setExportStatus({ status: 'loading', message: 'Preparing your data export...' });

    try {
      // Use demo-user for now - in production, this would come from auth
      const userId = 'demo-user';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/gdpr/export/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const data = await response.json();

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `curator-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportStatus({
        status: 'success',
        message: 'Your data has been exported successfully!',
        downloadUrl: url,
      });
    } catch (error) {
      setExportStatus({
        status: 'error',
        message: 'Failed to export data. Please try again later.',
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteStatus.status !== 'confirming') {
      setDeleteStatus({ status: 'confirming' });
      return;
    }

    setDeleteStatus({ status: 'loading', message: 'Deleting your account...' });

    try {
      const userId = 'demo-user';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/gdpr/delete/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: userId }),
      });

      if (!response.ok) {
        throw new Error('Deletion failed');
      }

      const data = await response.json();

      setDeleteStatus({
        status: 'success',
        message: data.message || 'Your account has been scheduled for deletion.',
      });
    } catch (error) {
      setDeleteStatus({
        status: 'error',
        message: 'Failed to delete account. Please contact support.',
      });
    }
  };

  const cancelDelete = () => {
    setDeleteStatus({ status: 'idle' });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Data Controls</h1>
          <p className="text-gray-600">
            Manage your personal data, export your information, or delete your account.
          </p>
        </div>

        {/* Export Data Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2">Export Your Data</h2>
              <p className="text-gray-600 mb-4">
                Download a copy of all your personal data, including preferences, saved items,
                and analytics events.
              </p>
            </div>
            <svg
              className="w-12 h-12 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
              />
            </svg>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
            <h3 className="font-semibold mb-2">Your export will include:</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>Account information (email, profile, preferences)</li>
              <li>Saved recommendations across all domains</li>
              <li>Analytics events (views, saves, actions)</li>
              <li>Settings and privacy preferences</li>
            </ul>
          </div>

          {exportStatus.status !== 'idle' && (
            <div
              className={`p-4 rounded mb-4 ${
                exportStatus.status === 'loading'
                  ? 'bg-blue-50 text-blue-800'
                  : exportStatus.status === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {exportStatus.message}
            </div>
          )}

          <button
            onClick={handleExportData}
            disabled={exportStatus.status === 'loading'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {exportStatus.status === 'loading' ? 'Exporting...' : 'Export Data (JSON)'}
          </button>
        </div>

        {/* Delete Account Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2 text-red-600">Delete Your Account</h2>
              <p className="text-gray-600 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <svg
              className="w-12 h-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
            <h3 className="font-semibold mb-2 text-red-800">⚠️ Warning: This will delete:</h3>
            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
              <li>Your account and profile information</li>
              <li>All saved recommendations and preferences</li>
              <li>Your analytics and usage history</li>
              <li>Access to all Curator services</li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">
              <strong>Grace period:</strong> You have 30 days to restore your account before permanent deletion.
            </p>
          </div>

          {deleteStatus.status !== 'idle' && deleteStatus.status !== 'confirming' && (
            <div
              className={`p-4 rounded mb-4 ${
                deleteStatus.status === 'loading'
                  ? 'bg-blue-50 text-blue-800'
                  : deleteStatus.status === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
            >
              {deleteStatus.message}
            </div>
          )}

          {deleteStatus.status === 'confirming' ? (
            <div className="bg-yellow-50 border border-yellow-300 rounded p-4 mb-4">
              <p className="font-semibold mb-3">Are you absolutely sure?</p>
              <p className="text-sm mb-4">
                Type <strong>"DELETE"</strong> to confirm permanent account deletion.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="bg-red-600 text-white px-6 py-2 rounded font-semibold hover:bg-red-700 transition"
                >
                  Yes, Delete My Account
                </button>
                <button
                  onClick={cancelDelete}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleDeleteAccount}
              disabled={deleteStatus.status === 'loading' || deleteStatus.status === 'success'}
              className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {deleteStatus.status === 'loading' ? 'Deleting...' : 'Delete Account'}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Have questions?{' '}
            <a href="/docs/policies/privacy_policy_draft.md" className="text-blue-600 hover:underline">
              Read our Privacy Policy
            </a>{' '}
            or{' '}
            <a href="mailto:privacy@curator.example" className="text-blue-600 hover:underline">
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
