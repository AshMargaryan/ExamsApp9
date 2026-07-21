import { useState } from "react";

type PendingOp = "+" | "−" | "×" | "÷" | "xʸ" | null;

function formatResult(value: number): string {
  if (!Number.isFinite(value)) return "Սխալ";
  return Number(value.toPrecision(12)).toString();
}

function applyOp(a: number, op: PendingOp, b: number): number {
  switch (op) {
    case "+": return a + b;
    case "−": return a - b;
    case "×": return a * b;
    case "÷": return a / b;
    case "xʸ": return Math.pow(a, b);
    default: return b;
  }
}

export function Calculator() {
  const [display, setDisplay] = useState("0");
  const [stored, setStored] = useState<number | null>(null);
  const [pendingOp, setPendingOp] = useState<PendingOp>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [scientific, setScientific] = useState(false);
  const [degMode, setDegMode] = useState(true);

  function inputDigit(digit: string) {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  }

  function inputDecimal() {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  }

  function clearAll() {
    setDisplay("0");
    setStored(null);
    setPendingOp(null);
    setWaitingForOperand(false);
  }

  function backspace() {
    if (waitingForOperand) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  }

  function toggleSign() {
    if (display === "0") return;
    setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
  }

  function chooseOperator(op: Exclude<PendingOp, null>) {
    const current = parseFloat(display);
    if (stored !== null && pendingOp && !waitingForOperand) {
      const result = applyOp(stored, pendingOp, current);
      setStored(result);
      setDisplay(formatResult(result));
    } else {
      setStored(current);
    }
    setPendingOp(op);
    setWaitingForOperand(true);
  }

  function equals() {
    if (pendingOp === null || stored === null) return;
    const current = parseFloat(display);
    const result = applyOp(stored, pendingOp, current);
    setDisplay(formatResult(result));
    setStored(null);
    setPendingOp(null);
    setWaitingForOperand(true);
  }

  function applyUnary(fn: (x: number) => number) {
    const current = parseFloat(display);
    setDisplay(formatResult(fn(current)));
    setWaitingForOperand(true);
  }

  function toRad(x: number) {
    return degMode ? (x * Math.PI) / 180 : x;
  }

  function insertConstant(value: number) {
    setDisplay(formatResult(value));
    setWaitingForOperand(true);
  }

  const digitBtn =
    "rounded-md bg-surface-muted py-3 text-lg font-medium text-text transition-colors hover:bg-border";
  const opBtn =
    "rounded-md bg-primary/10 py-3 text-lg font-medium text-primary transition-colors hover:bg-primary/20";
  const fnBtn =
    "rounded-md border border-border py-2 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-primary";

  return (
    <div className="w-72 select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setScientific((s) => !s)}
          className={fnBtn}
        >
          {scientific ? "Պարզ" : "Գիտական"}
        </button>
        {scientific && (
          <button type="button" onClick={() => setDegMode((d) => !d)} className={fnBtn}>
            {degMode ? "DEG" : "RAD"}
          </button>
        )}
      </div>

      <div className="mb-3 overflow-x-auto rounded-md border border-border bg-surface-muted px-3 py-3 text-right text-2xl font-semibold text-text">
        {display}
      </div>

      {scientific && (
        <div className="mb-2 grid grid-cols-5 gap-1.5">
          <button className={fnBtn} onClick={() => applyUnary((x) => Math.sin(toRad(x)))}>sin</button>
          <button className={fnBtn} onClick={() => applyUnary((x) => Math.cos(toRad(x)))}>cos</button>
          <button className={fnBtn} onClick={() => applyUnary((x) => Math.tan(toRad(x)))}>tan</button>
          <button className={fnBtn} onClick={() => applyUnary((x) => Math.log10(x))}>log</button>
          <button className={fnBtn} onClick={() => applyUnary((x) => Math.log(x))}>ln</button>
          <button className={fnBtn} onClick={() => applyUnary((x) => Math.sqrt(x))}>√</button>
          <button className={fnBtn} onClick={() => applyUnary((x) => x * x)}>x²</button>
          <button className={fnBtn} onClick={() => chooseOperator("xʸ")}>xʸ</button>
          <button className={fnBtn} onClick={() => insertConstant(Math.PI)}>π</button>
          <button className={fnBtn} onClick={() => insertConstant(Math.E)}>e</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        <button className={fnBtn} onClick={clearAll}>C</button>
        <button className={fnBtn} onClick={toggleSign}>±</button>
        <button className={fnBtn} onClick={backspace}>⌫</button>
        <button className={opBtn} onClick={() => chooseOperator("÷")}>÷</button>

        <button className={digitBtn} onClick={() => inputDigit("7")}>7</button>
        <button className={digitBtn} onClick={() => inputDigit("8")}>8</button>
        <button className={digitBtn} onClick={() => inputDigit("9")}>9</button>
        <button className={opBtn} onClick={() => chooseOperator("×")}>×</button>

        <button className={digitBtn} onClick={() => inputDigit("4")}>4</button>
        <button className={digitBtn} onClick={() => inputDigit("5")}>5</button>
        <button className={digitBtn} onClick={() => inputDigit("6")}>6</button>
        <button className={opBtn} onClick={() => chooseOperator("−")}>−</button>

        <button className={digitBtn} onClick={() => inputDigit("1")}>1</button>
        <button className={digitBtn} onClick={() => inputDigit("2")}>2</button>
        <button className={digitBtn} onClick={() => inputDigit("3")}>3</button>
        <button className={opBtn} onClick={() => chooseOperator("+")}>+</button>

        <button className={`${digitBtn} col-span-2`} onClick={() => inputDigit("0")}>0</button>
        <button className={digitBtn} onClick={inputDecimal}>.</button>
        <button
          className="rounded-md bg-primary py-3 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
          onClick={equals}
        >
          =
        </button>
      </div>
    </div>
  );
}