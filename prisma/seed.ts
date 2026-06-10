import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo123456", 10);

  await prisma.postComment.deleteMany();
  await prisma.externalDistribution.deleteMany();
  await prisma.rankingMetric.deleteMany();
  await prisma.qualityScore.deleteMany();
  await prisma.moderationResult.deleteMany();
  await prisma.post.deleteMany();
  await prisma.draft.deleteMany();
  await prisma.material.deleteMany();
  await prisma.promptTemplate.deleteMany();
  await prisma.auditRule.deleteMany();
  await prisma.evaluationCase.deleteMany();
  await prisma.emailCode.deleteMany();
  await prisma.phoneCode.deleteMany();

  const demoUser = await prisma.user.upsert({
    where: { email: "creator@example.com" },
    update: {
      phone: "13800000000",
      passwordHash,
      name: "训练营创作者",
      role: "creator"
    },
    create: {
      email: "creator@example.com",
      phone: "13800000000",
      passwordHash,
      name: "训练营创作者",
      role: "creator"
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {
      passwordHash,
      name: "演示管理员",
      role: "admin"
    },
    create: {
      email: "admin@example.com",
      passwordHash,
      name: "演示管理员",
      role: "admin"
    }
  });

  await prisma.promptTemplate.createMany({
    data: [
      {
        ownerId: demoUser.id,
        name: "种草短图文",
        scenario: "种草",
        variables: "topic,audience,style,materials",
        content: "围绕 {{topic}} 为 {{audience}} 写一篇可信、具体、适合信息流的种草短图文。"
      },
      {
        ownerId: demoUser.id,
        name: "小红书风格",
        scenario: "社交内容",
        variables: "topic,audience,style",
        content: "用自然分享口吻生成标题、正文和标签，避免夸大宣传。"
      },
      {
        ownerId: demoUser.id,
        name: "头条信息流",
        scenario: "头条",
        variables: "topic,audience,platform",
        content: "生成信息密度高、结构清晰、适合头条信息流推荐的图文内容。"
      },
      {
        ownerId: demoUser.id,
        name: "清单体",
        scenario: "清单",
        variables: "topic,count",
        content: "把 {{topic}} 拆成可执行清单，每一点给出简短理由。"
      }
    ]
  });

  await prisma.auditRule.createMany({
    data: [
      {
        category: "涉黄",
        description: "识别色情、擦边和低俗性暗示内容",
        riskLevel: "high",
        pattern: "色情|裸聊|约炮",
        action: "block"
      },
      {
        category: "涉赌",
        description: "识别赌博引流、下注和博彩内容",
        riskLevel: "high",
        pattern: "赌博|博彩|下注|稳赚",
        action: "block"
      },
      {
        category: "涉毒",
        description: "识别毒品、违禁药物和交易暗语",
        riskLevel: "high",
        pattern: "毒品|冰毒|大麻|违禁药|海洛因|摇头丸|K粉|麻古|吸\\s*毒|吸食毒品|嗑\\s*药|贩\\s*毒|制\\s*毒|买\\s*毒|卖\\s*毒",
        action: "block"
      },
      {
        category: "敏感信息",
        description: "识别身份证、手机号等隐私泄露风险",
        riskLevel: "medium",
        pattern: "身份证|银行卡|住址|手机号",
        action: "review"
      },
      {
        category: "广告导流",
        description: "识别外部联系方式和强导流话术",
        riskLevel: "medium",
        pattern: "加微信|私聊购买|扫码进群",
        action: "rewrite"
      },
      {
        category: "低俗内容",
        description: "识别低俗标题党和攻击性表达",
        riskLevel: "low",
        pattern: "震惊|跪求|喷子|傻眼",
        action: "warn"
      }
    ]
  });

  await prisma.evaluationCase.createMany({
    data: [
      {
        title: "安全种草内容",
        content: "周末在家做低糖酸奶碗，搭配蓝莓和燕麦，口感清爽。",
        expectedRisk: "none",
        expectedLevel: "safe",
        matched: true
      },
      {
        title: "广告导流样例",
        content: "想要同款资料可以加微信私聊购买。",
        expectedRisk: "广告导流",
        expectedLevel: "medium",
        matched: true
      },
      {
        title: "涉赌高危样例",
        content: "这个下注方法稳赚不赔，今晚就能回本。",
        expectedRisk: "涉赌",
        expectedLevel: "high",
        matched: true
      },
      {
        title: "隐私泄露样例",
        content: "这里直接贴出用户手机号和详细住址方便联系。",
        expectedRisk: "敏感信息",
        expectedLevel: "medium",
        matched: true
      },
      {
        title: "涉毒高危样例",
        content: "这类违禁药来源隐蔽，可以私下交易。",
        expectedRisk: "涉毒",
        expectedLevel: "high",
        matched: true
      }
    ]
  });

  await prisma.material.createMany({
    data: [
      {
        ownerId: demoUser.id,
        name: "城市咖啡店封面",
        type: "image",
        url: "/demo-materials/cafe-cover.svg",
        compliance: "safe",
        referenceCount: 2
      },
      {
        ownerId: demoUser.id,
        name: "周末清单配图",
        type: "image",
        url: "/demo-materials/weekend-list.svg",
        compliance: "safe",
        referenceCount: 1
      },
      {
        ownerId: demoUser.id,
        name: "导流风险样例",
        type: "image",
        url: "/demo-materials/risky-sample.svg",
        compliance: "warning",
        riskReason: "文件名或素材描述存在导流风险",
        referenceCount: 0
      }
    ]
  });

  const post = await prisma.post.create({
    data: {
      authorId: demoUser.id,
      title: "通勤路上的 3 个轻量补能习惯",
      coverUrl: "/demo-materials/cafe-cover.svg",
      body: "早高峰不一定只能消耗体力。提前准备一杯低糖咖啡、一个可复用清单和一段 10 分钟阅读，可以让通勤更有掌控感。",
      tags: "通勤,效率,生活方式",
      status: "published",
      publishedAt: new Date()
    }
  });

  await prisma.moderationResult.create({
    data: {
      postId: post.id,
      riskLevel: "safe",
      riskTypes: "none",
      matchedRules: "[]",
      reason: "未命中高危规则，表达健康。",
      suggestedAction: "allow",
      provider: "mock"
    }
  });

  await prisma.qualityScore.create({
    data: {
      postId: post.id,
      originality: 82,
      structure: 88,
      informationDensity: 84,
      clarity: 91,
      interactionPotential: 79,
      platformFit: 86,
      total: 85
    }
  });

  await prisma.rankingMetric.create({
    data: {
      postId: post.id,
      views: 1260,
      likes: 186,
      saves: 74,
      feedbackScore: 82,
      heatScore: 78,
      freshnessScore: 92,
      riskPenalty: 0,
      rankingScore: 83.6
    }
  });

  await prisma.postComment.create({
    data: {
      postId: post.id,
      authorId: demoUser.id,
      authorName: demoUser.name,
      body: "这条通勤清单很适合信息流展示，评论和点赞会参与推荐排序。"
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
