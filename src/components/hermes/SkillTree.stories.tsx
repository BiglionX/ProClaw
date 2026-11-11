/**
 * SkillTree 故事
 *
 * 展示 4 个场景:
 *  - Default:标准 8 个预设技能
 *  - WithLearnedSkills:混入 AI 学习的技能
 *  - Empty:空数据(展示空态)
 *  - ArchivedFocus:归档为主(展示默认折叠)
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SkillTree } from './SkillTree';
import { defaultFixtures } from './stories/fixtures';
import { Box } from '@mui/material';

const meta: Meta<typeof SkillTree> = {
  title: 'Hermes/SkillTree',
  component: SkillTree,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 600 }}>
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    onSelectSkill: { action: 'selectSkill' },
    defaultCollapseArchived: { control: 'boolean' },
  },
};

export default meta;

type Story = StoryObj<typeof SkillTree>;

export const Default: Story = {
  args: {
    skills: defaultFixtures.presetSkills,
  },
};

export const WithLearnedSkills: Story = {
  args: {
    skills: [
      ...defaultFixtures.presetSkills,
      ...defaultFixtures.learnedSkills,
    ],
  },
};

export const Empty: Story = {
  args: {
    skills: [],
  },
};

export const ArchivedFocus: Story = {
  args: {
    skills: [
      ...defaultFixtures.presetSkills,
      ...defaultFixtures.learnedSkills,
      // 5 个归档的技能
      ...Array.from({ length: 5 }).map((_, i) => ({
        ...defaultFixtures.presetSkills[0],
        id: `sk_archived_${i}`,
        name: `归档技能 ${i + 1}`,
        status: 'archived' as const,
        usageCount: 3,
        successCount: 1,
        failureCount: 2,
      })),
    ],
    defaultCollapseArchived: true,
  },
};

export const PendingReviewHighlight: Story = {
  args: {
    skills: [
      ...defaultFixtures.presetSkills,
      ...defaultFixtures.pendingSkills,
    ],
  },
};