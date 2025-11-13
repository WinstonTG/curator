/**
 * Spotify Mapper Tests
 */

import { describe, it, expect } from 'vitest';
import { mapSpotifyTrack } from './mapper';
import type { SpotifyTrack } from './types';

describe('Spotify Mapper', () => {
  const mockTrack: SpotifyTrack = {
    id: 'track123',
    name: 'Test Song',
    artists: [
      { id: 'artist1', name: 'Artist One' },
      { id: 'artist2', name: 'Artist Two' },
    ],
    album: {
      id: 'album1',
      name: 'Test Album',
      images: [
        { url: 'https://example.com/large.jpg', height: 640, width: 640 },
        { url: 'https://example.com/small.jpg', height: 64, width: 64 },
      ],
      release_date: '2024-01-15',
    },
    duration_ms: 180000,
    popularity: 85,
    preview_url: 'https://example.com/preview.mp3',
    external_urls: {
      spotify: 'https://open.spotify.com/track/track123',
    },
  };

  it('should map Spotify track to unified Item schema', () => {
    const item = mapSpotifyTrack(mockTrack);

    expect(item.id).toBe('spotify-track123');
    expect(item.domain).toBe('music');
    expect(item.title).toBe('Test Song');
    expect(item.description).toContain('Artist One');
    expect(item.description).toContain('Test Album');
  });

  it('should include source information', () => {
    const item = mapSpotifyTrack(mockTrack);

    expect(item.source.name).toBe('Spotify');
    expect(item.source.id).toBe('track123');
    expect(item.source.url).toBe('https://open.spotify.com/track/track123');
    expect(item.source.reputation_score).toBe(95);
  });

  it('should map metadata correctly', () => {
    const item = mapSpotifyTrack(mockTrack);

    expect(item.meta.domain).toBe('music');
    expect(item.meta.spotify_id).toBe('track123');
    expect(item.meta.artists).toEqual(['Artist One', 'Artist Two']);
    expect(item.meta.album).toBe('Test Album');
    expect(item.meta.duration_seconds).toBe(180);
    expect(item.meta.popularity).toBe(85);
    expect(item.meta.preview_url).toBe('https://example.com/preview.mp3');
    expect(item.meta.image_url).toBe('https://example.com/large.jpg');
  });

  it('should include artists in topics', () => {
    const item = mapSpotifyTrack(mockTrack);

    expect(item.topics).toContain('Artist One');
    expect(item.topics).toContain('Artist Two');
    expect(item.topics).toContain('music');
  });

  it('should set sponsored to false', () => {
    const item = mapSpotifyTrack(mockTrack);
    expect(item.sponsored).toBe(false);
  });

  it('should set actions to save', () => {
    const item = mapSpotifyTrack(mockTrack);
    expect(item.actions).toEqual(['save']);
  });

  it('should handle tracks with no preview URL', () => {
    const trackWithoutPreview = { ...mockTrack, preview_url: null };
    const item = mapSpotifyTrack(trackWithoutPreview);

    expect(item.meta.preview_url).toBeUndefined();
  });

  it('should handle tracks with no album images', () => {
    const trackWithoutImages = {
      ...mockTrack,
      album: { ...mockTrack.album, images: [] },
    };
    const item = mapSpotifyTrack(trackWithoutImages);

    expect(item.meta.image_url).toBeUndefined();
  });
});
