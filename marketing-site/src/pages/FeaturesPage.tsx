import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageHeader from '../components/shared/PageHeader';
import CTASection from '../components/shared/CTASection';
import RouteSEO from '../components/RouteSEO';

const features = [
  {
    id: 'ai-team',
    title: 'AI 经营团队',
    subtitle: '你一个人，配了 7 个不领工资的帮手',
    description: '想要分析数据、算利润、盯库存？跟 CEO Agent 说一声，它自己安排 7 个 AI 帮手去办。你不用学任何系统操作，当老板，发指令就行了。',
    highlights: [
      'CEO Agent 总指挥：你说目标，它安排人干，干完给你汇报',
      '自动分工：一句话分配任务给不同 AI，进度随时看',
      '决策让你拍板：重要决定 AI 列出方案，你来选',
      '随时问："上个月利润多少？" 它立刻回答',
      '自动报表：不用动手，每天/每周经营报告自动生成',
      'AI 找图：告诉它商品名，自动配好图片',
    ],
  },
  {
    id: 'inventory',
    title: '进销存管理',
    subtitle: '产品库 + 采购销售 + 库存跟踪',
    description: '颜色、规格再多也不乱。从进货到销售到库存，全流程自动管。卖得好的自动提醒补货，压货的自动预警清仓。',
    highlights: [
      '产品库管理：简单模式管得少，SPU-SKU 模式管得细，按需切换',
      '供应商管理：记着每个供应商的联系方式、报价、历史进货记录',
      '采购管理：从下单到收货全程跟踪，再也不怕漏单',
      '销售管理：开单、出库、对账一条龙，客户信息自动记录',
      '库存预警：库存低了自动提醒，不怕断货压货',
      '智能补货：AI 分析历史销量，告诉你进什么货、进多少',
    ],
  },
  {
    id: 'cloud-store',
    title: '云托管商城',
    subtitle: '想开网店？跟它说一声就帮你建好',
    description: '你在桌面端管好的商品，AI 自动生成一个漂亮的网店。客户下单自动回传到你的系统里，不用手动记账。支持微信和支付宝收款。',
    highlights: [
      'AI 自动建站：告诉它你喜欢什么风格，3 秒生成',
      '网店装修：换颜色、换Logo、换图片，跟装修朋友圈一样简单',
      '商品自动同步：本地加个新品，网店自动更新',
      '微信/支付宝收款：客户直接扫码付款',
      '订单自动处理：客户下单，你这边销售单和扣库存全自动',
      '免费子域名 + 支持绑定自己的域名',
    ],
  },
  {
    id: 'agent-eco',
    title: 'Agent 生态',
    subtitle: 'Agent 市场 + 沙箱安全 + 开发者 SDK',
    description: '开放的 Agent 市场，支持第三方开发者上架 Agent，用户一键安装启用。Agent 运行在隔离沙箱中，权限可控，数据独立。装个财务 Agent 帮你记账，装个销售 Agent 帮你盯客户，跟手机上装 App 一样简单。',
    highlights: [
      '像装 App 一样装 Agent：在市场上选，一键安装',
      'Agent 市场：浏览、安装、发布 Agent，社区共建',
      '安全隔离：每个 Agent 在独立沙箱里运行，互不干扰',
      '权限可控：安装时它会告诉你需要什么权限，你同意才生效',
      '开发者也能玩：用 TypeScript 开发自己的 Agent，上架分享',
      '第三方生态：社区开发的 Agent 越来越多，功能持续扩展',
    ],
  },
  {
    id: 'collaboration',
    title: '协作与通信',
    subtitle: '团队邀请 + 设备配对 + 实时通话',
    description: '支持员工邀请与角色权限自动分配、外部伙伴邀请与自动关联。桌面端与移动端扫码配对，基于 WebRTC 的实时语音/视频通话。店主账号管全局，员工各有权限。',
    highlights: [
      '邀请员工：自动分配对应权限，仓管只能管库存，财务只能管账',
      '邀请伙伴：供应商、客户可以关联到你的系统，方便对账',
      '手机扫码连电脑：扫个码，桌面端和 App 自动配对',
      '语音视频通话：仓库和前台实时沟通，不用来回跑',
      '消息系统：联系人管理、实时消息、通话记录全有',
      '谁管什么你说了算：店主/仓管/财务/采购/销售，权限分明',
    ],
  },
  {
    id: 'install-wizard',
    title: '安装向导',
    subtitle: '3 分钟装好，不需要看任何教程',
    description: '下载后打开，CEO Agent 像朋友一样问你几个问题：装在哪？公司叫什么？然后就帮你全部配置好，直接进工作区。',
    highlights: [
      '对话式引导：像跟朋友聊天一样完成安装，不需要看说明书',
      '自动选安装位置：它自己检查磁盘空间，给你推荐最佳路径',
      '设置公司信息：告诉它公司名字，它记住你的一切',
      'AI 模式可选：想用云端 AI 还是本地模型，你说了算',
      '装完即用：所有配置自动完成，直接开始管店',
    ],
  },
  {
    id: 'security',
    title: '安全与隐私',
    subtitle: '本地加密存储 + 可选云同步',
    description: '你的所有数据默认存在你自己的电脑里，谁联网都拿不走。想上云备份？可选功能，你决定什么时候同步、同步什么。',
    highlights: [
      '默认存本地：数据在你电脑里，不联网也安全',
      '自己做主：不想上云就不上，数据 100% 你掌控',
      '云同步可选：想备份才打开，加密传输放心',
      '多重加密：银行级加密技术保护你的经营数据',
      '权限分明：员工能看到什么，你来定',
      '离线也能用：没网络照样记账、开单、查库存',
    ],
  },
  {
    id: 'quality',
    title: '测试与质量',
    subtitle: '200+ 测试用例覆盖核心功能',
    description: '采用 Vitest + Playwright + Rust 三层测试体系，覆盖前端、E2E 和后端逻辑。每个版本发布前都会跑一遍全部测试，确保质量稳定。',
    highlights: [
      '前端测试：15 个测试模块覆盖核心功能',
      'E2E 测试：9 个流程覆盖登录、产品、销售、采购全链路',
      'Rust 后端测试：权限、加密、序列化等核心逻辑',
      '测试框架：Vitest + Playwright + Rust',
      '每次发布前全量测试，有问题先修复再发布',
    ],
  },
  {
    id: 'industry-plugins',
    title: '行业插件系统',
    subtitle: '一个基础端，适配所有行业。插件按需下载。',
    description: '安装统一的 ProClaw 桌面端后，根据你的行业选择对应插件。每个插件包含专属功能模块、操作面板和 AI 经营团队，即装即用。基础进销存适用于所有行业，插件为你提供行业专属的高级功能。',
    highlights: [
      '\uD83C\uDF7D\uFE0F 餐饮版：POS收银/桌台管理/KDS厨房显示',
      '\uD83D\uDC87 美业版：预约管理/员工排班/营销活动',
      '\uD83D\uDC3E 宠物版：宠物档案/寄养管理/美容预约',
      '\u2601\uFE0F Cloud版：Token计费/云端备份/数据同步',
      '\uD83D\uDD0C 更多行业插件持续开发中...',
    ],
  },
];

const FeaturesPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <RouteSEO routeKey="features" />
      <Navbar />

      <PageHeader
        title="功能全景"
        description="一个人管店、管库存、管订单、管客户。AI 帮你记账、分析、出报表，还能一键开网店。来看看 ProClaw 到底能帮你做什么。"
      />

      {/* Feature Sections */}
      <div className="flex-grow">
        {features.map((feature, idx) => (
          <div
            key={feature.id}
            id={feature.id}
            className={`py-16 scroll-mt-20 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
          >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-start gap-8">
                {/* Number badge */}
                <div className="hidden md:flex w-12 h-12 bg-black text-white rounded-xl items-center justify-center font-bold text-lg shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{feature.title}</h2>
                    <span className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded-full">{feature.subtitle}</span>
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">{feature.description}</p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {feature.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                        </svg>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CTASection
        title="先下载用用看，两个版本都免费"
        description="3 分钟完成安装，CEO Agent 对话引导配置。不满意？卸了就完了，没有任何损失。"
        primaryButtonText="免费下载桌面端"
        primaryButtonLink="/download"
        secondaryButtonText="查看云托管方案"
        secondaryButtonLink="/pricing"
      />

      <Footer />
    </div>
  );
};

export default FeaturesPage;
