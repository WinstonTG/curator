import { useState } from 'react';
import { StepProps, Interest, Domain } from '../types';

interface InterestsStepProps extends StepProps {
  currentInterests: Interest[];
  onUpdate: (domain: Domain, interests: string[]) => void;
}

const DOMAIN_CONFIG = {
  music: {
    icon: '🎵',
    label: 'Music',
    placeholder: 'e.g., Jazz, Rock, Electronic, Classical',
    suggestions: ['Jazz', 'Rock', 'Electronic', 'Hip Hop', 'Classical', 'Indie', 'Pop', 'Country'],
  },
  news: {
    icon: '📰',
    label: 'News',
    placeholder: 'e.g., Technology, Politics, Science, Business',
    suggestions: ['Technology', 'Politics', 'Science', 'Business', 'Environment', 'Health', 'Sports', 'Culture'],
  },
  recipes: {
    icon: '🍳',
    label: 'Recipes',
    placeholder: 'e.g., Italian, Vegan, Baking, Quick Meals',
    suggestions: ['Italian', 'Asian', 'Vegan', 'Baking', 'Quick Meals', 'Mexican', 'Mediterranean', 'BBQ'],
  },
  learning: {
    icon: '📚',
    label: 'Learning',
    placeholder: 'e.g., Programming, Design, Language Learning',
    suggestions: ['Programming', 'Design', 'Languages', 'Data Science', 'Marketing', 'Business', 'Photography', 'Music'],
  },
  events: {
    icon: '📅',
    label: 'Events',
    placeholder: 'e.g., Concerts, Tech Meetups, Art Exhibitions',
    suggestions: ['Concerts', 'Tech Meetups', 'Art Exhibitions', 'Workshops', 'Conferences', 'Networking', 'Sports', 'Theater'],
  },
};

export function InterestsStep({ currentInterests, onUpdate, onNext, onBack }: InterestsStepProps) {
  const [activeDomain, setActiveDomain] = useState<Domain>('music');
  const [selectedInterests, setSelectedInterests] = useState<Record<Domain, Set<string>>>({
    music: new Set(currentInterests.filter(i => i.domain === 'music').map(i => i.value)),
    news: new Set(currentInterests.filter(i => i.domain === 'news').map(i => i.value)),
    recipes: new Set(currentInterests.filter(i => i.domain === 'recipes').map(i => i.value)),
    learning: new Set(currentInterests.filter(i => i.domain === 'learning').map(i => i.value)),
    events: new Set(currentInterests.filter(i => i.domain === 'events').map(i => i.value)),
  });

  const toggleInterest = (domain: Domain, interest: string) => {
    setSelectedInterests(prev => {
      const newSet = new Set(prev[domain]);
      if (newSet.has(interest)) {
        newSet.delete(interest);
      } else {
        newSet.add(interest);
      }
      return { ...prev, [domain]: newSet };
    });
  };

  const handleNext = () => {
    // Update all interests
    Object.entries(selectedInterests).forEach(([domain, interests]) => {
      onUpdate(domain as Domain, Array.from(interests));
    });
    onNext();
  };

  const getTotalInterests = () => {
    return Object.values(selectedInterests).reduce((sum, set) => sum + set.size, 0);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          What are you interested in?
        </h2>
        <p className="text-gray-600">
          Select topics you'd like to see more of. You can always add more later.
        </p>
      </div>

      {/* Domain Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.keys(DOMAIN_CONFIG) as Domain[]).map((domain) => {
          const config = DOMAIN_CONFIG[domain];
          const count = selectedInterests[domain].size;
          return (
            <button
              key={domain}
              onClick={() => setActiveDomain(domain)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeDomain === domain
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {config.icon} {config.label}
              {count > 0 && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeDomain === domain ? 'bg-indigo-500' : 'bg-gray-300 text-gray-700'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Interest Selection */}
      <div className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DOMAIN_CONFIG[activeDomain].suggestions.map((interest) => {
            const isSelected = selectedInterests[activeDomain].has(interest);
            return (
              <button
                key={interest}
                onClick={() => toggleInterest(activeDomain, interest)}
                className={`px-4 py-3 rounded-lg font-medium transition-all text-left ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-600'
                    : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{interest}</span>
                  {isSelected && <span className="text-indigo-600">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-indigo-50 rounded-lg p-4 mb-6">
        <div className="text-sm text-gray-700">
          <strong>{getTotalInterests()}</strong> interests selected across{' '}
          <strong>{Object.values(selectedInterests).filter(set => set.size > 0).length}</strong> domains
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
          onClick={handleNext}
          disabled={getTotalInterests() === 0}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next: Constraints →
        </button>
      </div>
    </div>
  );
}
