import { z } from "zod";

export const auditRuleSchema = z.object({
  category: z.string().min(1, "请输入规则类别"),
  description: z.string().min(6, "规则说明过短"),
  riskLevel: z.enum(["low", "medium", "high"], {
    errorMap: () => ({ message: "请选择有效风险等级" })
  }),
  pattern: z.string().min(1, "请输入识别模式"),
  action: z.enum(["allow", "warn", "review", "rewrite", "block"], {
    errorMap: () => ({ message: "请选择有效处理策略" })
  })
});
