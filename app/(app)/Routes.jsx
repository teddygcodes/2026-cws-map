"use client";

import CompareView from "./views/CompareView";
import TeamView from "./views/TeamView";
import StadiumView from "./views/StadiumView";
import GameView from "./views/GameView";
import RegionalView from "./views/RegionalView";
import NationalBracketView from "./views/NationalBracketView";
import HomeView from "./views/HomeView";
import GamesView from "./views/GamesView";
import PicksView from "./views/PicksView";
import H2HView from "./views/H2HView";
import LeagueView from "./views/LeagueView";

export default function Routes({ parts }) {
  const [p0, p1, p2] = parts;
  switch (p0) {
    case "r":
      return <RegionalView siteId={decodeURIComponent(p1 || "")} />;
    case "t":
      return <TeamView teamId={decodeURIComponent(p1 || "")} />;
    case "s":
      return <StadiumView teamId={decodeURIComponent(p1 || "")} />;
    case "g":
      return <GameView eventId={decodeURIComponent(p1 || "")} />;
    case "vs":
      return <CompareView idA={decodeURIComponent(p1 || "")} idB={decodeURIComponent(p2 || "")} />;
    case "bracket":
      return <NationalBracketView />;
    case "picks":
      return <PicksView code={p1 ? decodeURIComponent(p1) : null} />;
    case "h2h":
      return <H2HView a={decodeURIComponent(p1 || "")} b={decodeURIComponent(p2 || "")} />;
    case "games":
      return <GamesView />;
    case "league":
      return <LeagueView code={p1 ? decodeURIComponent(p1) : null} />;
    default:
      return <HomeView />;
  }
}
