import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { FamePip } from "../../app/components/FamePip";

describe("FamePip", () => {
  test("renders the tier one hollow circle in road gray", () => {
    render(<FamePip tier={1} />);

    const circle = screen.getByTestId("fame-outline-circle");

    expect(circle).toHaveAttribute("fill", "none");
    expect(circle).toHaveAttribute("stroke", "#B0B7BC");
    expect(screen.queryByTestId("fame-star")).not.toBeInTheDocument();
  });

  test("renders a prospect as an outlined dark cream star", () => {
    render(<FamePip tier={2} />);

    const star = screen.getByTestId("fame-star");

    expect(star).toHaveAttribute("fill", "none");
    expect(star).toHaveAttribute("stroke", "#CBB89C");
  });

  test("renders a veteran as a filled historical yellow star", () => {
    render(<FamePip tier={3} />);

    const star = screen.getByTestId("fame-star");

    expect(star).toHaveAttribute("fill", "#F2C041");
    expect(screen.queryByTestId("fame-inner-border")).not.toBeInTheDocument();
  });

  test("renders a captain with the marquee red inner border", () => {
    render(<FamePip tier={4} />);

    const border = screen.getByTestId("fame-inner-border");

    expect(border).toHaveAttribute("stroke", "#CC3433");
    expect(screen.queryByTestId("fame-stitch-ring")).not.toBeInTheDocument();
  });

  test("renders a superstar with chalk backing, glow, and stitch ring", () => {
    render(<FamePip tier={5} />);

    expect(screen.getByTestId("fame-chalk-backing")).toBeInTheDocument();
    expect(screen.getByTestId("fame-superstar-glow")).toBeInTheDocument();

    const ring = screen.getByTestId("fame-stitch-ring");

    expect(ring).toHaveAttribute("stroke", "#CC3433");
    expect(ring).toHaveAttribute("stroke-dasharray", "2.2 4.4");
  });

  test("shows the numeric count beneath the pip in display mode", () => {
    render(<FamePip tier={4} size="lg" showCount />);

    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(screen.getByLabelText("Fame tier Captain (4/5)")).toBeInTheDocument();
  });
});
