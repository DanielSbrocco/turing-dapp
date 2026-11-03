import React from "react";

export function TransactionErrorMessage({ message, dismiss }) {
  return (
    <div className="alert alert-danger" role="alert">
      Erro na transação: {String(message).substring(0, 200)}
      <button
        type="button"
        className="close"
        data-dismiss="alert"
        aria-label="Fechar"
        onClick={dismiss}
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  );
}
