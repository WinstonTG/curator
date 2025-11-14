import { StepProps } from '../types';

interface ConnectAccountsStepProps extends StepProps {
  connectedAccounts: string[];
  onConnect: (provider: string) => void;
}

const PROVIDERS = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎵',
    description: 'Import your music preferences and listening history',
    color: 'bg-green-500',
  },
  {
    id: 'google',
    name: 'Google',
    icon: '📧',
    description: 'Sync calendar events and personalize news',
    color: 'bg-blue-500',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: '⚙️',
    description: 'Get learning resources based on your repos and stars',
    color: 'bg-gray-800',
  },
  {
    id: 'goodreads',
    name: 'Goodreads',
    icon: '📚',
    description: 'Discover learning content based on your reading list',
    color: 'bg-amber-600',
  },
];

export function ConnectAccountsStep({ connectedAccounts, onConnect, onNext, onBack }: ConnectAccountsStepProps) {
  const handleConnect = async (provider: string) => {
    // Stub for now - would normally trigger OAuth flow
    console.log(`Connecting to ${provider}...`);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/onboarding/connect/${provider}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'demo-user' }),
        }
      );

      if (response.ok) {
        onConnect(provider);
      } else {
        console.error(`Failed to connect to ${provider}`);
      }
    } catch (error) {
      console.error(`Error connecting to ${provider}:`, error);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Connect Your Accounts
        </h2>
        <p className="text-gray-600">
          Optional: Connect your accounts to get better personalized recommendations.
        </p>
      </div>

      <div className="grid gap-4 mb-8">
        {PROVIDERS.map((provider) => {
          const isConnected = connectedAccounts.includes(provider.id);

          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 transition-all"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${provider.color} rounded-lg flex items-center justify-center text-2xl`}>
                  {provider.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                  <p className="text-sm text-gray-600">{provider.description}</p>
                </div>
              </div>

              <button
                onClick={() => !isConnected && handleConnect(provider.id)}
                disabled={isConnected}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  isConnected
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isConnected ? '✓ Connected' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 text-xl">ℹ️</span>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Why connect accounts?</p>
            <p>
              Connecting your accounts helps us understand your preferences better and provide
              more accurate recommendations. You can disconnect anytime from your profile settings.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Complete Setup →
        </button>
      </div>
    </div>
  );
}
