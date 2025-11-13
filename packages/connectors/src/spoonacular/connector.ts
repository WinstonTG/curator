/**
 * Spoonacular API Connector (for Recipes)
 */

import type { Connector, ConnectorConfig, FetchResult, ConnectorHealth } from '../base/types';
import type { Item } from '@curator/types/src/item';
import { AuthenticationError, NetworkError, MappingError } from '../base/errors';

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  extendedIngredients?: Array<{
    original: string;
  }>;
  analyzedInstructions?: Array<{
    steps: Array<{
      step: string;
    }>;
  }>;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
    }>;
  };
}

interface SpoonacularSearchResponse {
  results: SpoonacularRecipe[];
  offset: number;
  number: number;
  totalResults: number;
}

export class SpoonacularConnector implements Connector<SpoonacularRecipe> {
  readonly source = 'spoonacular' as const;
  private baseUrl = 'https://api.spoonacular.com';

  constructor(public readonly config: ConnectorConfig) {
    if (!config.apiKey) {
      throw new Error('Spoonacular API requires apiKey');
    }
  }

  async fetch(cursor?: string, limit: number = 20): Promise<FetchResult<SpoonacularRecipe>> {
    const offset = cursor ? parseInt(cursor) : 0;
    const params = new URLSearchParams({
      number: limit.toString(),
      offset: offset.toString(),
      addRecipeInformation: 'true',
      apiKey: this.config.apiKey!,
    });

    try {
      const response = await fetch(`${this.baseUrl}/recipes/complexSearch?${params}`, {
        signal: AbortSignal.timeout(this.config.timeout || 10000),
      });

      if (response.status === 401 || response.status === 402) {
        throw new AuthenticationError(this.source, 'Invalid API key or quota exceeded');
      }
      if (!response.ok) {
        throw new NetworkError(this.source, `API error: ${response.status}`);
      }

      const data: SpoonacularSearchResponse = await response.json();
      return {
        items: data.results,
        nextCursor: data.results.length === limit ? (offset + limit).toString() : undefined,
        total: data.totalResults,
        hasMore: data.results.length === limit,
      };
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new NetworkError(this.source, 'Request failed', error as Error);
    }
  }

  map(recipe: SpoonacularRecipe): Item {
    try {
      const dietary = recipe.diets.map(d => d.toLowerCase()) as Array<'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'keto' | 'paleo'>;
      const ingredients = recipe.extendedIngredients?.map(i => i.original) || [];
      const instructions = recipe.analyzedInstructions?.[0]?.steps.map(s => s.step) || [];

      // Extract nutrition info
      const nutrition: any = {};
      if (recipe.nutrition) {
        const nutrients = recipe.nutrition.nutrients;
        const calories = nutrients.find(n => n.name === 'Calories');
        const protein = nutrients.find(n => n.name === 'Protein');
        const carbs = nutrients.find(n => n.name === 'Carbohydrates');
        const fat = nutrients.find(n => n.name === 'Fat');

        if (calories) nutrition.calories = calories.amount;
        if (protein) nutrition.protein_g = protein.amount;
        if (carbs) nutrition.carbs_g = carbs.amount;
        if (fat) nutrition.fat_g = fat.amount;
      }

      return {
        id: `spoonacular-${recipe.id}`,
        domain: 'recipes',
        title: recipe.title,
        description: `${recipe.cuisines.join(', ')} recipe - Ready in ${recipe.readyInMinutes} minutes`,
        source: {
          name: 'Spoonacular',
          id: recipe.id.toString(),
          url: recipe.sourceUrl,
          reputation_score: 85,
        },
        embeddings: undefined,
        topics: [...recipe.cuisines, ...recipe.dishTypes, 'recipes'],
        actions: ['save', 'try'],
        sponsored: false,
        created_at: new Date().toISOString(),
        meta: {
          domain: 'recipes',
          author: undefined,
          cuisine: recipe.cuisines,
          dietary: dietary,
          difficulty: this.inferDifficulty(recipe.readyInMinutes),
          prep_time_minutes: Math.floor(recipe.readyInMinutes * 0.3), // Estimate
          cook_time_minutes: Math.floor(recipe.readyInMinutes * 0.7), // Estimate
          total_time_minutes: recipe.readyInMinutes,
          servings: recipe.servings,
          ingredients: ingredients,
          instructions: instructions.length > 0 ? instructions : undefined,
          nutrition: Object.keys(nutrition).length > 0 ? nutrition : undefined,
          image_url: recipe.image,
        },
      };
    } catch (error) {
      throw new MappingError(this.source, recipe.id.toString(), 'Failed to map recipe', error as Error);
    }
  }

  private inferDifficulty(readyInMinutes: number): 'beginner' | 'intermediate' | 'advanced' {
    if (readyInMinutes <= 30) return 'beginner';
    if (readyInMinutes <= 60) return 'intermediate';
    return 'advanced';
  }

  async validateAuth(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/recipes/complexSearch?number=1&apiKey=${this.config.apiKey}`;
      const response = await fetch(url);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getHealth(): Promise<ConnectorHealth> {
    const startTime = Date.now();
    try {
      const isHealthy = await this.validateAuth();
      return {
        source: this.source,
        healthy: isHealthy,
        lastCheck: new Date().toISOString(),
        latency: Date.now() - startTime,
        errorRate: 0,
      };
    } catch (error) {
      return {
        source: this.source,
        healthy: false,
        lastCheck: new Date().toISOString(),
        latency: Date.now() - startTime,
        details: (error as Error).message,
      };
    }
  }
}
