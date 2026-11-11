/**
 * HermesSkillsPage 主页面故事
 *
 * 3 个场景:
 *  - Default:完整页面(总览 Tab)
 *  - SkillsTab:技能库 Tab(展示 SkillTree + 检索测试)
 *  - MoATab:MoA 演示 Tab
 */

import type { Meta, StoryObj } from '@storybook/react';
import HermesSkillsPage from './HermesSkillsPage';

const meta: Meta<typeof HermesSkillsPage> = {
  title: 'Hermes/Page',
  component: HermesSkillsPage,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof HermesSkillsPage>;

export const Default: Story = {};

export const WithCustomTheme: Story = {
  decorators: [
    (Story) => (
      <div style={{ background: '#fafafa', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};