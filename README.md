# Turing dApp

Criptomoeda **Turing (TUR)** e dApp para votar nos projetos finais da disciplina de Blockchain.

O projeto parte do [hardhat-boilerplate](https://github.com/NomicFoundation/hardhat-boilerplate) da atividade anterior. O contrato `Token` foi substituído pelo contrato `Turing`, e o frontend foi adaptado para a votação, o painel de superusuário e o ranking.

**Destaques**
- Token **ERC-20** (extra da atividade), implementado com a biblioteca OpenZeppelin.
- Estratégia **Uncapped Lazy Supply**: nenhum token é criado no deploy. Os Turings são criados (*mint*) sob demanda, sem limite máximo.
- Controle de acesso: só os usuários da tabela votam, e o **owner** e a **professora** são superusuários.
- Ranking atualizado por **eventos** do contrato.
- **23 testes automatizados** cobrindo todas as funções e todos os `require`.

## Como rodar

São necessários Node.js 22 e o MetaMask.

```bash
npm install
cd frontend && npm install && cd ..

npx hardhat test                                        # testes do contrato
```

```bash
npx hardhat node                                        # Terminal 1: blockchain local
npx hardhat run scripts/deploy.js --network localhost   # Terminal 2: deploy
cd frontend && npm run start                            # Terminal 3: http://localhost:3000
```

No MetaMask, adicione a rede `http://127.0.0.1:8545/` com chainId `31337`. Depois importe as contas com as chaves privadas exibidas pelo `npx hardhat node`: a **#0** é o owner e as **#1 a #5** são `nome1` a `nome5`.

## Estrutura

```
contracts/Turing.sol          contrato Turing (ERC-20 + votação)
test/Turing.js                testes do contrato
scripts/deploy.js             deploy e cópia do ABI/endereço para o frontend
hardhat.config.js             configuração (Solidity 0.8.28)
frontend/src/components/
  Dapp.js                     lógica: carteira, leitura do contrato, eventos e transações
  Header.js                   codinome, saldo e status da votação
  VoteForm.js                 formulário da função vote
  AdminPanel.js               votingOn, votingOff e issueToken
  Ranking.js                  ranking por quantidade de Turings
```

A pasta `frontend/src/contracts/` é gerada pelo deploy, e por isso não está no repositório.

## Usuários

A tabela da especificação é inicializada no construtor do contrato.

| Codinome | Endereço | Papel |
|---|---|---|
| *(sem codinome)* | conta #0 do `hardhat node` | owner (quem fez o deploy), superusuário |
| roberta | `0x502542668aF09fa7aea52174b9965A7799343Df7` | professora, superusuária |
| nome1 a nome5 | contas #1 a #5 do `hardhat node` | alunos |

O endereço da professora não é uma conta do Hardhat. Para usar o painel de superusuário localmente, use a conta #0.

## Contrato

`Turing` herda de `ERC20` (OpenZeppelin), com nome `Turing`, símbolo `TUR` e 18 casas decimais (1 TUR = 10¹⁸ unidades). O construtor não cria nenhum token, então o `totalSupply` começa em zero.

### Estado

- `users` — `mapping(string => address)`: codinome → endereço, como pede a especificação.
- `codinomeOf` — `mapping(address => string)`: caminho inverso, usado para identificar quem está votando.
- `codinomes` — `string[]`: lista dos codinomes. Um mapping não pode ser percorrido, e o frontend precisa da lista para os seletores e o ranking.
- `voting` — `bool`: inicializada em `true`.
- `hasVote` — `mapping(string => mapping(string => bool))`: registra se um codinome já votou em outro.
- `voteCount` — `mapping(string => uint256)`: votos dados por codinome, para a recompensa.

### Funções

O `require` "apenas owner ou professora" é implementado no modifier **`onlyOwnerOrProfessora`**, usado em `updateUser`, `votingOn`, `votingOff` e `issueToken`.

| Função | Acesso | Comportamento |
|---|---|---|
| `updateUser(codinome, user_addr)` | superusuário | Atualiza o endereço do codinome (ou cadastra um novo). O endereço antigo perde a autorização. Exige codinome não vazio |
| `votingOn()` / `votingOff()` | superusuário | Ativa ou pausa a votação |
| `issueToken(codinome, qtde)` | superusuário | Cria `qtde` Turings na carteira do codinome |
| `vote(codinome, qtde)` | usuários da tabela | Cria `qtde` Turings para o codinome votado. A cada 10 votos, o eleitor recebe 1 Turing |
| `getCodinomes()` | leitura | Lista de codinomes |
| `isSuperUser(addr)` | leitura | Se o endereço é owner ou professora |

Requires de `vote`: votação ativa, chamador na tabela, codinome cadastrado, não votar em si mesmo, `0 < qtde <= 2 TUR` e no máximo um voto por codinome (`hasVote`).

Além do `Transfer` do ERC-20, o contrato emite `Voted`, `UserUpdated` e `VotingStatusChanged`, que o frontend usa para se manter atualizado.

## Testes

`npx hardhat test` roda 23 testes (Mocha + Chai). Eles cobrem:
- o deploy: dados do token, ausência de tokens iniciais, a tabela e a votação ativa;
- o modifier: aluno bloqueado e professora liberada;
- `updateUser`, `votingOn`/`votingOff` e `issueToken`;
- cada `require` de `vote`;
- a recompensa no 10º voto.

Os testes usam `loadFixture`, que reaproveita o deploy entre os testes, e `impersonateAccount`, que permite assinar transações como a professora sem a chave privada dela.

## Frontend

React com ethers v5 e Bootstrap, mantendo a organização do boilerplate. Toda a lógica fica no `Dapp.js`, e os outros componentes são só de apresentação.

- **Conexão:** conecta o MetaMask, confere a rede local (31337) e avisa se o contrato não existir no endereço salvo (por exemplo, depois de reiniciar a blockchain).
- **Interfaces por perfil:**
  - o usuário comum vê o formulário de voto e o ranking;
  - o superusuário vê também o painel com `votingOn`, `votingOff` e `issueToken`.
- **Seletores de codinome:** a professora fica de fora, como pede a especificação. No voto, o próprio usuário também é excluído, e os codinomes em que ele já votou aparecem desabilitados.
- **Ranking:** usa a opção com eventos. A dApp escuta `Transfer`, `VotingStatusChanged` e `UserUpdated`, e a cada evento relê os saldos e reordena o ranking. Outras abas abertas também se atualizam.
- **Transações:** mostram a espera pela mineração, uma confirmação quando dão certo e, em caso de falha, a mensagem do `require` que reverteu.

## Mudanças em relação ao boilerplate

- `Token.sol` foi substituído por `Turing.sol`, e o `deploy.js` foi ajustado (linhas 25 e 48).
- O Hardhat foi atualizado de 2.12 para 2.29, por compatibilidade com o Node 22 e o Solidity 0.8.28.
- O Solidity foi atualizado de 0.8.17 para 0.8.28, porque o OpenZeppelin 5 exige `>= 0.8.20`.
- Foram removidos `tasks/faucet.js`, `Transfer.js` e `NoTokensMessage.js`, que eram específicos do Token.
- Foram criados os componentes `Header`, `VoteForm`, `AdminPanel` e `Ranking`.
- A atualização de saldos passou de *polling* para eventos.

## Decisões de implementação

- **Frações no voto:** como a especificação pede apenas "maior que 0 e menor ou igual a 2", valores como 1,5 TUR são aceitos.
- **O owner não vota:** só os usuários da tabela podem votar, e o owner não faz parte dela.
- **Validações extras em `updateUser`:** o endereço não pode ser `0x0` nem pertencer a outro codinome, para manter `users` e `codinomeOf` consistentes.
- **Contagem por codinome:** `voteCount` e `hasVote` usam o codinome, então o histórico se mantém mesmo se o endereço de um usuário mudar.

## Problemas comuns

| Sintoma | Solução |
|---|---|
| "Contrato Turing não encontrado" | A blockchain foi reiniciada. Refaça o deploy e recarregue a página |
| Erro de *nonce* no MetaMask | Configurações → Avançado → limpar dados de atividade |
| A dApp não reconhece a conta selecionada | Libere a conta em *Sites conectados → localhost:3000* no MetaMask |
