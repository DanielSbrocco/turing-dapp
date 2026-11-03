import React, { useState } from "react";

// Formulario da funcao vote(codinome, qtde_de_Turings)
export function VoteForm({
  codinomes,
  alreadyVoted,
  canVote,
  voting,
  voteCount,
  symbol,
  disabled,
  onVote,
}) {
  const [codinome, setCodinome] = useState("");
  const [amount, setAmount] = useState("");

  const blocked = !canVote || !voting || disabled;
  const faltam = 10 - (voteCount % 10);

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h2 className="h5 card-title">Votar</h2>

        {!canVote && (
          <p className="text-muted small">
            Esta conta é superusuária, mas não está na tabela de usuários, então
            não pode votar.
          </p>
        )}
        {canVote && !voting && (
          <p className="text-muted small">
            A votação está pausada. Aguarde um superusuário ativar.
          </p>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!codinome || !amount) return;
            onVote(codinome, amount);
          }}
        >
          <div className="form-group">
            <label htmlFor="vote-codinome">Codinome</label>
            <select
              id="vote-codinome"
              className="form-control"
              value={codinome}
              onChange={(e) => setCodinome(e.target.value)}
              disabled={blocked}
              required
            >
              <option value="">Selecione...</option>
              {codinomes.map((c) => (
                <option key={c} value={c} disabled={alreadyVoted[c]}>
                  {c}
                  {alreadyVoted[c] ? " (já votado)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="vote-amount">Quantidade de {symbol}</label>
            <input
              id="vote-amount"
              className="form-control"
              type="number"
              step="0.01"
              min="0.01"
              max="2"
              placeholder="maior que 0 e no máximo 2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={blocked}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={blocked}>
            Votar
          </button>
        </form>

        {canVote && (
          <p className="small text-muted mt-3 mb-0">
            Você já deu {voteCount} voto(s). Faltam {faltam} para ganhar 1{" "}
            {symbol}.
          </p>
        )}
      </div>
    </div>
  );
}
