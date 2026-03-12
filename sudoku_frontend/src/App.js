import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import SudokuBoard from "./components/SudokuBoard";
import Controls from "./components/Controls";
import NumberPad from "./components/NumberPad";
import TopBar from "./components/TopBar";
import { generatePuzzle, isSolvedCorrectly } from "./lib/sudoku";
import { clearGame, loadGame, loadStats, saveGame, saveStats } from "./lib/storage";
import { deepClone, keyForCell } from "./lib/utils";

const DEFAULT_DIFFICULTY = "medium";

function emptyMarks() {
  return {};
}

function emptyIncorrect() {
  return Array.from({ length: 9 }, () => Array(9).fill(false));
}

function nowMs() {
  return Date.now();
}

function makeHistoryEntry({ board, pencilMarks, selectedKey, secondsElapsed, lastMoveCellKey }) {
  return {
    board: deepClone(board),
    pencilMarks: deepClone(pencilMarks),
    selectedKey,
    secondsElapsed,
    lastMoveCellKey,
  };
}

function boardToSelectedKey(selected) {
  if (!selected) return null;
  return keyForCell(selected.row, selected.col);
}

function selectedKeyToSelected(selectedKey) {
  if (!selectedKey) return null;
  const [r, c] = selectedKey.split(",").map((x) => Number(x));
  if (!Number.isInteger(r) || !Number.isInteger(c)) return null;
  return { row: r, col: c };
}

// PUBLIC_INTERFACE
function App() {
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);

  const [puzzle, setPuzzle] = useState(() => Array.from({ length: 9 }, () => Array(9).fill(0)));
  const [solution, setSolution] = useState(() => Array.from({ length: 9 }, () => Array(9).fill(0)));
  const [givens, setGivens] = useState(() => Array.from({ length: 9 }, () => Array(9).fill(false)));

  const [board, setBoard] = useState(() => Array.from({ length: 9 }, () => Array(9).fill(0)));
  const [pencilMarks, setPencilMarks] = useState(emptyMarks);
  const [pencilMode, setPencilMode] = useState(false);

  const [selected, setSelected] = useState(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [message, setMessage] = useState("Welcome. Start a new game!");
  const [incorrectCells, setIncorrectCells] = useState(null);
  const [lastMoveCellKey, setLastMoveCellKey] = useState(null);

  const [stats, setStats] = useState(() => loadStats());

  // Undo/Redo history
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  const timerRef = useRef({ running: false, lastTickMs: nowMs() });

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const isComplete = useMemo(() => isSolvedCorrectly(board, solution), [board, solution]);

  function pushHistory(nextState) {
    setPast((prev) => {
      const entry = makeHistoryEntry(nextState);
      // Keep history bounded
      const capped = prev.length > 200 ? prev.slice(prev.length - 200) : prev;
      return [...capped, entry];
    });
    setFuture([]);
  }

  function applyEntry(entry) {
    setBoard(entry.board);
    setPencilMarks(entry.pencilMarks);
    setSelected(selectedKeyToSelected(entry.selectedKey));
    setSecondsElapsed(entry.secondsElapsed);
    setLastMoveCellKey(entry.lastMoveCellKey || null);
    setIncorrectCells(null);
  }

  // Timer: ticks only when a game is running and not completed.
  useEffect(() => {
    timerRef.current.running = true;
    timerRef.current.lastTickMs = nowMs();

    const id = setInterval(() => {
      if (!timerRef.current.running) return;
      if (isComplete) return;

      const now = nowMs();
      const delta = Math.floor((now - timerRef.current.lastTickMs) / 1000);
      if (delta > 0) {
        timerRef.current.lastTickMs = now;
        setSecondsElapsed((s) => s + delta);
      }
    }, 250);

    return () => clearInterval(id);
  }, [isComplete]);

  // Persist game state (throttled via a small debounce)
  const persistRef = useRef({ t: null });
  useEffect(() => {
    if (persistRef.current.t) clearTimeout(persistRef.current.t);
    persistRef.current.t = setTimeout(() => {
      const game = {
        v: 1,
        difficulty,
        puzzle,
        solution,
        givens,
        board,
        pencilMarks,
        selectedKey: boardToSelectedKey(selected),
        secondsElapsed,
        pencilMode,
        lastMoveCellKey,
        completed: isComplete,
        savedAt: Date.now(),
      };
      saveGame(game);
    }, 200);

    return () => {
      if (persistRef.current.t) clearTimeout(persistRef.current.t);
    };
  }, [difficulty, puzzle, solution, givens, board, pencilMarks, selected, secondsElapsed, pencilMode, lastMoveCellKey, isComplete]);

  // Load persisted game once on startup
  useEffect(() => {
    const saved = loadGame();
    if (!saved) return;

    try {
      if (saved?.puzzle?.length === 9 && saved?.board?.length === 9) {
        setDifficulty(saved.difficulty || DEFAULT_DIFFICULTY);
        setPuzzle(saved.puzzle);
        setSolution(saved.solution);
        setGivens(saved.givens);
        setBoard(saved.board);
        setPencilMarks(saved.pencilMarks || {});
        setSelected(selectedKeyToSelected(saved.selectedKey));
        setSecondsElapsed(Number(saved.secondsElapsed || 0));
        setPencilMode(Boolean(saved.pencilMode));
        setLastMoveCellKey(saved.lastMoveCellKey || null);
        setMessage("Resumed saved game.");
      }
    } catch {
      // ignore
    }
  }, []);

  // Track completion and update stats
  useEffect(() => {
    if (!isComplete) return;

    setMessage("Solved! Nice work.");
    setStats((prev) => {
      const next = deepClone(prev);
      next.completed += 1;
      const currentBest = next.bestTimeByDifficulty?.[difficulty] ?? null;
      if (currentBest == null || secondsElapsed < currentBest) {
        next.bestTimeByDifficulty[difficulty] = secondsElapsed;
      }
      saveStats(next);
      return next;
    });
  }, [isComplete, difficulty, secondsElapsed]);

  function startNewGame(nextDifficulty = difficulty) {
    const { puzzle: pz, solution: sol, givens: gv } = generatePuzzle(nextDifficulty);
    setDifficulty(nextDifficulty);
    setPuzzle(pz);
    setSolution(sol);
    setGivens(gv);
    setBoard(deepClone(pz));
    setPencilMarks(emptyMarks());
    setPencilMode(false);
    setSelected(null);
    setSecondsElapsed(0);
    setIncorrectCells(null);
    setLastMoveCellKey(null);
    setPast([]);
    setFuture([]);
    setMessage("New game started.");

    setStats((prev) => {
      const next = deepClone(prev);
      next.started += 1;
      saveStats(next);
      return next;
    });
  }

  function changeDifficulty(next) {
    setDifficulty(next);
    setMessage(`Difficulty set to ${next}.`);
  }

  function onSelectCell(row, col) {
    setSelected({ row, col });
  }

  function setCellValue(row, col, value) {
    if (givens?.[row]?.[col]) {
      setMessage("That cell is fixed.");
      return;
    }
    if (isComplete) return;

    pushHistory({ board, pencilMarks, selectedKey: boardToSelectedKey(selected), secondsElapsed, lastMoveCellKey });

    setBoard((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = value;
      return next;
    });

    // Clear pencil marks on that cell if we set a value
    setPencilMarks((prev) => {
      const next = { ...prev };
      const k = keyForCell(row, col);
      if (value !== 0) delete next[k];
      return next;
    });

    setIncorrectCells(null);
    setLastMoveCellKey(keyForCell(row, col));
  }

  function togglePencilMark(row, col, value) {
    if (givens?.[row]?.[col]) {
      setMessage("That cell is fixed.");
      return;
    }
    if (isComplete) return;

    pushHistory({ board, pencilMarks, selectedKey: boardToSelectedKey(selected), secondsElapsed, lastMoveCellKey });

    setPencilMarks((prev) => {
      const k = keyForCell(row, col);
      const existing = prev[k] ? prev[k].slice() : [];
      const has = existing.includes(value);
      const nextMarks = has ? existing.filter((n) => n !== value) : [...existing, value].sort((a, b) => a - b);
      const next = { ...prev };
      if (nextMarks.length) next[k] = nextMarks;
      else delete next[k];
      return next;
    });

    // Ensure cell value is cleared when pencil marking
    setBoard((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = 0;
      return next;
    });

    setIncorrectCells(null);
    setLastMoveCellKey(keyForCell(row, col));
  }

  function handleNumberInput(value) {
    if (!selected) {
      setMessage("Select a cell first.");
      return;
    }
    const { row, col } = selected;
    if (pencilMode) togglePencilMark(row, col, value);
    else setCellValue(row, col, value);
  }

  function handleErase() {
    if (!selected) {
      setMessage("Select a cell first.");
      return;
    }
    setCellValue(selected.row, selected.col, 0);
  }

  function handleUndo() {
    if (!canUndo) return;
    const prevEntry = past[past.length - 1];
    const current = makeHistoryEntry({ board, pencilMarks, selectedKey: boardToSelectedKey(selected), secondsElapsed, lastMoveCellKey });
    setFuture((f) => [current, ...f]);
    setPast((p) => p.slice(0, p.length - 1));
    applyEntry(prevEntry);
    setMessage("Undid last move.");
  }

  function handleRedo() {
    if (!canRedo) return;
    const nextEntry = future[0];
    const current = makeHistoryEntry({ board, pencilMarks, selectedKey: boardToSelectedKey(selected), secondsElapsed, lastMoveCellKey });
    setPast((p) => [...p, current]);
    setFuture((f) => f.slice(1));
    applyEntry(nextEntry);
    setMessage("Redid move.");
  }

  function handleHint() {
    if (!selected) {
      setMessage("Select a cell for a hint.");
      return;
    }
    const { row, col } = selected;
    if (givens?.[row]?.[col]) {
      setMessage("That cell is already fixed.");
      return;
    }
    if (isComplete) return;

    const correct = solution?.[row]?.[col] || 0;
    if (!correct) return;

    pushHistory({ board, pencilMarks, selectedKey: boardToSelectedKey(selected), secondsElapsed, lastMoveCellKey });
    setBoard((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = correct;
      return next;
    });
    setPencilMarks((prev) => {
      const next = { ...prev };
      delete next[keyForCell(row, col)];
      return next;
    });
    setIncorrectCells(null);
    setLastMoveCellKey(keyForCell(row, col));
    setMessage("Hint applied.");
  }

  function handleCheck() {
    // Mark incorrect filled cells
    const incorrect = emptyIncorrect();
    let anyIncorrect = false;

    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const v = board[r][c];
        if (v === 0) continue;
        if (v !== solution[r][c]) {
          incorrect[r][c] = true;
          anyIncorrect = true;
        }
      }
    }

    setIncorrectCells(anyIncorrect ? incorrect : null);
    setMessage(anyIncorrect ? "Some numbers are incorrect." : "So far so good!");
  }

  function handleClearCell() {
    if (!selected) {
      setMessage("Select a cell first.");
      return;
    }
    if (givens?.[selected.row]?.[selected.col]) {
      setMessage("That cell is fixed.");
      return;
    }
    pushHistory({ board, pencilMarks, selectedKey: boardToSelectedKey(selected), secondsElapsed, lastMoveCellKey });
    setCellValue(selected.row, selected.col, 0);
    setPencilMarks((prev) => {
      const next = { ...prev };
      delete next[keyForCell(selected.row, selected.col)];
      return next;
    });
    setMessage("Cleared cell.");
  }

  function handleResetPuzzle() {
    pushHistory({ board, pencilMarks, selectedKey: boardToSelectedKey(selected), secondsElapsed, lastMoveCellKey });
    setBoard(deepClone(puzzle));
    setPencilMarks(emptyMarks());
    setIncorrectCells(null);
    setLastMoveCellKey(null);
    setMessage("Reset to puzzle start.");
  }

  // Keyboard input
  useEffect(() => {
    function onKeyDown(e) {
      if (e.defaultPrevented) return;

      const key = e.key;
      if (key >= "1" && key <= "9") {
        e.preventDefault();
        handleNumberInput(Number(key));
        return;
      }
      if (key === "Backspace" || key === "Delete" || key === "0") {
        e.preventDefault();
        handleErase();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (key.toLowerCase() === "y" || (e.shiftKey && key.toLowerCase() === "z"))) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (key.toLowerCase() === "p") {
        e.preventDefault();
        setPencilMode((m) => !m);
      }
      if (!selected) return;
      const { row, col } = selected;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) {
        e.preventDefault();
        const dr = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0;
        const dc = key === "ArrowLeft" ? -1 : key === "ArrowRight" ? 1 : 0;
        const nr = Math.max(0, Math.min(8, row + dr));
        const nc = Math.max(0, Math.min(8, col + dc));
        setSelected({ row: nr, col: nc });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, pencilMode, board, pencilMarks, past, future]);

  function handleNewGameClick() {
    clearGame();
    startNewGame(difficulty);
  }

  const bestTime = stats.bestTimeByDifficulty?.[difficulty] ?? null;

  return (
    <div className="App">
      <div className="app-shell">
        <TopBar
          difficulty={difficulty}
          secondsElapsed={secondsElapsed}
          stats={stats}
          message={
            isComplete
              ? `Solved in ${secondsElapsed}s. Best (${difficulty}): ${bestTime == null ? "—" : `${bestTime}s`}`
              : message
          }
        />

        <main className="main">
          <section className="game">
            <div className="panel">
              <Controls
                difficulty={difficulty}
                onChangeDifficulty={changeDifficulty}
                onNewGame={handleNewGameClick}
                pencilMode={pencilMode}
                onTogglePencil={() => setPencilMode((m) => !m)}
                onHint={handleHint}
                onCheck={handleCheck}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={canUndo}
                canRedo={canRedo}
                onClearCell={handleClearCell}
                onResetPuzzle={handleResetPuzzle}
              />
            </div>

            <div className="board-wrap">
              <SudokuBoard
                board={board}
                givens={givens}
                pencilMarks={pencilMarks}
                selected={selected}
                onSelectCell={onSelectCell}
                showConflicts
                incorrectCells={incorrectCells}
                lastMoveCellKey={lastMoveCellKey}
              />
            </div>

            <div className="panel">
              <NumberPad onInput={handleNumberInput} onErase={handleErase} disabled={isComplete} />
              <div className="help">
                <div className="help-title">Controls</div>
                <ul>
                  <li>
                    <span className="kbd">1-9</span> enter number
                  </li>
                  <li>
                    <span className="kbd">Del</span>/<span className="kbd">Backspace</span> erase
                  </li>
                  <li>
                    <span className="kbd">P</span> toggle pencil
                  </li>
                  <li>
                    <span className="kbd">Ctrl/⌘Z</span> undo, <span className="kbd">Ctrl/⌘Y</span> redo
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <aside className="sidebar" aria-label="Statistics">
            <div className="card">
              <div className="card-title">Best Times</div>
              <div className="stat-row">
                <span>Easy</span>
                <span className="mono">{stats.bestTimeByDifficulty.easy == null ? "—" : `${stats.bestTimeByDifficulty.easy}s`}</span>
              </div>
              <div className="stat-row">
                <span>Medium</span>
                <span className="mono">
                  {stats.bestTimeByDifficulty.medium == null ? "—" : `${stats.bestTimeByDifficulty.medium}s`}
                </span>
              </div>
              <div className="stat-row">
                <span>Hard</span>
                <span className="mono">{stats.bestTimeByDifficulty.hard == null ? "—" : `${stats.bestTimeByDifficulty.hard}s`}</span>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Tips</div>
              <p className="muted">
                Use <strong>Pencil</strong> to add candidate marks. Conflicts are highlighted automatically. Use <strong>Check</strong> to
                reveal incorrect filled cells.
              </p>
            </div>

            <div className="card">
              <div className="card-title">New Game</div>
              <p className="muted">
                Changing difficulty does not auto-reset. Click <strong>New Game</strong> to generate a fresh puzzle.
              </p>
              <button type="button" className="btn btn-wide" onClick={() => startNewGame(difficulty)}>
                Generate Now
              </button>
            </div>
          </aside>
        </main>

        <footer className="footer">
          <span className="muted">Retro Sudoku — local-only, no backend required.</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
