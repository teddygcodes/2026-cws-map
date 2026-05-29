import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import Tbd from "@/app/components/Tbd";
import OddsChip from "@/app/components/OddsChip";
import LiveBadge from "@/app/components/LiveBadge";
import CountdownBanner from "@/app/components/CountdownBanner";

// The honesty gate — the single most important rendering invariant in the app.
describe("Tbd", () => {
  test("renders the value when present", () => {
    render(<Tbd value="51–6" />);
    expect(screen.getByText("51–6")).toBeInTheDocument();
  });
  test("renders the label when the value is missing", () => {
    render(<Tbd value={null} label="Not posted yet" />);
    expect(screen.getByText("Not posted yet")).toBeInTheDocument();
  });
  test("treats empty string and TODO* as missing", () => {
    const { rerender } = render(<Tbd value="" />);
    expect(screen.getByText("TBD")).toBeInTheDocument();
    rerender(<Tbd value="TODO verify" />);
    expect(screen.getByText("TBD")).toBeInTheDocument();
  });
});

describe("OddsChip", () => {
  test("shows the moneyline and flags the favorite", () => {
    render(<OddsChip ml="-180" favorite />);
    expect(screen.getByText("-180")).toBeInTheDocument();
    expect(screen.getByLabelText("Moneyline -180, favorite")).toBeInTheDocument();
  });
  test("never invents a line — shows 'Not posted yet' when null", () => {
    render(<OddsChip ml={null} />);
    expect(screen.getByText("Not posted yet")).toBeInTheDocument();
  });
});

describe("LiveBadge", () => {
  test("LIVE state is a status with the detail", () => {
    render(<LiveBadge state="in" detail="Top 5" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent(/LIVE/);
    expect(badge).toHaveTextContent("Top 5");
  });
  test("post → Final", () => {
    render(<LiveBadge state="post" />);
    expect(screen.getByText("Final")).toBeInTheDocument();
  });
  test("pre → shows the time", () => {
    render(<LiveBadge state="pre" time="Fri 12:00 PM" />);
    expect(screen.getByText("Fri 12:00 PM")).toBeInTheDocument();
  });
});

describe("CountdownBanner", () => {
  test("renders nothing without a target", () => {
    const { container } = render(<CountdownBanner target={null} />);
    expect(container).toBeEmptyDOMElement();
  });
  test("renders nothing once first pitch has passed", () => {
    const { container } = render(<CountdownBanner target={Date.now() - 1000} />);
    expect(container).toBeEmptyDOMElement();
  });
  test("counts down to a future first pitch", () => {
    const target = Date.now() + 2 * 86400000 + 3 * 3600000 + 4 * 60000 + 30000;
    render(<CountdownBanner target={target} label="Friday, May 29" />);
    expect(screen.getByText(/First pitch in/)).toBeInTheDocument();
    expect(screen.getByText("2d 3h 4m")).toBeInTheDocument();
  });
});
