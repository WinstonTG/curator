export type Domain = 'music' | 'news' | 'recipes' | 'learning' | 'events';

export interface Interest {
  domain: Domain;
  value: string;
  weight: number;
  source: 'explicit' | 'inferred' | 'imported';
}

export interface Constraint {
  domain: Domain;
  type: string;
  value: string;
  reason?: string;
}

export interface OnboardingData {
  interests: Interest[];
  constraints: Constraint[];
  connectedAccounts: string[];
}

export interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}
