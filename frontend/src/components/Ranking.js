import React from "react";

// Ranking dos usuarios por quantidade de Turings.
// A lista ja chega ordenada; ela e atualizada pelos eventos do contrato.
export function Ranking({ users, me, symbol }) {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-baseline">
          <h2 className="h5 card-title">Ranking</h2>
          <small className="text-muted">atualiza a cada evento do contrato</small>
        </div>

        <div className="table-responsive">
          <table className="table table-sm table-hover mb-0">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Codinome</th>
                <th scope="col">Endereço</th>
                <th scope="col" className="text-right">
                  {symbol}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u.codinome}
                  className={u.codinome === me ? "table-primary" : undefined}
                >
                  <td>{i + 1}</td>
                  <td>
                    {u.codinome}
                    {u.codinome === me && (
                      <span className="badge badge-primary ml-2">você</span>
                    )}
                  </td>
                  <td>
                    <code title={u.address}>
                      {u.address.slice(0, 6)}...{u.address.slice(-4)}
                    </code>
                  </td>
                  <td className="text-right">{u.balanceText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
