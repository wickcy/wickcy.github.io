import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const trips = defineCollection({
  loader: glob({
    pattern: '*/index.md',
    base: './content/trips',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    status: z.enum(['planning', 'completed', 'cancelled']),
    published: z.boolean().default(false),
    cityIds: z.array(z.string()).default([]),
    visitedCityIds: z.array(z.string()).default([]),
    season: z.string().optional(),
    updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    coverIsReference: z.boolean().default(false),
    planType: z.string().optional(),
  }),
});

export const collections = { trips };
