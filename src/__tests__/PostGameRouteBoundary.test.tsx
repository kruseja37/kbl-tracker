import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterAll, afterEach, describe, expect, test, vi } from "vitest";
import { PostGameRouteBoundary } from "../components/PostGameRouteBoundary";

function ThrowingPostGame() {
  throw new Error("post-game blew up");
}

describe("PostGameRouteBoundary", () => {
  const consoleErrorSpy = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  test("shows a fallback message when the post-game route crashes", () => {
    render(
      <MemoryRouter>
        <PostGameRouteBoundary>
          <ThrowingPostGame />
        </PostGameRouteBoundary>
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Post-game report unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Return Home" }),
    ).toBeInTheDocument();
  });
});
