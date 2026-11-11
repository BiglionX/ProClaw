/**
 * SkillEvolveLog 故事
 *
 * 3 个场景:
 *  - Mixed:8 条混合 action 的日志(默认)
 *  - Filtered:仅 create / optimize
 *  - Empty:无日志(空态)
 */

import type { Meta, StoryObj } from '@storybook/react';
import { SkillEvolveLog } from './SkillEvolveLog';
import { defaultFixtures } from './stories/fixtures';
import { Box } from '@mui/material';

const meta: Meta<typeof SkillEvolveLog> = {
  title: 'Hermes/SkillEvolveLog',
  component: SkillEvolveLog,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Box sx={{ maxWidth: 700 }}>
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    limit: { control: { type: 'number', min: 1, max: 50 } },
    autoRefreshMs: { control: { type: 'number', min: 0, max: 60_000, step: 1000 } },
    filterActions: { control: 'multi-select', options: ['create', 'optimize', 'merge', 'noop', 'skip'] },
  },
};

export default meta;

type Story = StoryObj<typeof SkillEvolveLog>;

export const Mixed: Story = {
  args: {
    limit: 20,
  },
};

export const FilteredCreateOptimize: Story = {
  args: {
    limit: 20,
    filterActions: ['create', 'optimize'],
  },
};

export const FilteredFailures: Story = {
  args: {
    limit: 20,
    filterActions: ['noop', 'skip'],
  },
};

export const Empty: Story = {
  args: {
    limit: 50,
  },
};