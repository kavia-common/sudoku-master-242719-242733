import React from "react";
import { formatTime } from "../lib/utils";

// PUBLIC_INTERFACE
export default function TopBar({ difficulty, secondsElapsed, stats, message }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-title">Retro Sudoku</div>
        <div className="brand-subtitle">Soft Gray Edition</div>
      </div>

      <div className="hud">
        <div className="hud-item" aria-label="Difficulty">
          <span className="hud-label">Difficulty</span>
          <span className="hud-value">{difficulty}</span>
        </div>
        <div className="hud-item" aria-label="Timer">
          <span className="hud-label">Time</span>
          <span className="hud-value mono">{formatTime(secondsElapsed)}</span>
        </div>
        <div className="hud-item" aria-label="Stats">
          <span className="hud-label">Completed</span>
          <span className="hud-value">
            {stats.completed}/{stats.started}
          </span>
        </div>
      </div>

      <div className="status" role="status" aria-live="polite">
        {message}
      </div>
    </div>
  );
}
