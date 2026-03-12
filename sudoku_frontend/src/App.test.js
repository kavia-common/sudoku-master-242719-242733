import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the app title", () => {
  render(<App />);
  const title = screen.getByText(/retro sudoku/i);
  expect(title).toBeInTheDocument();
});
