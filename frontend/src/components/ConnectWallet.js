import React from "react";

import { NetworkErrorMessage } from "./NetworkErrorMessage";

export function ConnectWallet({ connectWallet, networkError, dismiss }) {
  return (
    <div className="container">
      <div className="row justify-content-md-center">
        <div className="col-12 text-center">
          {/* A carteira deve estar na rede local do Hardhat (127.0.0.1:8545). */}
          {networkError && (
            <NetworkErrorMessage message={networkError} dismiss={dismiss} />
          )}
        </div>
        <div className="col-md-6 p-4 text-center">
          <h1 className="h3 mb-3">Turing dApp</h1>
          <p>Conecte sua carteira para votar.</p>
          <button
            className="btn btn-warning"
            type="button"
            onClick={connectWallet}
          >
            Conectar carteira
          </button>
        </div>
      </div>
    </div>
  );
}
