import { z } from "zod";

export const promptTemplateSchema = z.object({
  name: z.string().min(1, "请输入模板名称"),
  scenario: z.string().min(1, "请输入场景"),
  content: z.string().min(8, "Prompt 内容过短"),
  variables: z.string().min(1, "请输入变量")
});
