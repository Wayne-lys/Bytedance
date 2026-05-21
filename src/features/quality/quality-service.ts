type QualityInput = {
  title: string;
  body: string;
  tags: string[];
  platform: string;
};

function clamp(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreQuality(input: QualityInput) {
  const bodyLength = input.body.trim().length;
  const titleLength = input.title.trim().length;
  const tagCount = input.tags.filter(Boolean).length;

  const originality = clamp(62 + Math.min(titleLength, 30));
  const structure = clamp(input.body.includes("。") ? 84 : 66);
  const informationDensity = clamp(58 + Math.min(bodyLength / 4, 34));
  const clarity = clamp(titleLength > 8 && bodyLength > 40 ? 88 : 68);
  const interactionPotential = clamp(64 + tagCount * 6);
  const platformFit = clamp(input.platform ? 86 : 62);
  const total = clamp(
    (originality +
      structure +
      informationDensity +
      clarity +
      interactionPotential +
      platformFit) /
      6
  );

  return {
    originality,
    structure,
    informationDensity,
    clarity,
    interactionPotential,
    platformFit,
    total
  };
}
