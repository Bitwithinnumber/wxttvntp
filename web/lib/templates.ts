import type { Platform, VideoStyle } from "./types";

/**
 * 逆向自 TikTok / Facebook 高转化带货视频的结构模板库。
 * 每个模板编码：钩子公式、分镜画面结构（shot-by-shot）、口播节奏、CTA 套路。
 */

export interface StyleTemplate {
  id: VideoStyle;
  name: string;
  nameEn: string;
  desc: string;
  hookFormulas: string[];
  shotStructure: string[];
  visualNotes: string;
}

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: "ugc_testimonial",
    name: "真人口播种草（UGC Testimonial）",
    nameEn: "UGC Testimonial",
    desc: "素人对镜头第一人称分享使用体验，TikTok 最高频带货形态",
    hookFormulas: [
      '"我本来以为XX是智商税，直到…"（怀疑反转）',
      '"用了X天，效果是这样的"（结果前置）',
      '"刷到这个视频的人有福了"（算法梗）',
      '"别再买XX了，先看完这条"（警告式）',
    ],
    shotStructure: [
      "0-3s 手持自拍视角，人物近景对镜头说出钩子，表情夸张/惊讶，背景是卧室/客厅等生活场景",
      "3-8s 切到痛点画面：人物皱眉演示遇到的问题，快速跳剪2-3个失败瞬间",
      "8-18s 产品登场：手持产品凑近镜头展示细节，边用边讲卖点，穿插使用特写（开盖/按压/上手）",
      "18-25s 效果展示：before/after 对比或满意表情，点头微笑",
      "25-30s CTA：指向屏幕下方/购物车，催促语气收尾",
    ],
    visualNotes:
      "手持轻微晃动、自然光、生活化背景、人物视线对镜头，画面带轻微噪点更显真实；竖屏9:16",
  },
  {
    id: "unboxing",
    name: "开箱测评（Unboxing）",
    nameEn: "Unboxing & First Impression",
    desc: "拆包裹+第一反应，利用好奇心与期待感",
    hookFormulas: [
      '"我又来开箱了，这次是全网爆火的XX"',
      '"花了XX块买的，到底值不值？"（价格悬念）',
      '"包装就赢了，里面更夸张"',
    ],
    shotStructure: [
      "0-3s 俯拍桌面，双手拿着快递盒晃动，配钩子口播",
      "3-10s 拆箱过程特写：撕开包装、拿出产品的瞬间，慢动作+音效",
      "10-20s 产品360°展示：转动产品、特写材质/细节/配件一字排开",
      "20-28s 上手试用第一反应：惊讶表情+即时点评",
      "28-32s CTA：把产品举到镜头前，报价格+引导下单",
    ],
    visualNotes: "俯拍+特写为主，桌面整洁、暖光，拆箱声音(ASMR感)很关键；竖屏9:16",
  },
  {
    id: "problem_solution",
    name: "痛点-解决方案（Problem→Solution）",
    nameEn: "Problem / Solution",
    desc: "Facebook 信息流广告最强结构，先放大痛点再给解药",
    hookFormulas: [
      '"还在为XX烦恼吗？"（直击痛点）',
      '"如果你也有XX问题，停下来看30秒"',
      '"我受够了XX，直到发现这个"',
    ],
    shotStructure: [
      "0-3s 痛点场景再现：人物被问题困扰的戏剧化画面（揉肩/叹气/手忙脚乱）",
      "3-10s 放大痛点：连续2-3个失败尝试的快剪，配吐槽口播",
      "10-22s 产品解决过程：清晰演示产品如何一步步解决问题，前后对照",
      "22-28s 结果+信任背书：满意微笑、强调销量/好评",
      "28-32s CTA：限时优惠+行动指令",
    ],
    visualNotes:
      "前段冷色调压抑、产品出现后转暖色调明亮，对比感强；Facebook 可用 1:1/4:5，TikTok 用 9:16",
  },
  {
    id: "before_after",
    name: "前后对比（Before/After）",
    nameEn: "Before / After Transformation",
    desc: "视觉冲击最强，美妆/清洁/家居类目转化之王",
    hookFormulas: [
      '"看到结果你不会相信这是同一个XX"',
      '"3秒后见证奇迹"',
      '"左边是用之前，右边是用之后"',
    ],
    shotStructure: [
      "0-3s 直接甩出 before 惨状特写，配震惊口播",
      "3-8s 产品快速登场，简短介绍核心卖点",
      "8-20s 使用过程加速剪辑/延时摄影，关键步骤特写",
      "20-28s after 效果大特写，缓慢运镜展示细节，配满足感叹",
      "28-32s 并排对比画面+CTA",
    ],
    visualNotes: "before 画面故意暗淡杂乱，after 明亮干净；转场用擦除/快切；竖屏9:16",
  },
  {
    id: "lifestyle",
    name: "生活方式植入（Lifestyle Vlog）",
    nameEn: "Lifestyle / Day-in-life",
    desc: "软广形态，把产品织入日常 vlog，Facebook 中老年与 TikTok 年轻人通吃",
    hookFormulas: [
      '"和我过一天，顺便看看我最近的心头好"',
      '"早上6点的第一件事是…"（routine 钩子）',
      '"自从有了它，我的生活质量提升了200%"',
    ],
    shotStructure: [
      "0-3s 生活场景定场镜头（清晨窗边/厨房/通勤），口播钩子",
      "3-12s 日常活动蒙太奇，产品自然出现在2-3个生活片段中",
      "12-22s 聚焦产品使用瞬间：特写+一句话点出它解决了什么",
      "22-28s 人物享受成果的惬意画面（喝咖啡微笑/瘫沙发）",
      "28-32s 轻CTA：'链接放这了，懂的都懂'",
    ],
    visualNotes: "电影感调色、自然光、慢节奏运镜，背景音乐轻快；9:16 或 4:5",
  },
  {
    id: "asmr_showcase",
    name: "沉浸式产品展示（ASMR/质感流）",
    nameEn: "ASMR Product Showcase",
    desc: "无口播纯质感，靠画面与音效让人种草，适合高颜值产品",
    hookFormulas: [
      "开场即高质感特写慢动作（无文案钩子，靠画面）",
      "字幕钩子：'这个质感我能看一百遍'",
    ],
    shotStructure: [
      "0-4s 产品微距特写慢动作：表面纹理/光泽流动",
      "4-12s 多角度运镜：环绕、推近、滑轨平移，搭配开关/按压/倾倒等交互特写",
      "12-22s 使用场景美学化呈现：手部优雅操作产品，背景虚化",
      "22-28s 产品全貌定格+品牌露出",
      "28-32s 字幕CTA+购物车指引",
    ],
    visualNotes:
      "微距+浅景深、丝滑慢动作、强调材质音效（咔哒/沙沙/水声），灯光打出高光边缘；9:16",
  },
];

export const PLATFORM_SPECS: Record<Platform, { name: string; ratio: string; notes: string }> = {
  tiktok: {
    name: "TikTok",
    ratio: "9:16",
    notes:
      "节奏快、前3秒必须有强钩子，口播密度高，字幕大而跳动，原生UGC感（手持/生活场景），结尾引导点购物车",
  },
  facebook: {
    name: "Facebook",
    ratio: "9:16",
    notes:
      "受众年龄偏大、容忍稍慢节奏，痛点共鸣型更有效，需假设静音播放（画面自解释+大字幕），强调信任背书与优惠，CTA明确（Shop Now）",
  },
};
