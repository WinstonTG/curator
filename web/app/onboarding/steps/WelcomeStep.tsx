import { StepProps } from '../types';

export function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Welcome to Curator
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Your personalized AI-powered content discovery platform across Music, News, Recipes, Learning, and Events.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { icon: '🎵', label: 'Music' },
          { icon: '📰', label: 'News' },
          { icon: '🍳', label: 'Recipes' },
          { icon: '📚', label: 'Learning' },
          { icon: '📅', label: 'Events' },
        ].map((domain) => (
          <div key={domain.label} className="p-4 bg-indigo-50 rounded-lg">
            <div className="text-3xl mb-2">{domain.icon}</div>
            <div className="text-sm font-medium text-gray-700">{domain.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 text-left max-w-xl mx-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Let's personalize your experience
        </h2>
        <ul className="space-y-3 text-gray-600">
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">✓</span>
            Tell us about your interests and preferences
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">✓</span>
            Set dietary restrictions, content filters, and other constraints
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">✓</span>
            Connect your accounts for better recommendations
          </li>
          <li className="flex items-start">
            <span className="text-indigo-600 mr-2">✓</span>
            Get curated content tailored just for you
          </li>
        </ul>
      </div>

      <button
        onClick={onNext}
        className="px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
      >
        Get Started →
      </button>

      <p className="mt-6 text-sm text-gray-500">
        Takes about 3 minutes • You can always change these later
      </p>
    </div>
  );
}
