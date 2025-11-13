/**
 * Spotify to Unified Item Schema Mapper
 */

import type { Item } from '@curator/types/src/item';
import type { SpotifyTrack } from './types';
import { MappingError } from '../base/errors';

/**
 * Map Spotify track to unified Item schema
 */
export function mapSpotifyTrack(track: SpotifyTrack): Item {
  try {
    // Extract genres from search context if available, otherwise use empty array
    const genres: string[] = [];

    // Get the largest album image
    const albumImage = track.album.images.sort((a, b) => b.width - a.width)[0];

    const item: Item = {
      id: `spotify-${track.id}`,
      domain: 'music',
      title: track.name,
      description: `${track.artists.map(a => a.name).join(', ')} - ${track.album.name}`,
      source: {
        name: 'Spotify',
        id: track.id,
        url: track.external_urls.spotify,
        reputation_score: 95, // Spotify is a trusted source
      },
      embeddings: undefined, // Will be generated separately by embedding service
      topics: [
        ...track.artists.map(a => a.name),
        ...genres,
        'music',
      ],
      actions: ['save'],
      sponsored: false,
      created_at: new Date().toISOString(),
      meta: {
        domain: 'music',
        spotify_id: track.id,
        artists: track.artists.map(a => a.name),
        album: track.album.name,
        duration_seconds: Math.floor(track.duration_ms / 1000),
        genres: genres,
        mood: inferMoodFromPopularity(track.popularity),
        release_date: track.album.release_date,
        popularity: track.popularity,
        preview_url: track.preview_url || undefined,
        image_url: albumImage?.url,
      },
    };

    return item;
  } catch (error) {
    throw new MappingError('spotify', track.id, 'Failed to map Spotify track', error as Error);
  }
}

/**
 * Infer mood from popularity score
 * This is a simple heuristic - in production you'd use audio features API
 */
function inferMoodFromPopularity(popularity: number): string[] {
  if (popularity >= 80) return ['trending', 'popular'];
  if (popularity >= 60) return ['upbeat'];
  if (popularity >= 40) return ['chill'];
  return ['discover'];
}

/**
 * Batch map multiple Spotify tracks
 */
export function mapSpotifyTracks(tracks: SpotifyTrack[]): Array<{ item?: Item; error?: Error }> {
  return tracks.map(track => {
    try {
      return { item: mapSpotifyTrack(track) };
    } catch (error) {
      return { error: error as Error };
    }
  });
}
