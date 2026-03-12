import React from "react";

// PUBLIC_INTERFACE
export default function Controls({
  difficulty,
  onChangeDifficulty,
  onNewGame,
  pencilMode,
  onTogglePencil,
  onHint,
  onCheck,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearCell,
  onResetPuzzle,
}) {
  return (
    <div className="controls" aria-label="Sudoku controls">
      <div className="controls-row">
        <button type="button" className="btn" onClick={onNewGame}>
          New Game
        </button>

        <label className="select">
          <span className="select-label">Difficulty</span>
          <select value={difficulty} onChange={(e) => onChangeDifficulty(e.target.value)} aria-label="Select difficulty">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </label>

        <button type="button" className={`btn ${pencilMode ? "btn-secondary" : ""}`} onClick={onTogglePencil}>
          {pencilMode ? "Pencil: ON" : "Pencil: OFF"}
        </button>
      </div>

      <div className="controls-row">
        <button type="button" className="btn" onClick={onHint}>
          Hint
        </button>
        <button type="button" className="btn" onClick={onCheck}>
          Check
        </button>
        <button type="button" className="btn" onClick={onClearCell}>
          Clear
        </button>
        <button type="button" className="btn" onClick={onResetPuzzle}>
          Reset
        </button>
      </div>

      <div className="controls-row">
        <button type="button" className="btn" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="btn" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
      </div>
    </div>
  );
}
