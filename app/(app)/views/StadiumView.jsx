"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useData } from "../providers/DataProvider";
import { useCrumbs } from "../CrumbsContext";
import { useRoute } from "../RouteContext";
import { roundLabel, seasonSummary } from "@/lib/format";
import Tbd from "../../components/Tbd";
import PageHeader from "../../components/PageHeader";
import styles from "./StadiumView.module.css";

export default function StadiumView({ teamId }) {
  const { TOURNAMENT, STADIUM_PHOTOS } = useData();
  const { set } = useCrumbs();
  const { navigate } = useRoute();
  const t = TOURNAMENT.teams[teamId];
  const site = TOURNAMENT.sites.find((s) => s.teams.indexOf(teamId) !== -1);
  const st = t && t.stadium;

  useEffect(() => {
    if (!t) {
      navigate("#/");
      return;
    }
    const crumbs = [{ text: "Home", href: "#/" }];
    if (site) crumbs.push({ text: site.city + " " + roundLabel(TOURNAMENT.round), href: "#/r/" + site.id });
    crumbs.push({ text: t.name, href: "#/t/" + teamId });
    crumbs.push({ text: st.name });
    set(crumbs, "#/t/" + teamId);
  }, [t, site, st, teamId, set, navigate, TOURNAMENT.round]);

  if (!t) return null;
  const photo = STADIUM_PHOTOS[teamId];

  return (
    <section className="view">
      <PageHeader kicker="Ballpark" title={st.name} sub={`Home of ${t.name} · ${t.conference}`} />

      <div className={styles.wrap}>
        <div>
          {photo ? (
            <figure className={`${styles.photo} stadium-photo`}>
              <div className={styles.frame}>
                <Image
                  src={"/" + photo.file}
                  alt={`${st.name}, home of ${t.name}`}
                  fill
                  priority
                  sizes="(max-width: 760px) 100vw, 640px"
                  className={styles.img}
                />
              </div>
              <figcaption>
                Photo: {photo.by}
                {photo.license && (
                  <>
                    {" · "}
                    {photo.licenseUrl ? (
                      <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">
                        {photo.license}
                      </a>
                    ) : (
                      photo.license
                    )}
                  </>
                )}
                {photo.source && (
                  <>
                    {" · "}
                    <a href={photo.source} target="_blank" rel="noopener noreferrer">
                      Wikimedia
                    </a>
                  </>
                )}
              </figcaption>
            </figure>
          ) : (
            <div className={styles.photoPh}>
              <Tbd value={null} label="Photo TBD" />
            </div>
          )}

          <ul className={`${styles.facts} stadium-facts`}>
            <li>
              <span className={styles.k}>Capacity</span>
              <span className={`${styles.v} tnum`}>{st.capacity != null ? st.capacity.toLocaleString() : <Tbd value={null} />}</span>
            </li>
            <li>
              <span className={styles.k}>Location</span>
              <span className={styles.v}>
                {st.city}, {st.state}
              </span>
            </li>
            <li>
              <span className={styles.k}>Opened</span>
              <span className={`${styles.v} tnum`}>
                <Tbd value={st.opened} />
              </span>
            </li>
            <li>
              <span className={styles.k}>Conference</span>
              <span className={styles.v}>{t.conference}</span>
            </li>
          </ul>
        </div>

        <div>
          <div className="panel-title">History</div>
          <p className={styles.blurb}>{st.blurb}</p>
          <div className="panel-title">About {t.name}</div>
          <p className={styles.blurb}>
            {seasonSummary(t, site, TOURNAMENT.round)}
            {t.seasonNote ? " " + t.seasonNote : ""}
          </p>
          <ul className={styles.mini}>
            {t.players.slice(0, 3).map((p, i) => (
              <li key={i}>
                <span className={styles.mpPos}>
                  <Tbd value={p.pos} />
                </span>
                <span className={styles.mpName}>
                  <Tbd value={p.name} />
                </span>
                <span className={`${styles.mpLine} tnum`}>
                  <Tbd value={p.line} />
                </span>
              </li>
            ))}
          </ul>
          <div className="btn-row">
            <a className="btn primary" href={"#/t/" + teamId}>
              ← Back to {t.name}
            </a>
            {site && (
              <a className="btn" href={"#/r/" + site.id}>
                {site.city} {roundLabel(TOURNAMENT.round)} →
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
