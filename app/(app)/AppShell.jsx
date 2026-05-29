"use client";

import { useCallback, useMemo, useState } from "react";
import { DataProvider } from "./providers/DataProvider";
import { SessionProvider } from "./providers/SessionProvider";
import { LiveProvider } from "./providers/LiveProvider";
import { PicksProvider } from "./providers/PicksProvider";
import { GamePicksProvider } from "./providers/GamePicksProvider";
import { LeaguesProvider } from "./providers/LeaguesProvider";
import { CrumbsContext } from "./CrumbsContext";
import { RouteContext } from "./RouteContext";
import { useHashRoute } from "../hooks/useHashRoute";
import Masthead from "../components/Masthead";
import BottomTabBar from "../components/BottomTabBar";
import Routes from "./Routes";
import styles from "./AppShell.module.css";

/**
 * Client root of the React app. Mounts the provider stack (outer→inner:
 * Data → Session → Live → Picks → GamePicks → Leagues), then renders the
 * hash-routed view tree with the broadcast masthead + mobile bottom tab bar.
 */
export default function AppShell({ session }) {
  return (
    <DataProvider>
      <SessionProvider session={session}>
        <LiveProvider>
          <PicksProvider>
            <GamePicksProvider>
              <LeaguesProvider>
                <Shell session={session} />
              </LeaguesProvider>
            </GamePicksProvider>
          </PicksProvider>
        </LiveProvider>
      </SessionProvider>
    </DataProvider>
  );
}

function Shell({ session }) {
  const route = useHashRoute();
  const { hash, parts } = route;
  const [crumbState, setCrumbState] = useState({ crumbs: [], back: null });
  const set = useCallback((crumbs, back) => {
    setCrumbState((prev) => {
      if (prev.back === back && sameCrumbs(prev.crumbs, crumbs)) return prev;
      return { crumbs, back: back === undefined ? null : back };
    });
  }, []);
  const crumbValue = useMemo(() => ({ ...crumbState, set }), [crumbState, set]);

  return (
    <RouteContext.Provider value={route}>
      <CrumbsContext.Provider value={crumbValue}>
        <Masthead session={session} hash={hash} />
        <main className={styles.main}>
          <div className={styles.inner}>
            <Routes parts={parts} />
          </div>
        </main>
        <BottomTabBar hash={hash} />
      </CrumbsContext.Provider>
    </RouteContext.Provider>
  );
}

function sameCrumbs(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].text !== b[i].text || a[i].href !== b[i].href) return false;
  }
  return true;
}
