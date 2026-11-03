# Turing dApp (Atividade 13)

Criptomoeda **Turing (TUR)** e dApp para votar nos projetos finais da disciplina.
Feita a partir do `hardhat-boilerplate` da atividade 12.

- `contracts/Turing.sol`: o contrato (ERC-20, extra da atividade)
- `test/Turing.js`: 23 testes cobrindo todos os requires
- `scripts/deploy.js`: deploy + copia do ABI e do endereço para o frontend
- `frontend/`: a dApp em React

## Como rodar

Use três terminais, todos dentro desta pasta.

```bash
# uma vez só
npm install
cd frontend && npm install && cd ..

# Terminal 1: blockchain local (deixe aberto)
npx hardhat node

# Terminal 2: deploy do contrato
npx hardhat run scripts/deploy.js --network localhost

# Terminal 3: frontend
cd frontend
npm run start
```

Abra http://localhost:3000.

Para rodar os testes: `npx hardhat test`.

## MetaMask

1. Adicione a rede: RPC `http://127.0.0.1:8545/`, ID da cadeia `31337`.
2. Importe as contas que quiser testar, usando as chaves privadas que o
   `npx hardhat node` mostra no Terminal 1.
3. Selecione a rede local no MetaMask antes de conectar.

Se você reiniciar o `npx hardhat node`:

- Faça o deploy de novo (Terminal 2).
- No MetaMask, limpe os dados de atividade das contas (Configurações → Avançado).
  Senão aparece erro de "nonce".

## Tabela de usuários

Os usuários ficam no construtor de `contracts/Turing.sol`.

| Codinome | Endereço | Papel |
|---|---|---|
| (nenhum) | conta #0 do `hardhat node` | owner (faz o deploy), superusuário |
| roberta | 0x502542668aF09fa7aea52174b9965A7799343Df7 | professora, superusuária |
| nome1 a nome5 | contas #1 a #5 do `hardhat node` | alunos |

A roberta não é uma conta do `hardhat node`, então não dá para importá-la no
MetaMask. Para testar as funções de superusuário, use a conta #0 (owner).

## Decisões tomadas

- **ERC-20 (extra):** usa a biblioteca OpenZeppelin, com 18 casas decimais.
  1 TUR = 10^18 unidades, e o frontend faz a conversão.
- **`vote` aceita frações:** qualquer valor maior que 0 e até 2 TUR (ex.: 1.5).
- **A votação começa ativa:** `voting` é inicializada em `true`, como pede a
  especificação.
- **O owner não está na tabela:** por isso ele não vota, só administra.
- **Ranking por eventos:** a tela recarrega os saldos sempre que o contrato
  emite `Transfer`, `VotingStatusChanged` ou `UserUpdated`.
