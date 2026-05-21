import { reviewContentWithRules } from "@/features/moderation/rules";
import { scoreQuality } from "@/features/quality/quality-service";

export function reviewAndScoreContent(input: {
  title: string;
  body: string;
  tags: string[];
  platform: string;
}) {
  const moderation = reviewContentWithRules(`${input.title}\n${input.body}\n${input.tags.join(",")}`);
  const quality = scoreQuality(input);

  return {
    moderation,
    quality
  };
}

export function rewriteCompliantContent(content: string) {
  return content
    .replace(/下注|博彩|赌博|稳赚/g, "理性规划")
    .replace(/毒品|冰毒|大麻|违禁药/g, "健康风险")
    .replace(/加微信|私聊购买|扫码进群/g, "查看官方渠道")
    .replace(/手机号|住址|身份证|银行卡/g, "隐私信息");
}
