import type { IndustryPluginManifest } from './appMode';
import catering from '../plugins/catering/manifest.json';
import beauty from '../plugins/beauty/manifest.json';
import pet from '../plugins/pet/manifest.json';
import convenienceStore from '../plugins/convenience-store/manifest.json';
import liquorWholesale from '../plugins/liquor-wholesale/manifest.json';
import phoneAccessories from '../plugins/phone-accessories/manifest.json';
import freshFood from '../plugins/fresh-food-delivery/manifest.json';
import autoParts from '../plugins/auto-parts/manifest.json';
import hardware from '../plugins/hardware/manifest.json';
import decorationMaterial from '../plugins/decoration-material/manifest.json';
import communityGroupBuy from '../plugins/community-group-buy/manifest.json';

const RAW_MANIFESTS = [
  catering,
  beauty,
  pet,
  convenienceStore,
  liquorWholesale,
  phoneAccessories,
  freshFood,
  autoParts,
  hardware,
  decorationMaterial,
  communityGroupBuy,
];

/** 已编进主包的 11 个行业模板。字段以各 manifest.json 为准，不改包结构。 */
export const BUILTIN_VERTICAL_MANIFESTS: IndustryPluginManifest[] =
  RAW_MANIFESTS.map((raw) => raw as unknown as IndustryPluginManifest);

export function builtinVerticalManifest(id: string): IndustryPluginManifest | null {
  return BUILTIN_VERTICAL_MANIFESTS.find((item) => item.id === id) ?? null;
}
