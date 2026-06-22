import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { LongPressReveal } from "../../app/components/LongPressReveal";

describe("LongPressReveal", () => {
  test("covers children by default", () => {
    render(
      <LongPressReveal label="Hold to reveal scout report">
        <span>Private scout value</span>
      </LongPressReveal>,
    );

    expect(screen.getByRole("button", { name: "Hold to reveal scout report" })).toBeInTheDocument();
    expect(screen.getByText("Hold to reveal scout report")).toBeInTheDocument();
    expect(screen.queryByText("Private scout value")).not.toBeInTheDocument();
  });

  test("reveals on pointer down and covers on pointer up", () => {
    render(
      <LongPressReveal label="Hold to reveal scout report">
        <span>Private scout value</span>
      </LongPressReveal>,
    );

    const control = screen.getByRole("button", { name: "Hold to reveal scout report" });

    fireEvent.pointerDown(control);
    expect(screen.getByText("Private scout value")).toBeInTheDocument();

    fireEvent.pointerUp(control);
    expect(screen.queryByText("Private scout value")).not.toBeInTheDocument();
    expect(screen.getByText("Hold to reveal scout report")).toBeInTheDocument();
  });

  test("covers on pointer leave", () => {
    render(
      <LongPressReveal label="Hold to reveal scout report">
        <span>Private scout value</span>
      </LongPressReveal>,
    );

    const control = screen.getByRole("button", { name: "Hold to reveal scout report" });

    fireEvent.pointerDown(control);
    expect(screen.getByText("Private scout value")).toBeInTheDocument();

    fireEvent.pointerLeave(control);
    expect(screen.queryByText("Private scout value")).not.toBeInTheDocument();
    expect(screen.getByText("Hold to reveal scout report")).toBeInTheDocument();
  });
});
