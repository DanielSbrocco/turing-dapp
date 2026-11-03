import React, { useState } from "react";

// Painel dos superusuarios (owner e professora):
// issueToken, votingOn e votingOff
export function AdminPanel({
  codinomes,
  voting,
  symbol,
  disabled,
  onIssue,
  onVotingOn,
  onVotingOff,
}) {
  const [codinome, setCodinome] = useState("");
  const [amount, setAmount] = useState("");

  return (
    <div className="card mb-4 border-warning">
      <div className="card-body">
        <h2 className="h5 card-title">Painel do superusuário</h2>

        <div className="mb-4">
          <div className="mb-2">Votação</div>
          <div className="btn-group" role="group" aria-label="Votação">
            <button
              type="button"
              className={`btn ${voting ? "btn-success" : "btn-outline-success"}`}
              onClick={onVotingOn}
              disabled={disabled || voting}
            >
              votingOn
            </button>
            <button
              type="button"
              className={`btn ${!voting ? "btn-secondary" : "btn-outline-secondary"}`}
              onClick={onVotingOff}
              disabled={disabled || !voting}
            >
              votingOff
            </button>
          </div>
        </div>

        <h3 className="h6">Emitir Turings (issueToken)</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!codinome || !amount) return;
            onIssue(codinome, amount);
          }}
        >
          <div className="form-group">
            <label htmlFor="issue-codinome">Codinome</label>
            <select
              id="issue-codinome"
              className="form-control"
              value={codinome}
              onChange={(e) => setCodinome(e.target.value)}
              disabled={disabled}
              required
            >
              <option value="">Selecione...</option>
              {codinomes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="issue-amount">Quantidade de {symbol}</label>
            <input
              id="issue-amount"
              className="form-control"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="ex.: 10"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled}
              required
            />
          </div>

          <button className="btn btn-warning" type="submit" disabled={disabled}>
            Emitir
          </button>
        </form>
      </div>
    </div>
  );
}
