/**
 * MoAResultPanel 故事
 *
 * 2 个场景:
 *  - Success:aggregator 成功综合(完整数据)
 *  - Fallback:降级为单模型直连
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MoAResultPanel } from './MoAResultPanel';

const meta: Meta<typeof MoAResultPanel> = {
  title: 'Hermes/MoAResultPanel',
  component: MoAResultPanel,
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof MoAResultPanel>;

export const Success: Story = {
  args: {
    useDemo: true,
  },
};

export const WithoutDemo: Story = {
  args: {
    useDemo: false,
  },
};