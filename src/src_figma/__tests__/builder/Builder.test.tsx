import { beforeEach, describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Builder } from "../../app/pages/Builder";

function renderBuilder() {
  render(
    <MemoryRouter>
      <Builder />
    </MemoryRouter>,
  );
}

function getSelect(label: string): HTMLSelectElement {
  const labeled = screen.queryByLabelText(label) as HTMLSelectElement | null;
  if (labeled) return labeled;
  const selects = screen
    .getAllByText(label)
    .map((node) => node.closest("label")?.querySelector("select"))
    .filter((select): select is HTMLSelectElement => Boolean(select));
  if (selects.length !== 1) throw new Error(`Expected one select for ${label}, found ${selects.length}`);
  return selects[0];
}

function setMultiSelect(label: string, values: string[]) {
  const select = getSelect(label);
  Array.from(select.options).forEach((option) => {
    option.selected = values.includes(option.value);
  });
  fireEvent.change(select);
}

function selectedValues(label: string): string[] {
  const select = getSelect(label);
  return Array.from(select.selectedOptions).map((option) => option.value);
}

function optionValues(label: string): string[] {
  const select = getSelect(label);
  return Array.from(select.options).map((option) => option.value);
}

describe("Builder", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("renders the combined builder tools", () => {
    renderBuilder();

    expect(screen.getByRole("heading", { name: "Builder" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Team Builder/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Player Builder/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Player Analyzer/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /League Builder/i })).toBeInTheDocument();
    expect(screen.getByText("Generated Sandcats")).toBeInTheDocument();
  });

  test("switches between player analyzer and league builder panels", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Player Analyzer/i }));
    expect(screen.getByDisplayValue("Sample Player")).toBeInTheDocument();
    expect(screen.getByLabelText("Bats")).toHaveValue("R");
    expect(screen.getByLabelText("Throws")).toHaveValue("R");
    expect(screen.getByText("Handedness Impact")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Bats"), { target: { value: "S" } });
    fireEvent.change(screen.getByLabelText("Throws"), { target: { value: "L" } });
    expect(screen.getByLabelText("Bats")).toHaveValue("S");
    expect(screen.getByLabelText("Throws")).toHaveValue("L");
    expect(screen.getByText("S/L")).toBeInTheDocument();
    expect(screen.getByText("Warnings")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /League Builder/i }));
    expect(screen.getByRole("link", { name: /Open Console/i })).toHaveAttribute("href", "/league-builder");
  });

  test("adds an analyzed player to the generated pool for team builder selection", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Player Analyzer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Add To Pool/i }));
    expect(screen.getByText("Pool: 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Team Builder/i }));
    expect(screen.getByText("Generated Player Pool")).toBeInTheDocument();
    expect(screen.getByText("Sample Player")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Include" }));
    expect(screen.getAllByText("Included").length).toBeGreaterThan(0);
  });

  test("opens generated player details and saves a full player record to the pool", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Player Builder/i }));
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "1" } });
    setMultiSelect("Positions", ["CF"]);
    fireEvent.click(screen.getByRole("button", { name: "Build" }));
    fireEvent.click(screen.getAllByLabelText(/^View /)[0]);
    expect(screen.getByRole("dialog", { name: /Player details/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Age")).toBeInTheDocument();

    const computedGrade = screen.getByLabelText("Computed Grade");
    const gradeBefore = computedGrade.textContent;
    const powerInput = screen.getByLabelText("power") as HTMLInputElement;
    fireEvent.change(powerInput, { target: { value: powerInput.value === "99" ? "0" : "99" } });
    expect(computedGrade.textContent).not.toEqual(gradeBefore);

    fireEvent.change(screen.getByLabelText("Age"), { target: { value: "29" } });
    fireEvent.click(screen.getByRole("button", { name: /Save Player/i }));
    expect(screen.getByText("Pool: 1")).toBeInTheDocument();
  });

  test("uses closed position choices before generation and preserves pitcher arsenals", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Player Builder/i }));
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "1" } });
    expect(optionValues("Positions")).not.toContain("P");
    expect(optionValues("Positions")).not.toContain("TWO-WAY");
    expect(optionValues("Positions")).not.toContain("DH");
    setMultiSelect("Positions", ["SP/RP"]);
    fireEvent.click(screen.getByRole("button", { name: "Build" }));
    fireEvent.click(screen.getAllByLabelText(/^View /)[0]);

    expect(screen.getByLabelText("Primary")).toHaveValue("SP/RP");
    const arsenal = selectedValues("Arsenal");
    expect(arsenal.some((pitch) => /4F|2F|CF/.test(pitch))).toBe(true);
    expect(arsenal.some((pitch) => /SL|CH|CB|FK/.test(pitch))).toBe(true);
  });

  test("blocks player generation when no valid primary position is selected", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Player Builder/i }));
    const existingGeneratedViewButtons = screen.getAllByLabelText(/^View /);
    const existingGeneratedLabels = existingGeneratedViewButtons
      .map((button) => button.getAttribute("aria-label") ?? "")
      .sort();

    setMultiSelect("Positions", []);
    fireEvent.click(screen.getByRole("button", { name: "Build" }));

    expect(screen.getByText("Select at least one primary position.")).toBeInTheDocument();
    const blockedSaveAll = screen.getByRole("button", { name: /Save All/i });
    expect(blockedSaveAll).toBeDisabled();
    expect(screen.getByText("Generated Players")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^View /).map((button) => button.getAttribute("aria-label") ?? "").sort()).toEqual(
      existingGeneratedLabels,
    );

    fireEvent.click(blockedSaveAll);
    expect(screen.getByText("Pool: 0")).toBeInTheDocument();

    setMultiSelect("Positions", ["CF"]);
    const reenabledSaveAll = screen.getByRole("button", { name: /Save All/i });
    expect(reenabledSaveAll).toBeEnabled();
    fireEvent.click(reenabledSaveAll);
    expect(screen.getByText(`Pool: ${existingGeneratedViewButtons.length}`)).toBeInTheDocument();
  });

  test("limits SMB4 arsenal choices and requires pitcher pitch families", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Player Analyzer/i }));
    fireEvent.change(screen.getByLabelText("Primary"), { target: { value: "SP" } });

    expect(optionValues("Arsenal")).not.toContain("SC");
    expect(optionValues("Arsenal")).not.toContain("KN");

    setMultiSelect("Arsenal", ["4F"]);
    expect(screen.getByText("Pitchers need at least one offspeed pitch: CB, SL, CH, FK, or SB.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add To Pool/i })).toBeDisabled();

    setMultiSelect("Arsenal", ["4F", "2F", "CB", "SL", "CH"]);
    const arsenalSelect = getSelect("Arsenal");
    expect(Array.from(arsenalSelect.options).find((option) => option.value === "FK")).toBeDisabled();
    expect(Array.from(arsenalSelect.options).find((option) => option.value === "SB")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Add To Pool/i })).toBeEnabled();
  });

  test("preserves analyzer secondary positions that are not League Builder positions", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Player Analyzer/i }));
    fireEvent.change(screen.getByLabelText("Secondary"), { target: { value: "C/1B" } });
    fireEvent.click(screen.getByRole("button", { name: /Add To Pool/i }));

    fireEvent.click(screen.getByRole("button", { name: /Team Builder/i }));
    fireEvent.click(screen.getByLabelText("View Sample Player"));

    expect(screen.getByLabelText("Secondary")).toHaveValue("C/1B");
  });

  test("hydrates persisted pool records with safe defaults", () => {
    window.localStorage.setItem(
      "kbl-builder-generated-player-pool-v1",
      JSON.stringify([
        {
          id: "legacy-pitcher",
          firstName: "Legacy",
          lastName: "Pitcher",
          primaryPosition: "P",
          secondaryPosition: "C/1B",
          bats: "L",
          throws: "L",
          velocity: 72,
          junk: 68,
          accuracy: 70,
          arsenal: "4F|SL|CH|SC|KN",
          trait1: "Imaginary Trait",
          trait2: "Elite 4",
          // "Scholarly" is a chemistry word, not a canonical personality (WT-B taxonomy fix) —
          // a legacy/invalid value here should fall back to "Relaxed", not crash or pass through.
          personality: "Scholarly",
          overallGrade: "E",
          builderSource: "player-builder",
        },
      ]),
    );

    renderBuilder();
    expect(screen.getByText("Pool: 1")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("View Legacy Pitcher"));

    expect(screen.getByLabelText("Primary")).toHaveValue("SP/RP");
    expect(screen.getByLabelText("Secondary")).toHaveValue("C/1B");
    expect(screen.getByLabelText("Computed Grade")).toHaveTextContent("Generated");
    expect(selectedValues("Arsenal")).toEqual(expect.arrayContaining(["4F", "SL", "CH"]));
    expect(selectedValues("Arsenal")).not.toEqual(expect.arrayContaining(["SC", "KN"]));
    expect(screen.getByLabelText("Trait 1")).toHaveValue("");
    expect(screen.getByLabelText("Trait 2")).toHaveValue("Elite 4F");
    expect(screen.getByLabelText("Personality")).toHaveValue("Relaxed");
  });

  test("keeps personality and chemistry option sets separate", () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Player Builder/i }));
    fireEvent.click(screen.getAllByLabelText(/^View /)[0]);

    expect(optionValues("Personality")).toEqual(["Competitive", "Tough", "Relaxed", "Egotistical", "Jolly", "Timid", "Droopy"]);
    expect(optionValues("Chemistry")).toEqual(["Competitive", "Spirited", "Crafty", "Scholarly", "Disciplined"]);
  });

  test("dedupes persisted pool records by keeping the newest version of each id", () => {
    window.localStorage.setItem(
      "kbl-builder-generated-player-pool-v1",
      JSON.stringify([
        {
          id: "duplicate-player",
          firstName: "Old",
          lastName: "Player",
          primaryPosition: "CF",
          overallGrade: "C",
          createdDate: "2026-01-01T00:00:00.000Z",
          lastModified: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "duplicate-player",
          firstName: "New",
          lastName: "Player",
          primaryPosition: "CF",
          overallGrade: "B",
          createdDate: "2026-01-01T00:00:00.000Z",
          lastModified: "2026-02-01T00:00:00.000Z",
        },
        {
          id: "duplicate-player",
          firstName: "Malformed",
          lastName: "Player",
          primaryPosition: "CF",
          overallGrade: "S",
        },
      ]),
    );

    renderBuilder();

    expect(screen.getByText("Pool: 1")).toBeInTheDocument();
    expect(screen.getByText("New Player")).toBeInTheDocument();
    expect(screen.queryByText("Old Player")).not.toBeInTheDocument();
    expect(screen.queryByText("Malformed Player")).not.toBeInTheDocument();
  });
});
