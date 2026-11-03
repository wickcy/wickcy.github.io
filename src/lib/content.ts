import { getCollection } from 'astro:content';
import { z } from 'astro/zod';
import cityData from '../../content/places/cities.json';
import { publishedTrips, visitedCities, publicAsset } from './travel-policy.js';
import { normalizeCityCountry } from './geography.mjs';

const asset = z.string().refine(publicAsset, '图片地址须为站内绝对路径或 HTTPS');
const photoSchema = z.object({
  id:z.string().min(1), src:asset, thumbnail:asset.optional(), preview:asset.optional(), alt:z.string().min(1),
  caption:z.string().optional(), cityId:z.string().optional(), featured:z.boolean().optional(),
  ticketSrc:asset.optional(), ticketWidth:z.number().positive().optional(), ticketHeight:z.number().positive().optional(),
  width:z.number().positive().optional(), height:z.number().positive().optional(),
});
const photoFiles = import.meta.glob('../../content/trips/*/photos.json', { eager:true, import:'default' });
const planFiles = import.meta.glob('../../content/trips/*/plans.json', { eager:true, import:'default' });
const recommendationFiles = import.meta.glob('../../content/trips/*/recommendations.json', { eager:true, import:'default' });
export const cities = z.array(z.object({
  id:z.string().regex(/^[a-z0-9-]+$/), name:z.string(), countryCode:z.string().length(3),
  countryName:z.string(), region:z.string().optional(), lat:z.number().min(-90).max(90),
  regionCode:z.string().regex(/^\d{6}$/).optional(), cityCode:z.string().regex(/^\d{6}$/).optional(),
  lng:z.number().min(-180).max(180), coordinateSystem:z.literal('WGS84'), description:z.string().optional(),
})).parse(cityData).map(normalizeCityCountry);
if(new Set(cities.map(c=>c.id)).size!==cities.length) throw new Error('城市 ID 重复');

export async function siteContent() {
  const trips = publishedTrips(await getCollection('trips'));
  const cityIds = new Set(cities.map(c=>c.id));
  for(const trip of trips) {
    for(const id of [...trip.data.cityIds,...trip.data.visitedCityIds]) {
      if(!cityIds.has(id)) throw new Error(`${trip.id} 引用了未定义城市 ${id}`);
    }
    if(trip.data.cover && !publicAsset(trip.data.cover)) throw new Error(`${trip.id} 封面地址无效`);
  }
  const visited = visitedCities(trips,cities);
  return {trips,cities,visited,countryCount:new Set(visited.map(c=>c.countryCode)).size};
}

export function tripPhotos(tripId:string) {
  const raw = photoFiles[`../../content/trips/${tripId}/photos.json`] ?? [];
  const photos = z.array(photoSchema).parse(raw);
  if(new Set(photos.map(p=>p.id)).size!==photos.length) throw new Error(`${tripId} 照片 ID 重复`);
  if(photos.filter(p=>p.featured).length>3) throw new Error(`${tripId} 最多选择 3 张精选照片`);
  for(const photo of photos) {
    if(photo.cityId && !cities.some(c=>c.id===photo.cityId)) throw new Error(`${tripId} 照片引用未定义城市`);
  }
  return photos;
}
export function tripPlan(tripId:string) {
  const raw=planFiles[`../../content/trips/${tripId}/plans.json`];
  if(!raw)return undefined;
  const itinerary=z.object({
    type:z.literal('itinerary'),
    days:z.array(z.object({title:z.string().min(1),label:z.string().min(1).optional(),summary:z.string().optional(),stops:z.array(z.object({
      time:z.string().optional(),name:z.string().min(1),note:z.string().optional(),url:z.string().refine(publicAsset).optional(),
    }))})),budgetNote:z.string().optional(),
  });
  const comparison=z.object({
    type:z.literal('comparison'),markup:z.string(),title:z.string(),initial:z.object({dest:z.string(),days:z.number(),arrival:z.string()}),
    destinations:z.array(z.object({id:z.string()})),cases:z.record(z.string(),z.unknown()),
    travelData:z.object({hotels:z.record(z.string(),z.unknown()),places:z.record(z.string(),z.unknown())}),
  }).passthrough();
  const parsed=z.discriminatedUnion('type',[itinerary,comparison]).safeParse(raw);
  if(!parsed.success)throw new Error(`${tripId} 的 plans.json 格式不正确：${parsed.error.message}`);
  return parsed.data.type==='comparison'?raw:parsed.data;
}

export function tripRecommendations(tripId:string) {
  const https = z.string().url().refine(value => value.startsWith('https://'), '来源链接须为 HTTPS');
  const recommendations = z.array(z.object({
    id:z.string().min(1), name:z.string().min(1), description:z.string().min(1),
    image:asset, alt:z.string().min(1), width:z.number().positive(), height:z.number().positive(),
    visitStatus:z.enum(['visited','suggestion']),
    sourceUrl:https, sourceLabel:z.string().min(1), checkedAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    imageSourceUrl:https, imageAuthor:z.string().min(1), imageLicense:z.string().min(1), imageLicenseUrl:https,
  })).parse(recommendationFiles[`../../content/trips/${tripId}/recommendations.json`] ?? []);
  if(new Set(recommendations.map(place=>place.id)).size!==recommendations.length) throw new Error(`${tripId} 景点推荐 ID 重复`);
  return recommendations;
}
