import React, { useMemo } from "react";
import { keyForCell } from "../lib/utils";
import { computeConflicts } from "../lib/sudoku";

/**
 * Props:
 * - board: number[9][9]
 * - givens: boolean[9][9]
 * - pencilMarks: Record<"r,c", number[]>
 * - selected: {row, col} | null
 * - onSelectCell: (row, col) => void
 * - highlight: { row?: number, col?: number, box?: {br, bc} } derived from selected
 * - showConflicts: boolean
 * - incorrectCells: boolean[9][9] | null (optional, for "check solution")
 * - lastMoveCellKey: string|null (optional)
 */

// PUBLIC_INTERFACE
export default function SudokuBoard({
  board,
  givens,
  pencilMarks,
  selected,
  onSelectCell,
  showConflicts,
  incorrectCells,
  lastMoveCellKey,
}) {
  const conflicts = useMemo(() => (showConflicts ? computeConflicts(board) : null), [board, showConflicts]);

  const selectedRow = selected?.row ?? null;
  const selectedCol = selected?.col ?? null;
  const selectedBox =
    selectedRow != null && selectedCol != null
      ? { br: Math.floor(selectedRow / 3) * 3, bc: Math.floor(selectedCol / 3) * 3 }
      : null;

  return (
    <div className="sudoku-board" role="grid" aria-label="Sudoku board">
      {board.map((row, r) => (
        <div className="sudoku-row" role="row" key={`row-${r}`}>
          {row.map((value, c) => {
            const k = keyForCell(r, c);
            const isGiven = Boolean(givens?.[r]?.[c]);
            const isSelected = selectedRow === r && selectedCol === c;
            const isSameRow = selectedRow === r;
            const isSameCol = selectedCol === c;
            const isSameBox =
              selectedBox && r >= selectedBox.br && r < selectedBox.br + 3 && c >= selectedBox.bc && c < selectedBox.bc + 3;

            const hasConflict = Boolean(conflicts?.[r]?.[c]);
            const isIncorrect = Boolean(incorrectCells?.[r]?.[c]);
            const isLastMove = lastMoveCellKey === k;

            const marks = pencilMarks?.[k] || [];

            const classes = [
              "sudoku-cell",
              isGiven ? "is-given" : "is-editable",
              isSelected ? "is-selected" : "",
              !isSelected && (isSameRow || isSameCol || isSameBox) ? "is-related" : "",
              hasConflict ? "is-conflict" : "",
              isIncorrect ? "is-incorrect" : "",
              isLastMove ? "is-last-move" : "",
              // borders for boxes:
              c % 3 === 0 ? "box-left" : "",
              r % 3 === 0 ? "box-top" : "",
              c === 8 ? "box-right" : "",
              r === 8 ? "box-bottom" : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <button
                type="button"
                key={k}
                role="gridcell"
                className={classes}
                onClick={() => onSelectCell(r, c)}
                aria-label={`Row ${r + 1} column ${c + 1}${value ? ` value ${value}` : " empty"}`}
              >
                {value !== 0 ? (
                  <span className="cell-value">{value}</span>
                ) : marks.length ? (
                  <span className="cell-marks" aria-hidden="true">
                    {Array.from({ length: 9 }, (_, idx) => {
                      const n = idx + 1;
                      const on = marks.includes(n);
                      return (
                        <span key={`${k}-m-${n}`} className={`mark ${on ? "on" : ""}`}>
                          {on ? n : ""}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                  <span className="cell-empty" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
