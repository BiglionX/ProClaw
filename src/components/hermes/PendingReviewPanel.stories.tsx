/**
 * PendingReviewPanel 故事
 *
 * 3 个场景:
 *  - Default:2 个待审核技能
 *  - ManyCards:6 个待审核技能(展示网格)
 *  - Empty:无待审核(展示空态)
 */

import type { Meta, StoryObj } from '@storybook/react';
import { PendingReviewPanel } from './PendingReviewPanel';
import { FIXTURE_PENDING_SKILLS, defaultFixtures } from './stories/fixtures';

const meta: Meta<typeof PendingReviewPanel> = {
  title: 'Hermes/PendingReviewPanel',
  component: PendingReviewPanel,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof PendingReviewPanel>;

export const Default: Story = {};

export const ManyCards: Story = {
  parameters: {
    hermesOverride: {
      pendingSkills: Array.from({ length: 6 }).map((_, i) => ({
        ...FIXTURE_PENDING_SKILLS[i % FIXTURE_PENDING_SKILLS.length],
        id: `${FIXTURE_PENDING_SKILLS[i % FIXTURE_PENDING_SKILLS.length].id}_${i}`,
        name: `${FIXTURE_PENDING_SKILLS[i % FIXTURE_PENDING_SKILLS.length].name} ${i + 1}`,
      })),
    },
  },
};

export const Empty: Story = {};