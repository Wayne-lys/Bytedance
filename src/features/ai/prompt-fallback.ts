import { buildGeneratedTags } from "@/features/ai/generated-tags";

type PromptFallbackInput = {
  topic: string;
  audience: string;
  platform: string;
  style: string;
  prompt: string;
  materials: string[];
};

export type PromptFallbackDraft = {
  title: string;
  body: string;
  tags: string[];
  coverSuggestion: string;
  publishAdvice: string;
};

function compactText(value: string, maxLength = 72) {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}

function numberedLines(items: string[]) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function coverSuggestionForMaterials(input: PromptFallbackInput, fallback: string) {
  if (input.materials.length === 0) {
    return fallback;
  }

  return input.materials.length > 1
    ? `优先从 ${input.materials.length} 个已选素材里选择主体清晰、留白充足的一张作为封面，其余素材作为正文配图。`
    : "优先使用已选素材中主体清晰、留白充足的一张作为封面。";
}

export function interpolatePromptTemplate(input: PromptFallbackInput) {
  return input.prompt
    .replaceAll("{{topic}}", input.topic)
    .replaceAll("{{audience}}", input.audience)
    .replaceAll("{{platform}}", input.platform)
    .replaceAll("{{style}}", input.style)
    .replaceAll("{{materials}}", input.materials.join("、") || "无");
}

function inferPromptMode(prompt: string) {
  const text = prompt.toLowerCase();

  if (/标题|headline|title/.test(text)) {
    return "headline";
  }

  if (/清单|要点|步骤|拆成|list|checklist|todo|count|5 个|五个/.test(text)) {
    return "checklist";
  }

  if (/小红书|种草|分享|测评|体验/.test(text)) {
    return "seeding";
  }

  if (/头条|信息流|推荐|密度|结构/.test(text)) {
    return "feed";
  }

  return "custom";
}

export function buildPromptFallbackDraft(
  input: PromptFallbackInput
): PromptFallbackDraft {
  const mode = inferPromptMode(input.prompt);
  const baseTags = buildGeneratedTags(input.platform, input.topic);

  if (mode === "headline") {
    const headlines = [
      `${input.topic}，城市白领可以先从这 3 个细节开始`,
      `通勤时间也能轻松补能？${input.topic}的实用做法`,
      `别再随手点单了：${input.topic}的低负担选择`,
      `${input.audience}收藏：${input.topic}的 10 分钟决策清单`,
      `把${input.topic}做具体，关键是避开这几个误区`,
      `从早高峰到午休，${input.topic}有哪些可执行选择`,
      `${input.topic}不是玄学，这些细节更容易坚持`,
      `适合${input.audience}的${input.topic}，重点看这几点`,
      `一篇说清${input.topic}：场景、方法和注意事项`,
      `${input.topic}怎么选？给忙碌上班族的直接建议`
    ];

    return {
      title: `${input.topic}：给${input.audience}的 10 个标题方向`,
      body: `可从下面 10 个标题里选一个继续扩写：\n${numberedLines(headlines)}`,
      tags: [...baseTags, "标题优化"],
      coverSuggestion: coverSuggestionForMaterials(
        input,
        "使用主体明确、文字留白充足的封面图，方便叠加标题。"
      ),
      publishAdvice: "先筛掉夸张承诺式标题，再选择信息点最明确的一版发布。"
    };
  }

  if (mode === "checklist") {
    const checklist = [
      `先确定真实场景：比如早高峰、午休前或下班路上，明确${input.topic}最容易发生在哪一刻。`,
      `把选择标准写清楚：优先看负担、便利度和能否持续，不只看一时新鲜。`,
      `准备一个默认方案：给${input.audience}留一个不用反复思考也能执行的选项。`,
      `避开夸张承诺：只写可验证的体验、步骤和注意事项。`,
      `结尾留一个互动问题：让读者分享自己的做法，方便后续评论区延展。`
    ];

    return {
      title: `${input.topic}：给${input.audience}的可执行清单`,
      body: `${input.audience}可以按这个清单执行：\n${numberedLines(checklist)}`,
      tags: [...baseTags, "内容清单"],
      coverSuggestion: coverSuggestionForMaterials(
        input,
        "使用干净的列表感封面，突出步骤和要点。"
      ),
      publishAdvice: "适合在正文开头直接给出清单数量，提升完读率。"
    };
  }

  if (mode === "seeding") {
    return {
      title: `${input.topic}：一次真实体验后的分享`,
      body: `最近我把${input.topic}放到真实通勤场景里试了一次，最大的感受是：它不需要复杂准备，关键是提前想好一个稳定选择。\n\n对${input.audience}来说，真正有用的不是追求“更高级”，而是减少临时决策。比如在固定时间、固定预算和固定口味里找到一个不容易踩雷的方案，就更容易坚持。\n\n如果你也想尝试，可以先从一次通勤开始记录：什么时候最需要补能、哪种选择最舒服、有没有带来额外负担。这样比盲目跟风更可靠。`,
      tags: [...baseTags, "真实分享"],
      coverSuggestion: coverSuggestionForMaterials(
        input,
        "使用生活化、低摆拍感的封面图。"
      ),
      publishAdvice: "避免绝对化承诺，结尾用一个体验问题引导评论。"
    };
  }

  if (mode === "feed") {
    return {
      title: `${input.topic}：给${input.audience}的 3 个具体建议`,
      body: `${input.topic}最常见的场景，是忙碌时想快速做出一个不出错的选择。对${input.audience}来说，重点不是准备很多方案，而是把判断标准变简单。\n\n第一，先固定一个默认选择。默认选择能减少临时纠结，也更容易观察效果。\n\n第二，把“舒服”和“可持续”放在前面。短期看起来更强的方案，如果执行成本高，往往坚持不了。\n\n第三，给自己留一个复盘点。比如一周后看精神状态、花费和便利度，再决定要不要调整。`,
      tags: [...baseTags, "信息流"],
      coverSuggestion: coverSuggestionForMaterials(
        input,
        "使用明亮、干净、主体明确的信息流封面图。"
      ),
      publishAdvice: "适合在午休或晚间高活跃时段发布，并先过合规审核。"
    };
  }

  return {
    title: `${input.topic}：按自定义模板生成的内容草稿`,
    body: `${input.topic}这类内容适合先给出一个具体场景，再把建议拆成可执行步骤。面向${input.audience}时，表达要保持${input.style}，不要只停留在概念层面。\n\n可以先写问题：什么时候会遇到这个选择？再写方法：具体怎么做？最后写提醒：哪些地方容易被忽略？这样读者能直接判断自己是否适用。`,
    tags: [...baseTags, "自定义模板"],
    coverSuggestion: coverSuggestionForMaterials(
      input,
      "使用与选题直接相关、主体清晰的封面图。"
    ),
    publishAdvice: "自定义模板建议先检查变量是否完整，再进入审核和发布。"
  };
}
