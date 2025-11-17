'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeStep } from './steps/WelcomeStep';
import { InterestsStep } from './steps/InterestsStep';
import { ConstraintsStep } from './steps/ConstraintsStep';
import { ConnectAccountsStep } from './steps/ConnectAccountsStep';
import { CompletionStep } from './steps/CompletionStep';
import { ProgressBar } from './components/ProgressBar';
import { OnboardingData, Domain } from './types';
import { getCurrentUser, type User } from '@/lib/auth';

const STEPS = ['welcome', 'interests', 'constraints', 'connect', 'complete'] as const;
type Step = typeof STEPS[number];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [sessionId, setSessionId] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    interests: [],
    constraints: [],
    connectedAccounts: [],
  });

  // Check authentication and track onboarding_started event
  useEffect(() => {
    const init = async () => {
      // Check if user is authenticated
      const { user: currentUser, error } = await getCurrentUser();

      if (!currentUser || error) {
        // Redirect to auth page if not authenticated
        router.push('/auth');
        return;
      }

      setUser(currentUser);
      setIsLoading(false);

      // Track onboarding_started event
      const newSessionId = `onboarding_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      setSessionId(newSessionId);

      trackEvent('onboarding_started', {
        session_id: newSessionId,
        timestamp: new Date().toISOString(),
      });
    };

    init();
  }, [router]);

  const trackEvent = async (event: string, properties: Record<string, any>) => {
    try {
      // Store event in AnalyticsEvent table
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include auth cookie
        body: JSON.stringify({
          event,
          session_id: sessionId,
          properties,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.warn('Failed to track event:', event);
      }
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  };

  const getCurrentStepIndex = () => STEPS.indexOf(currentStep);
  const totalSteps = STEPS.length;

  const nextStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const previousStep = () => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const updateInterests = (domain: Domain, interests: string[]) => {
    setOnboardingData(prev => ({
      ...prev,
      interests: [
        ...prev.interests.filter(i => i.domain !== domain),
        ...interests.map(value => ({ domain, value, weight: 0.8, source: 'explicit' as const })),
      ],
    }));
  };

  const updateConstraints = (domain: Domain, constraints: Array<{ type: string; value: string; reason?: string }>) => {
    setOnboardingData(prev => ({
      ...prev,
      constraints: [
        ...prev.constraints.filter(c => c.domain !== domain),
        ...constraints.map(c => ({ domain, ...c })),
      ],
    }));
  };

  const connectAccount = (provider: string) => {
    setOnboardingData(prev => ({
      ...prev,
      connectedAccounts: [...prev.connectedAccounts, provider],
    }));
  };

  const handleComplete = async () => {
    // Save profile data via API
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/onboarding/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include auth cookie
        body: JSON.stringify({
          interests: onboardingData.interests,
          constraints: onboardingData.constraints,
        }),
      });

      if (response.ok) {
        // Track completion event
        await trackEvent('onboarding_completed', {
          session_id: sessionId,
          timestamp: new Date().toISOString(),
          interests_count: onboardingData.interests.length,
          constraints_count: onboardingData.constraints.length,
          connected_accounts: onboardingData.connectedAccounts.length,
        });

        // Move to completion step
        nextStep();
      } else {
        console.error('Failed to save onboarding data');
        alert('Failed to save your preferences. Please try again.');
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {currentStep !== 'complete' && (
          <ProgressBar
            current={getCurrentStepIndex() + 1}
            total={totalSteps}
          />
        )}

        <div className="max-w-4xl mx-auto mt-8">
          {currentStep === 'welcome' && (
            <WelcomeStep onNext={nextStep} />
          )}

          {currentStep === 'interests' && (
            <InterestsStep
              currentInterests={onboardingData.interests}
              onUpdate={updateInterests}
              onNext={nextStep}
              onBack={previousStep}
            />
          )}

          {currentStep === 'constraints' && (
            <ConstraintsStep
              currentConstraints={onboardingData.constraints}
              onUpdate={updateConstraints}
              onNext={nextStep}
              onBack={previousStep}
            />
          )}

          {currentStep === 'connect' && (
            <ConnectAccountsStep
              connectedAccounts={onboardingData.connectedAccounts}
              onConnect={connectAccount}
              onNext={handleComplete}
              onBack={previousStep}
            />
          )}

          {currentStep === 'complete' && user && (
            <CompletionStep
              data={onboardingData}
              userId={user.id}
            />
          )}
        </div>
      </div>
    </div>
  );
}
