import React from "react";

export function Header({ tokenData, address, codinome, isSuperUser, balance, voting }) {
  return (
    <div className="mb-4">
      <div className="d-flex flex-wrap align-items-center justify-content-between">
        <h1 className="h2 mb-2">
          {tokenData.name} dApp{" "}
          <small className="text-muted">({tokenData.symbol})</small>
        </h1>
        <span
          className={`badge badge-pill p-2 mb-2 ${
            voting ? "badge-success" : "badge-secondary"
          }`}
        >
          {voting ? "Votação ativa" : "Votação pausada"}
        </span>
      </div>

      <div className="card">
        <div className="card-body py-3 d-flex flex-wrap justify-content-between align-items-center">
          <div className="mr-3">
            <div>
              <b>{codinome || "Conta sem codinome"}</b>{" "}
              {isSuperUser && (
                <span className="badge badge-warning ml-1">Superusuário</span>
              )}
            </div>
            <small className="text-muted text-break">{address}</small>
          </div>
          <div className="text-right">
            <div className="h4 mb-0">
              {balance} {tokenData.symbol}
            </div>
            <small className="text-muted">seu saldo</small>
          </div>
        </div>
      </div>
    </div>
  );
}
