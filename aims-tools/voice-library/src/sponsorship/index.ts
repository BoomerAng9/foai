/**
 * @aims/voice-library/sponsorship — barrel export
 */

export type { BrandIdentity, ProductSku } from './brands.js';
export {
  COASTAL_BRAND,
  PERFORM_BRAND,
  ACHIEVEMOR_BRAND,
  BRAND_REGISTRY,
  COASTAL_SKUS,
  SKU_REGISTRY,
  getBrand,
  getSku,
  getSkusByBrand,
} from './brands.js';

export type { PlugFormat, PlugRequest, PlugScript } from './plug-engine.js';
export { PlugError, generatePlug, generateAllSponsorReads } from './plug-engine.js';
