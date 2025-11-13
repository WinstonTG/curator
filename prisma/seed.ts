/**
 * Prisma Seed Data
 * Creates test users with preference graphs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user 1: Music & News enthusiast
  const user1 = await prisma.user.upsert({
    where: { email: 'alex@example.com' },
    update: {},
    create: {
      email: 'alex@example.com',
      display_name: 'Alex Chen',
      avatar_url: 'https://i.pravatar.cc/150?u=alex',
      oauth_providers: ['spotify', 'google'],
      last_login: new Date(),
    },
  });

  console.log(`✅ Created user: ${user1.display_name}`);

  // Alex's music interests
  await prisma.interest.createMany({
    data: [
      {
        user_id: user1.id,
        domain: 'music',
        type: 'genre',
        value: 'electronic',
        weight: 0.9,
        source: 'explicit',
      },
      {
        user_id: user1.id,
        domain: 'music',
        type: 'genre',
        value: 'jazz',
        weight: 0.7,
        source: 'inferred',
      },
      {
        user_id: user1.id,
        domain: 'music',
        type: 'mood',
        value: 'upbeat',
        weight: 0.8,
        source: 'explicit',
      },
      {
        user_id: user1.id,
        domain: 'music',
        type: 'artist',
        value: 'Bonobo',
        weight: 1.0,
        source: 'imported',
      },
    ],
  });

  // Alex's news interests
  await prisma.interest.createMany({
    data: [
      {
        user_id: user1.id,
        domain: 'news',
        type: 'topic',
        value: 'artificial intelligence',
        weight: 0.95,
        source: 'explicit',
      },
      {
        user_id: user1.id,
        domain: 'news',
        type: 'topic',
        value: 'climate change',
        weight: 0.75,
        source: 'explicit',
      },
      {
        user_id: user1.id,
        domain: 'news',
        type: 'category',
        value: 'technology',
        weight: 0.9,
        source: 'inferred',
      },
    ],
  });

  // Alex's constraints
  await prisma.constraint.createMany({
    data: [
      {
        user_id: user1.id,
        domain: 'music',
        type: 'dislike_genre',
        value: 'country',
        reason: 'Not a fan',
      },
      {
        user_id: user1.id,
        domain: 'news',
        type: 'bias_filter',
        value: 'center',
        reason: 'Prefer balanced coverage',
      },
    ],
  });

  console.log(`✅ Created ${user1.display_name}'s preferences`);

  // Create test user 2: Recipe & Learning focus
  const user2 = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      email: 'maria@example.com',
      display_name: 'Maria Rodriguez',
      avatar_url: 'https://i.pravatar.cc/150?u=maria',
      oauth_providers: ['google'],
      last_login: new Date(),
    },
  });

  console.log(`✅ Created user: ${user2.display_name}`);

  // Maria's recipe interests
  await prisma.interest.createMany({
    data: [
      {
        user_id: user2.id,
        domain: 'recipes',
        type: 'cuisine',
        value: 'italian',
        weight: 0.85,
        source: 'explicit',
      },
      {
        user_id: user2.id,
        domain: 'recipes',
        type: 'cuisine',
        value: 'thai',
        weight: 0.9,
        source: 'explicit',
      },
      {
        user_id: user2.id,
        domain: 'recipes',
        type: 'dish_type',
        value: 'desserts',
        weight: 0.7,
        source: 'inferred',
      },
    ],
  });

  // Maria's learning interests
  await prisma.interest.createMany({
    data: [
      {
        user_id: user2.id,
        domain: 'learning',
        type: 'skill',
        value: 'machine learning',
        weight: 0.95,
        source: 'explicit',
      },
      {
        user_id: user2.id,
        domain: 'learning',
        type: 'skill',
        value: 'data visualization',
        weight: 0.8,
        source: 'explicit',
      },
      {
        user_id: user2.id,
        domain: 'learning',
        type: 'subject',
        value: 'python',
        weight: 0.9,
        source: 'inferred',
      },
    ],
  });

  // Maria's constraints
  await prisma.constraint.createMany({
    data: [
      {
        user_id: user2.id,
        domain: 'recipes',
        type: 'dietary_restriction',
        value: 'vegetarian',
        reason: 'Dietary preference',
      },
      {
        user_id: user2.id,
        domain: 'recipes',
        type: 'allergen',
        value: 'peanuts',
        reason: 'Allergy',
      },
      {
        user_id: user2.id,
        domain: 'learning',
        type: 'price_max',
        value: '50',
        reason: 'Budget constraint',
      },
    ],
  });

  console.log(`✅ Created ${user2.display_name}'s preferences`);

  // Create some interaction history
  await prisma.interactionHistory.createMany({
    data: [
      {
        user_id: user1.id,
        item_id: 'spotify_track_123',
        domain: 'music',
        action: 'saved',
        feedback: 'liked',
        context: { time_of_day: 'evening', weather: 'rainy' },
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
      },
      {
        user_id: user1.id,
        item_id: 'news_article_456',
        domain: 'news',
        action: 'viewed',
        context: { time_of_day: 'morning' },
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      },
      {
        user_id: user2.id,
        item_id: 'recipe_789',
        domain: 'recipes',
        action: 'tried',
        feedback: 'liked',
        context: { time_of_day: 'afternoon' },
        timestamp: new Date(Date.now() - 172800000), // 2 days ago
      },
    ],
  });

  console.log('✅ Created interaction history');
  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
