type QualityScore = {
  originality: number;
  structure: number;
  informationDensity: number;
  clarity: number;
  interactionPotential: number;
  platformFit: number;
  total: number;
};

const labels: Array<[keyof QualityScore, string]> = [
  ["originality", "原创性"],
  ["structure", "结构"],
  ["informationDensity", "信息密度"],
  ["clarity", "表达清晰"],
  ["interactionPotential", "互动潜力"],
  ["platformFit", "平台适配"]
];

export function QualityScoreCard({ score }: { score: QualityScore }) {
  return (
    <div className="studio-tile p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-accent">Quality Index</p>
          <p className="mt-1 text-sm text-muted">质量总分</p>
        </div>
        <p className="text-4xl font-semibold leading-none text-ink">{score.total}</p>
      </div>
      <div className="mt-4 space-y-3">
        {labels.map(([key, label]) => (
          <div key={key}>
            <div className="flex justify-between text-xs text-muted">
              <span>{label}</span>
              <span>{score[key]}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-line/70">
              <div
                className="h-2 rounded-full bg-teal"
                style={{ width: `${score[key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
