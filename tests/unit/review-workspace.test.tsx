import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReviewWorkspace } from "@/components/review-workspace";

const quality = {
  originality: 80,
  structure: 82,
  informationDensity: 84,
  clarity: 86,
  interactionPotential: 78,
  platformFit: 88,
  total: 84
};

const reviewRecord = {
  id: "review_1",
  title: "Safe review record",
  body: "A compact review body used for layout tests.",
  riskLevel: "safe",
  riskTypes: ["none"],
  reason: "No high-risk rule matched.",
  suggestedAction: "allow",
  quality
};

describe("review workspace layout", () => {
  it("fills the workspace content height instead of leaving a fixed bottom gap", () => {
    const { container } = render(
      <ReviewWorkspace
        canReviewContent={true}
        records={[reviewRecord]}
        fallbackRecord={reviewRecord}
      />
    );

    const layout = container.firstElementChild;

    expect(layout).toHaveClass("lg:flex-1");
    expect(layout).toHaveClass("xl:min-h-0");
    expect(layout).not.toHaveClass("xl:h-[calc(100vh-14rem)]");
  });
});
