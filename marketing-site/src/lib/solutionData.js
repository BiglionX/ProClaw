"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solutionData = void 0;
exports.solutionData = {
    catering: {
        slug: 'catering',
        name: '餐饮行业方案',
        icon: '\uD83C\uDF7D\uFE0F',
        heroTitle: '餐饮管理系统 — 从手工记账到 AI 管店',
        heroDescription: 'POS 收银、桌台管理、KDS 厨房显示、智能菜单优化。一个软件，搞定前厅后厨所有事。',
        seoTitle: '餐饮经营管理系统 - ProClaw 行业方案',
        seoDescription: 'ProClaw 餐饮行业方案：POS收银、桌台管理、KDS厨房显示、智能菜单优化。AI驱动的餐厅管理系统，免费下载使用。',
        seoKeywords: '餐饮管理系统,餐厅POS软件,厨房显示系统,KDS,桌台管理,餐饮软件',
        heroGradient: 'from-red-600 via-orange-500 to-yellow-500',
        painPoints: [
            {
                problem: '手写点单，传菜靠吼，漏单错单是家常便饭。高峰期前台后厨一团乱。',
                solution: 'POS 收银 + KDS 厨房显示系统，下单自动传到后厨屏幕，按顺序出菜，再也不会漏单。',
            },
            {
                problem: '进货靠经验，月底算不清赚了多少。库存积压或缺货总是后知后觉。',
                solution: 'AI 智能进销存，自动分析销量趋势，低库存自动预警并推荐补货量。',
            },
            {
                problem: '想做外卖、搞团购、发优惠券，但没有工具支撑，客户回头率低。',
                solution: '云商城一键生成 + 营销插件，自动对接外卖平台，AI 帮你策划营销活动。',
            },
        ],
        features: [
            { title: 'POS 收银', desc: '触屏点单、扫码支付、多支付方式，收银台高效运作。', icon: '\uD83D\uDCB3' },
            { title: '桌台管理', desc: '可视化桌台布局，开台/转台/并台/清台，桌况一目了然。', icon: '\uD83C\uDF7D\uFE0F' },
            { title: 'KDS 厨房显示', desc: '订单自动传后厨屏幕，按优先级排序，出品即清屏。', icon: '\uD83D\uDC68\u200D\uD83C\uDF73' },
            { title: '菜单管理', desc: '菜品分类、规格定价、图片配图，AI 还能帮你优化菜单结构。', icon: '\uD83D\uDCCB' },
            { title: '外卖对接', desc: '自动对接主流外卖平台，订单自动同步进系统。', icon: '\uD83D\uDCF1' },
            { title: '会员营销', desc: '会员充值、积分、优惠券，AI 分析沉睡客户自动推送。', icon: '\uD83C\uDF81' },
        ],
        aiAgents: [
            { name: '餐饮助手', desc: '回答经营问题，分析销售数据，给出优化建议。', agentId: 'ma_catering_assistant' },
            { name: 'KDS 调度', desc: '智能调度后厨出菜顺序，平衡各工位负载。', agentId: 'ma_catering_kds' },
            { name: '菜单优化', desc: '分析菜品销售数据，推荐高利润菜品和菜单结构调整。', agentId: 'ma_catering_menu' },
        ],
        pricing: [
            { planName: '基础桌面端', price: '免费', desc: '含基础进销存 + 标准 AI 团队，下载即用。' },
            { planName: '餐饮插件', price: '免费', desc: 'POS/KDS/桌台管理/菜单管理，安装即激活。' },
            { planName: '云商城 + AI 增强', price: '按 Token 计费', desc: '外卖网站生成、高级 AI 分析、云端备份。' },
        ],
        ctaText: '免费下载桌面端，安装后选择餐饮行业即可激活全部功能',
    },
    beauty: {
        slug: 'beauty',
        name: '美业行业方案',
        icon: '\uD83D\uDC87',
        heroTitle: '美业管理系统 — 从预约混乱到智能排班',
        heroDescription: '预约管理、服务项目、员工排班、营销活动。让每一位客人都感受到专业和贴心。',
        seoTitle: '美业预约管理软件 - ProClaw 行业方案',
        seoDescription: 'ProClaw 美业行业方案：预约管理、服务项目设置、员工排班、会员营销。AI驱动的美容院/美发店管理系统。',
        seoKeywords: '美业管理系统,美容院预约软件,美发店管理,员工排班,会员营销,美业软件',
        heroGradient: 'from-pink-500 via-rose-500 to-purple-500',
        painPoints: [
            {
                problem: '客户预约靠电话微信，经常撞时间。临时取消或改期，排班全乱套。',
                solution: '在线预约系统 + 智能排班，客户自助选时段，冲突自动提醒，取消自动释放。',
            },
            {
                problem: '会员充值记录混乱，谁充了多少、还剩多少查不清。员工提成每月算半天。',
                solution: '会员管理系统 + 自动提成计算，每一笔消费和充值清清楚楚，月底一键出报表。',
            },
            {
                problem: '想搞营销活动吸引新客、激活老客，但不知道从哪下手，效果也看不出来。',
                solution: 'AI 营销助手分析客群画像，自动生成营销方案，推送优惠券给沉睡客户。',
            },
        ],
        features: [
            { title: '预约管理', desc: '在线预约、时段管理、自动提醒，客户微信即可自助预约。', icon: '\uD83D\uDCC5' },
            { title: '服务项目', desc: '服务目录、时长设定、定价管理，支持套餐和单项服务。', icon: '\uD83D\uDC86' },
            { title: '员工排班', desc: '技师排班、忙闲时段可视化，避免撞单和空档。', icon: '\uD83D\uDC65' },
            { title: '会员管理', desc: '充值/消费记录、积分体系、会员等级，客户关系一手掌握。', icon: '\uD83D\uDC8E' },
            { title: '营销活动', desc: '优惠券、拼团、秒杀，AI 帮你策划和推送。', icon: '\uD83C\uDFAF' },
            { title: '数据分析', desc: '营收分析、客流趋势、热门项目排行，经营决策有数据支撑。', icon: '\uD83D\uDCCA' },
        ],
        aiAgents: [
            { name: '美业助手', desc: '回答经营问题，分析营收数据，给出运营建议。', agentId: 'ma_beauty_assistant' },
            { name: '智能排班', desc: '根据客流趋势和历史数据，自动优化员工排班方案。', agentId: 'ma_beauty_scheduler' },
            { name: '营销策划', desc: '分析客群画像，自动生成精准营销方案和优惠策略。', agentId: 'ma_beauty_marketing' },
        ],
        pricing: [
            { planName: '基础桌面端', price: '免费', desc: '含基础进销存 + 标准 AI 团队，下载即用。' },
            { planName: '美业插件', price: '免费', desc: '预约/排班/服务管理/会员系统，安装即激活。' },
            { planName: '云商城 + AI 增强', price: '按 Token 计费', desc: '在线预约网站、AI 营销分析、云端备份。' },
        ],
        ctaText: '免费下载桌面端，安装后选择美业行业即可激活全部功能',
    },
    pet: {
        slug: 'pet',
        name: '宠物行业方案',
        icon: '\uD83D\uDC3E',
        heroTitle: '宠物店管理系统 — 从手写本子到智能管店',
        heroDescription: '宠物档案、寄养管理、美容预约、商品进销存。每一只毛孩子都值得被认真对待。',
        seoTitle: '宠物店管理系统 - ProClaw 行业方案',
        seoDescription: 'ProClaw 宠物行业方案：宠物档案管理、寄养预约、美容服务、商品进销存。AI驱动的宠物店管理系统。',
        seoKeywords: '宠物店管理系统,宠物寄养软件,宠物美容预约,宠物档案管理,宠物店进销存',
        heroGradient: 'from-amber-500 via-orange-500 to-yellow-600',
        painPoints: [
            {
                problem: '宠物寄养登记靠手写，谁家的毛孩子、什么时间接、有什么特殊要求，经常记错。',
                solution: '寄养管理系统，每只宠物独立档案，入住/离店流程化，特殊需求重点标注。',
            },
            {
                problem: '商品种类多（食品/用品/药品），保质期管理复杂，过期商品经常没发现。',
                solution: '智能进销存 + 有效期预警，临期商品自动提醒促销或退货处理。',
            },
            {
                problem: '美容预约和寄养服务混在一起，排期混乱，客户体验差。',
                solution: '统一预约系统，寄养和美容分开排期但共享客户档案，一站式管理。',
            },
        ],
        features: [
            { title: '宠物档案', desc: '每只宠物独立档案，品种/年龄/健康状况/主人信息一目了然。', icon: '\uD83D\uDC3E' },
            { title: '寄养管理', desc: '入住登记/离店结算/期间记录，流程化管理宠物寄养。', icon: '\uD83C\uDFE0' },
            { title: '美容预约', desc: '美容服务排期、预约管理，与寄养服务共享客户档案。', icon: '\uD83D\uDC87\u200D\u2640\uFE0F' },
            { title: '商品进销存', desc: '食品/用品/药品分类管理，有效期自动预警。', icon: '\uD83D\uDCE6' },
            { title: '会员充值', desc: '会员卡充值、消费记录、余额查询，绑定宠物档案。', icon: '\uD83D\uDCB3' },
            { title: '健康提醒', desc: '疫苗/驱虫/体检到期提醒，让客户感受到专业关怀。', icon: '\uD83C\uDFE5' },
        ],
        aiAgents: [
            { name: '宠物助手', desc: '回答经营问题，分析营收数据，优化服务项目组合。', agentId: 'ma_pet_assistant' },
            { name: '寄养调度', desc: '智能管理寄养宠物排期，优化笼位利用率。', agentId: 'ma_pet_boarding' },
            { name: '健康管理', desc: '记录宠物体检和疫苗记录，自动提醒主人到期时间。', agentId: 'ma_pet_health' },
        ],
        pricing: [
            { planName: '基础桌面端', price: '免费', desc: '含基础进销存 + 标准 AI 团队，下载即用。' },
            { planName: '宠物插件', price: '免费', desc: '宠物档案/寄养管理/美容预约，安装即激活。' },
            { planName: '云商城 + AI 增强', price: '按 Token 计费', desc: '在线预约网站、AI 健康管理、云端备份。' },
        ],
        ctaText: '免费下载桌面端，安装后选择宠物行业即可激活全部功能',
    },
    cloud: {
        slug: 'cloud',
        name: 'Cloud 托管方案',
        icon: '\u2601\uFE0F',
        heroTitle: 'Cloud 托管方案 — 数据上云，经营无忧',
        heroDescription: 'Token 计费、云端备份、云商城托管。让数据安全上云，随时随地管理你的店铺。',
        seoTitle: 'Cloud 云托管方案 - ProClaw 行业方案',
        seoDescription: 'ProClaw Cloud 托管方案：Token计费、云端备份、数据同步、云商城托管。灵活的云服务方案，按需付费。',
        seoKeywords: '云进销存,Token计费,数据云备份,云商城托管,云端同步,云服务',
        heroGradient: 'from-sky-500 via-cyan-500 to-teal-500',
        painPoints: [
            {
                problem: '电脑坏了数据全丢？没有备份方案，经营数据安全毫无保障。',
                solution: '自动云端备份，数据加密传输存储。即使电脑损坏，换台新设备登录即可恢复全部数据。',
            },
            {
                problem: '想开网店但不懂技术，搭建网站太复杂，维护成本高。',
                solution: 'AI 自动建站，3 秒生成漂亮的网店。商品自动同步，订单自动回传，无需技术背景。',
            },
            {
                problem: 'AI 功能很好用但不知道要花多少钱，担心用超了账单爆炸。',
                solution: '透明 Token 计费，用量实时可见。可设置每月预算上限，到达自动暂停，绝不超支。',
            },
        ],
        features: [
            { title: 'Token 计费', desc: '透明用量、实时监控、预算上限设置，完全掌控AI花费。', icon: '\uD83D\uDCB0' },
            { title: '云端备份', desc: '经营数据自动加密备份到云端，换设备登录即可恢复。', icon: '\uD83D\uDD04' },
            { title: '云商城托管', desc: 'AI 自动生成电商网站，商品同步、订单自动处理。', icon: '\uD83C\uDF10' },
            { title: '数据同步', desc: '桌面端和移动端数据实时同步，随时随地管店。', icon: '\uD83D\uDCF2' },
            { title: '安全管理', desc: '加密传输、权限控制、操作审计，数据安全多重保障。', icon: '\uD83D\uDD12' },
            { title: '弹性扩展', desc: '按需使用，不绑定长期合约，随时升级或降级。', icon: '\uD83D\uDCC8' },
        ],
        aiAgents: [
            { name: '备份管家', desc: '自动备份策略管理，监控备份状态和数据完整性。', agentId: 'ma_cloud_backup' },
            { name: '计费监控', desc: 'Token 用量实时追踪，费用预测和预算预警。', agentId: 'ma_cloud_billing' },
            { name: '运维助手', desc: '监控云服务健康状态，自动处理常见运维问题。', agentId: 'ma_cloud_ops' },
        ],
        pricing: [
            { planName: '基础桌面端', price: '免费', desc: '含本地进销存 + 标准 AI 团队，完全免费使用。' },
            { planName: 'Cloud 插件', price: '免费', desc: '云端备份/数据同步/计费监控，安装即激活。' },
            { planName: '云商城 + Token', price: '按量付费', desc: '云商城生成和托管、高级 AI 调用按 Token 计费。' },
        ],
        ctaText: '免费下载桌面端，安装后激活 Cloud 插件即可享受云服务',
    },
};
