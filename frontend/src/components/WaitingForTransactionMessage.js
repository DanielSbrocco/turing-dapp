import React from "react";

export function WaitingForTransactionMessage({ txHash }) {
  return (
    <div className="alert alert-info text-break" role="alert">
      Aguardando a transação <strong>{txHash}</strong> ser minerada...
    </div>
  );
}
