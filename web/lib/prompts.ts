import { PLATFORM_SPECS, STYLE_TEMPLATES } from "./templates";
import type { ProductInput } from "./types";

export function buildScriptSystemPrompt(): string {
  return `你是顶级的 TikTok/Facebook 短视频带货操盘手，深谙爆款UGC视频的逆向工程。你研究过数万条爆款带货视频，总结出的规律：
1. 前3秒钩子决定生死——必须制造好奇缺口、冲突或结果前置
2. 画面必须"原生"——手持感、生活场景、素人质感，拒绝广告腔
3. 节奏：每2-4秒一个镜头切换，口播密度高，无废话
4. 痛点要演出来不是说出来，效果要看得见
5. CTA要自然且紧迫（限时/限量/链接指引）
你的任务是根据商品信息和指定的爆款模板，产出可直接用于AI视频生成的完整创意方案。输出必须是合法JSON。`;
}

export function buildScriptUserPrompt(input: ProductInput, variants: number): string {
  const tpl = STYLE_TEMPLATES.find((t) => t.id === input.style)!;
  const platform = PLATFORM_SPECS[input.platform];
  const lang = input.language === "zh" ? "中文" : "英文（English）";
  return `商品信息：
- 商品名：${input.productName}
- 商品描述：${input.description}
- 核心卖点：${input.sellingPoints}
- 目标人群：${input.targetAudience}

投放平台：${platform.name}（${platform.notes}）
视频时长：${input.duration}秒，画幅 ${platform.ratio}
文案语言：${lang}

使用爆款模板：【${tpl.name}】
钩子公式参考：
${tpl.hookFormulas.map((h) => `- ${h}`).join("\n")}
分镜结构（逆向自爆款视频）：
${tpl.shotStructure.map((s) => `- ${s}`).join("\n")}
画面风格要点：${tpl.visualNotes}

请生成 ${variants} 个差异化的创意方案（不同钩子角度），输出JSON：
{"variants": [{
  "hook": "前3秒钩子台词",
  "script": "完整口播脚本（标注时间轴，如 [0-3s]...）",
  "videoPrompt": "给AI视频生成模型(Seedance 2.0)的完整提示词：用${input.duration}秒内的多镜头分镜描述（镜头1/镜头2...），包含人物动作、运镜方式、场景、光线、产品出现方式、口播内容（用引号标出人物说的台词，台词用${lang}）、音效/BGM氛围。强调UGC手持真实感。商品外观必须与参考图一致。",
  "firstFramePrompt": "给图片生成模型的首帧提示词（英文）：描述视频第一帧画面——基于参考商品图，生成符合该分镜开场的真实UGC风格场景图，9:16竖屏构图，写明 amateur smartphone photo 质感",
  "caption": "发布文案（${lang}，含emoji，制造互动）",
  "hashtags": ["5-8个该平台的高流量相关标签"]
}]}`;
}
