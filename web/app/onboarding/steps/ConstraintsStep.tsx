import { useState } from 'react';
import { StepProps, Constraint, Domain } from '../types';

interface ConstraintsStepProps extends StepProps {
  currentConstraints: Constraint[];
  onUpdate: (domain: Domain, constraints: Array<{ type: string; value: string; reason?: string }>) => void;
}

const CONSTRAINT_TYPES = {
  recipes: [
    { type: 'dietary_restriction', label: 'Dietary Restrictions', values: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo', 'Nut-Free'] },
    { type: 'allergen', label: 'Allergens to Avoid', values: ['Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Soy', 'Wheat', 'Dairy'] },
  ],
  news: [
    { type: 'block_publication', label: 'Block Publications', values: [], isCustom: true },
    { type: 'avoid_topic', label: 'Topics to Avoid', values: ['Politics', 'Sports', 'Celebrity News', 'Crime', 'Disaster News'] },
  ],
  music: [
    { type: 'avoid_genre', label: 'Genres to Avoid', values: ['Heavy Metal', 'Rap', 'Country', 'Opera', 'EDM'] },
  ],
  learning: [
    { type: 'skill_level', label: 'Preferred Skill Level', values: ['Beginner', 'Intermediate', 'Advanced'], isSingleSelect: true },
  ],
  events: [
    { type: 'location_preference', label: 'Location', values: ['Local Only', 'Willing to Travel', 'Virtual Only'], isSingleSelect: true },
  ],
};

export function ConstraintsStep({ currentConstraints, onUpdate, onNext, onBack }: ConstraintsStepProps) {
  const [selectedConstraints, setSelectedConstraints] = useState<Record<string, Set<string>>>(() => {
    const initial: Record<string, Set<string>> = {};
    currentConstraints.forEach(c => {
      const key = `${c.domain}:${c.type}`;
      if (!initial[key]) {
        initial[key] = new Set();
      }
      initial[key].add(c.value);
    });
    return initial;
  });

  const toggleConstraint = (domain: Domain, type: string, value: string, isSingleSelect: boolean = false) => {
    const key = `${domain}:${type}`;
    setSelectedConstraints(prev => {
      const newSet = new Set(prev[key] || []);

      if (isSingleSelect) {
        // For single select, clear and set the value
        return { ...prev, [key]: new Set([value]) };
      } else {
        // For multi-select, toggle
        if (newSet.has(value)) {
          newSet.delete(value);
        } else {
          newSet.add(value);
        }
        return { ...prev, [key]: newSet };
      }
    });
  };

  const handleNext = () => {
    // Group by domain and update
    const byDomain: Record<Domain, Array<{ type: string; value: string }>> = {
      music: [],
      news: [],
      recipes: [],
      learning: [],
      events: [],
    };

    Object.entries(selectedConstraints).forEach(([key, values]) => {
      const [domain, type] = key.split(':') as [Domain, string];
      values.forEach(value => {
        byDomain[domain].push({ type, value });
      });
    });

    Object.entries(byDomain).forEach(([domain, constraints]) => {
      onUpdate(domain as Domain, constraints);
    });

    onNext();
  };

  const getTotalConstraints = () => {
    return Object.values(selectedConstraints).reduce((sum, set) => sum + set.size, 0);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Set Your Preferences
        </h2>
        <p className="text-gray-600">
          Help us filter out content you don't want to see. All optional.
        </p>
      </div>

      <div className="space-y-8 mb-8">
        {/* Recipes Constraints */}
        {CONSTRAINT_TYPES.recipes && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">🍳</span> Recipes
            </h3>
            <div className="space-y-6">
              {CONSTRAINT_TYPES.recipes.map(({ type, label, values }) => (
                <div key={type}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
                  <div className="flex flex-wrap gap-2">
                    {values.map(value => {
                      const key = `recipes:${type}`;
                      const isSelected = selectedConstraints[key]?.has(value);
                      return (
                        <button
                          key={value}
                          onClick={() => toggleConstraint('recipes', type, value)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            isSelected
                              ? 'bg-red-100 text-red-700 border-2 border-red-600'
                              : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                          }`}
                        >
                          {value}
                          {isSelected && <span className="ml-1">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* News Constraints */}
        {CONSTRAINT_TYPES.news && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📰</span> News
            </h3>
            <div className="space-y-6">
              {CONSTRAINT_TYPES.news.map(({ type, label, values, isCustom }) => (
                <div key={type}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{label}</h4>
                  {isCustom ? (
                    <input
                      type="text"
                      placeholder="e.g., Publication Name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          const value = e.currentTarget.value.trim();
                          if (value) {
                            toggleConstraint('news', type, value);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {values.map(value => {
                        const key = `news:${type}`;
                        const isSelected = selectedConstraints[key]?.has(value);
                        return (
                          <button
                            key={value}
                            onClick={() => toggleConstraint('news', type, value)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-red-100 text-red-700 border-2 border-red-600'
                                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                            }`}
                          >
                            {value}
                            {isSelected && <span className="ml-1">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {getTotalConstraints() > 0 && (
        <div className="bg-red-50 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-700">
            <strong>{getTotalConstraints()}</strong> preferences set
          </div>
        </div>
      )}

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
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Next: Connect Accounts →
        </button>
      </div>
    </div>
  );
}
