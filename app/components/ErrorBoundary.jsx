"use client";

import { Component } from "react";
import styles from "./ErrorBoundary.module.css";

/**
 * Catches render errors in the view tree so a bad route/data shape shows a
 * branded fallback instead of white-screening the whole app. Auto-recovers when
 * the route changes (routeKey prop) so navigating away clears the error.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    if (typeof console !== "undefined") console.error("[view error]", error, info);
  }
  componentDidUpdate(prev) {
    if (prev.routeKey !== this.props.routeKey && this.state.error) this.setState({ error: null });
  }
  render() {
    if (this.state.error) {
      return (
        <section className="view">
          <div className={styles.wrap} role="alert">
            <div className={styles.icon} aria-hidden="true">
              ⚠
            </div>
            <h1 className="section-head">Something broke on this screen</h1>
            <p className={styles.msg}>
              A view hit an unexpected error. Your picks are saved in this browser — reload to continue, or head home.
            </p>
            <div className="btn-row">
              <button className="btn primary" onClick={() => window.location.reload()}>
                Reload
              </button>
              <a className="btn" href="#/">
                Go home
              </a>
            </div>
          </div>
        </section>
      );
    }
    return this.props.children;
  }
}
