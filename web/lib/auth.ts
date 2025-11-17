/**
 * Frontend Authentication Utilities
 * Client-side functions for auth API interactions
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  last_login?: string;
  oauth_providers?: string[];
}

export interface AuthResponse {
  success: boolean;
  user: User;
}

export interface AuthError {
  error: string;
}

/**
 * Register a new user account
 */
export async function register(
  email: string,
  password: string,
  display_name: string
): Promise<{ user?: User; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify({ email, password, display_name }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Registration failed' };
    }

    return { user: data.user };
  } catch (error) {
    console.error('Register error:', error);
    return { error: 'Network error. Please try again.' };
  }
}

/**
 * Log in with email and password
 */
export async function login(
  email: string,
  password: string
): Promise<{ user?: User; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: include cookies
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || 'Login failed' };
    }

    return { user: data.user };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Network error. Please try again.' };
  }
}

/**
 * Log out the current user
 */
export async function logout(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include', // Important: include cookies
    });

    if (!response.ok) {
      return { success: false, error: 'Logout failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Get the currently authenticated user
 */
export async function getCurrentUser(): Promise<{ user?: User; error?: string }> {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      method: 'GET',
      credentials: 'include', // Important: include cookies
    });

    if (response.status === 401) {
      // Not authenticated
      return {};
    }

    if (!response.ok) {
      return { error: 'Failed to fetch user' };
    }

    const data = await response.json();
    return { user: data.user };
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return { error: 'Network error' };
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { user } = await getCurrentUser();
  return !!user;
}
