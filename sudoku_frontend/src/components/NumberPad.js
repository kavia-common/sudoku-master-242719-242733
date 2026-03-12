import React from "react";

// PUBLIC_INTERFACE
export default function NumberPad({ onInput, onErase, disabled }) {
  return (
    <div className="number-pad" aria-label="Number pad">
      <div className="number-grid">
        {Array.from({ length: 9 }, (_, i) => {
          const n = i + 1;
          return (
            <button
              key={`np-${n}`}
              type="button"
              className="num-btn"
              onClick={() => onInput(n)}
              disabled={disabled}
              aria-label={`Enter ${n}`}
            >
              {n}
            </button>
          );
        })}
        <button type="button" className="num-btn num-erase" onClick={onErase} disabled={disabled} aria-label="Erase">
          Erase
        </button>
      </div>
    </div>
  );
}
