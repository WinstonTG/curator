import { useRouter } from 'next/navigation';
import { OnboardingData } from '../types';

interface CompletionStepProps {
  data: OnboardingData;
  userId: string;
}

export function CompletionStep({ data, userId }: CompletionStepProps) {
  const router = useRouter();

  const handleGetStarted = () => {
    // Redirect to main app
    router.push('/');
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
      <div className="mb-8">
        <div className="inline-block p-4 bg-green-100 rounded-full mb-4">
          <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          You're All Set!
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your personalized content discovery experience is ready. Let's explore what we've curated for you.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-4 mb-8 text-left">
        <div className="bg-indigo-50 rounded-lg p-6">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-2xl font-bold text-indigo-600 mb-1">{data.interests.length}</div>
          <div className="text-sm text-gray-700">Interests Selected</div>
        </div>

        <div className="bg-purple-50 rounded-lg p-6">
          <div className="text-3xl mb-2">🛡️</div>
          <div className="text-2xl font-bold text-purple-600 mb-1">{data.constraints.length}</div>
          <div className="text-sm text-gray-700">Preferences Set</div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6">
          <div className="text-3xl mb-2">🔗</div>
          <div className="text-2xl font-bold text-blue-600 mb-1">{data.connectedAccounts.length}</div>
          <div className="text-sm text-gray-700">Accounts Connected</div>
        </div>
      </div>

      {/* What's Next */}
      <div className="mb-8 text-left max-w-xl mx-auto bg-gray-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          What's Next?
        </h2>
        <ul className="space-y-3 text-gray-600">
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">1.</span>
            Explore personalized recommendations across all domains
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">2.</span>
            Save items you like and provide feedback to improve recommendations
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">3.</span>
            Refine your preferences anytime from your profile
          </li>
        </ul>
      </div>

      <button
        onClick={handleGetStarted}
        className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
      >
        Start Exploring →
      </button>

      <p className="mt-6 text-sm text-gray-500">
        You can always update your preferences in Settings
      </p>
    </div>
  );
}
