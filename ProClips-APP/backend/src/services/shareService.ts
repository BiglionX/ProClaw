/**
 * 业务服务层：分享文案 + 海报 URL
 * V1：根据商家档案 + 视频元数据生成文案
 */
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import type { IncentivePlan } from '../types/index.js';

export interface ShareInfo {
  title: string;
  text: string;
  hashtags: string[];
  posterUrl: string;
  shortLink: string;
}

export async function buildShareInfo(videoId: string, merchantId: string): Promise<ShareInfo | null> {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT v.id, v.title, v.duration, v.view_count, v.incentive_json,
              p.display_name, p.industry, p.region
       FROM video_final_products v
       LEFT JOIN video_merchant_profiles p ON p.merchant_id = v.merchant_id
       WHERE v.id = ? AND v.merchant_id = ?`
    )
    .get(videoId, merchantId) as
    | {
        id: string;
        title: string;
        duration: string;
        view_count: number;
        incentive_json: string | null;
        display_name: string | null;
        industry: string | null;
        region: string | null;
      }
    | undefined;

  if (!row) return null;

  const hashtags = ['ProClips', '本地推荐', row.industry ?? '精选好物'];
  if (row.region) hashtags.push(`#${row.region}同城`);

  const incentive = row.incentive_json ? (JSON.parse(row.incentive_json) as IncentivePlan) : undefined;
  const incentiveHint = incentive?.cps
    ? `🎁 达成分享 CPS ${Math.round(incentive.cps.rate * 100)}% 奖励`
    : '';

  const text =
    `🔥 ${row.display_name ?? '精选商家'} 诚意推荐：${row.title}\n` +
    `时长 ${row.duration} · 已有 ${row.view_count} 次播放\n` +
    (incentiveHint ? `${incentiveHint}\n` : '') +
    `\n${hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`;

  return {
    title: row.title,
    text,
    hashtags,
    posterUrl: `${config.PUBLIC_BASE_URL}/static/results/${row.id}/poster.png`, // V1 占位
    shortLink: `${config.PUBLIC_BASE_URL}/v/${row.id}`,
  };
}
