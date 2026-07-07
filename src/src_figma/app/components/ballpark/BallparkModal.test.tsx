import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { BallparkModal } from "./BallparkModal";

describe("BallparkModal", () => {
  test("renders only when open", () => {
    const { rerender } = render(
      <BallparkModal open={false} title="Confirm move">
        Send him down.
      </BallparkModal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <BallparkModal open title="Confirm move">
        Send him down.
      </BallparkModal>,
    );

    expect(screen.getByRole("dialog")).toHaveTextContent("Confirm move");
    expect(screen.getByText("Send him down.")).toBeInTheDocument();
  });
});
