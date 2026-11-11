/**
 * SkillDetailDrawer 故事
 *
 * 3 个场景:
 *  - ActivePreset:已激活预设技能
 *  - PendingReview:待审核技能(显示通过/拒绝按钮)
 *  - OptimizedWithStats:有成功率的优化版技能
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SkillDetailDrawer } from './SkillDetailDrawer';
import { defaultFixtures } from './stories/fixtures';

const meta: Meta<typeof SkillDetailDrawer> = {
  title: 'Hermes/SkillDetailDrawer',
  component: SkillDetailDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    onClose: { action: 'close' },
    onChanged: { action: 'changed' },
  },
};

export default meta;

type Story = StoryObj<typeof SkillDetailDrawer>;

export const ActivePreset: Story = {
  args: {
    skill: defaultFixtures.presetSkills[0],
    open: true,
  },
};

export const PendingReview: Story = {
  args: {
    skill: defaultFixtures.pendingSkills[0],
    open: true,
  },
};

export const OptimizedWithStats: Story = {
  args: {
    skill: defaultFixtures.learnedSkills[1], // 流失客户召回,80% 成功率
    open: true,
  },
};

export const Closed: Story = {
  args: {
    skill: null,
    open: false,
  },
};