import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock next-auth/react so signOut/signIn don't hit the network.
const signOut = vi.fn();
const signIn = vi.fn();
vi.mock("next-auth/react", () => ({ signOut: (...a) => signOut(...a), signIn: (...a) => signIn(...a) }));

import AuthHeader from "@/app/AuthHeader";

describe("AuthHeader sign-out", () => {
  beforeEach(() => {
    signOut.mockClear();
    localStorage.clear();
  });

  test("clears this device's app data (cws-*) but nothing else, then signs out", () => {
    localStorage.setItem("cws-leagues-v1", JSON.stringify({ v: 1, joined: [{ code: "ABC123" }] }));
    localStorage.setItem("cws-picks-v1", "x");
    localStorage.setItem("cws-gamepicks-v1", "x");
    localStorage.setItem("cws-results-v1", "x");
    localStorage.setItem("unrelated-key", "keep-me");

    render(<AuthHeader session={{ user: { name: "Tester", email: "t@example.com" } }} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    // All app keys gone…
    expect(localStorage.getItem("cws-leagues-v1")).toBeNull();
    expect(localStorage.getItem("cws-picks-v1")).toBeNull();
    expect(localStorage.getItem("cws-gamepicks-v1")).toBeNull();
    expect(localStorage.getItem("cws-results-v1")).toBeNull();
    // …unrelated keys preserved…
    expect(localStorage.getItem("unrelated-key")).toBe("keep-me");
    // …and the session is actually ended.
    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  test("signed-out state shows Sign in and never touches storage", () => {
    localStorage.setItem("cws-leagues-v1", "x");
    render(<AuthHeader session={null} />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(localStorage.getItem("cws-leagues-v1")).toBe("x");
  });
});
