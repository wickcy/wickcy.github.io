import { z } from 'astro/zod';
import { publicAsset } from '../../lib/travel-policy.js';

const text = z.string().min(1);
const id = z.string().regex(/^[a-z0-9-]+$/);
const https = z.string().url().refine(value => value.startsWith('https://'));
const day = z.object({
  title: text, label: text.optional(), summary: text.optional(),
  stops: z.array(z.object({ time: text.optional(), name: text, note: text.optional(), url: z.string().refine(publicAsset).optional() })),
});
const references = z.array(id).min(1);
const photo = z.object({
  src: z.string().refine(publicAsset), alt: text, width: z.number().positive(), height: z.number().positive(),
  sourceUrl: https, author: text, license: text, licenseUrl: https,
});
export const guideSchema = z.object({
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  intro: text, scope: text, scopeLabel: text, transportTitle: text, recommendation: text, defaultVariant: id,
  photo: photo.optional(),
  transport: z.array(z.object({ id, title: text, tag: text, route: text, duration: text, description: text, note: text, sources: references })).min(1),
  variants: z.array(z.object({
    id, duration: z.number().int().min(1).max(30), name: text, badge: text, summary: text,
    condition: text, nights: text, route: z.array(text).min(2), days: z.array(day).min(1),
    extension: text.optional(),
  })).min(1),
  places: z.array(z.object({ id, name: text, tag: text, description: text, time: text, winter: text, mapQuery: text, sources: references, photo: photo.optional() })),
  stays: z.array(z.object({ title: text, description: text })),
  practical: z.array(z.object({ title: text, description: text, sources: references })),
  checklist: z.array(z.object({ id, text })),
  sources: z.array(z.object({ id, title: text, url: https, note: text })).min(1),
}).superRefine((guide, ctx) => {
  for (const key of ['variants', 'places', 'transport', 'checklist', 'sources'] as const) {
    if (new Set(guide[key].map(item => item.id)).size !== guide[key].length) {
      ctx.addIssue({ code: 'custom', path: [key], message: 'ID 不可重复' });
    }
  }
  if (!guide.variants.some(variant => variant.id === guide.defaultVariant)) {
    ctx.addIssue({ code: 'custom', path: ['defaultVariant'], message: '默认方案不存在' });
  }
  guide.variants.forEach((variant, index) => {
    if (variant.days.length !== variant.duration) ctx.addIssue({ code: 'custom', path: ['variants', index, 'days'], message: '总天数必须包含全部交通日与跨日返程' });
  });
  const sourceIds = new Set(guide.sources.map(source => source.id));
  for (const item of [...guide.transport, ...guide.places, ...guide.practical]) {
    if (item.sources.some(source => !sourceIds.has(source))) ctx.addIssue({ code: 'custom', message: '资料引用不存在' });
  }
});
export const itinerarySchema = z.object({
  type: z.literal('itinerary'), days: z.array(day), budgetNote: text.optional(), guide: guideSchema.optional(),
  recorded: z.literal(true).optional(),
});
export type JourneyGuideData = z.infer<typeof guideSchema>;
