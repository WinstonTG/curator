'use client';

/**
 * Authentication Page
 * Combined login and registration interface
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '@/lib/auth';

type Tab = 'login' | 'register';

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { user, error: loginError } = await login(loginEmail, loginPassword);

    setIsLoading(false);

    if (loginError) {
      setError(loginError);
      return;
    }

    if (user) {
      // Redirect to onboarding or home
      router.push('/onboarding');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const { user, error: registerError } = await register(
      registerEmail,
      registerPassword,
      registerDisplayName
    );

    setIsLoading(false);

    if (registerError) {
      setError(registerError);
      return;
    }

    if (user) {
      // Redirect to onboarding
      router.push('/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Curator</h1>
            <p className="text-gray-600">Quality-first content discovery</p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                tab === 'login'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setTab('login');
                setError('');
              }}
            >
              Log In
            </button>
            <button
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                tab === 'register'
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => {
                setTab('register');
                setError('');
              }}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Login Form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Logging in...' : 'Log In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  id="register-name"
                  type="text"
                  required
                  value={registerDisplayName}
                  onChange={(e) => setRegisterDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Your Name"
                />
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="register-email"
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  required
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="At least 8 characters with letters and numbers"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters with letters and numbers
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-gray-600">
          By continuing, you agree to Curator's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
