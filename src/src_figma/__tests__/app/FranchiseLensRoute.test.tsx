import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

vi.mock("../../app/pages/FranchiseLens", () => ({
  FranchiseLens: () => <div data-testid="franchise-lens-route">Franchise Lens Route</div>,
}));

vi.mock("../../app/pages/FranchiseHome", () => ({
  FranchiseHome: () => <div data-testid="franchise-home-route">Legacy Franchise Home</div>,
}));

import App from "../../../App";

describe("franchise route cutover", () => {
  test("/franchise/:franchiseId renders FranchiseLens", async () => {
    render(
      <MemoryRouter initialEntries={["/franchise/franchise-route-test"]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("franchise-lens-route")).toBeInTheDocument();
    expect(screen.queryByTestId("franchise-home-route")).toBeNull();
  });
});
