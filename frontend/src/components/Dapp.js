import React from "react";

// ethers v5 (a mesma versao do boilerplate)
import { ethers } from "ethers";

// ABI e endereco gerados pelo scripts/deploy.js
import TuringArtifact from "../contracts/Turing.json";
import contractAddress from "../contracts/contract-address.json";

// Componentes visuais (sem logica de blockchain)
import { NoWalletDetected } from "./NoWalletDetected";
import { ConnectWallet } from "./ConnectWallet";
import { Loading } from "./Loading";
import { TransactionErrorMessage } from "./TransactionErrorMessage";
import { WaitingForTransactionMessage } from "./WaitingForTransactionMessage";
import { Header } from "./Header";
import { VoteForm } from "./VoteForm";
import { AdminPanel } from "./AdminPanel";
import { Ranking } from "./Ranking";

// Rede local do Hardhat: chainId 31337 = 0x7a69
const HARDHAT_CHAIN_ID = 31337;
const HARDHAT_CHAIN_ID_HEX = "0x" + HARDHAT_CHAIN_ID.toString(16);

// Codigo de erro quando o usuario recusa a transacao no MetaMask
const ERROR_CODE_TX_REJECTED_BY_USER = 4001;

// O Turing e um ERC-20 com 18 casas decimais
const DECIMALS = 18;

// Este componente:
//   1. conecta a carteira (MetaMask)
//   2. inicializa o ethers e o contrato Turing
//   3. le o estado do contrato (usuarios, saldos, votacao) e monta o ranking
//   4. escuta os eventos do contrato para manter o ranking atualizado
//   5. envia as transacoes vote, issueToken, votingOn e votingOff
export class Dapp extends React.Component {
  constructor(props) {
    super(props);

    this.initialState = {
      selectedAddress: undefined,
      // Dados lidos do contrato
      tokenData: undefined, // { name, symbol }
      contractMissing: false,
      voting: false,
      users: [], // [{ codinome, address, balance }]
      professora: "professora",
      myCodinome: "",
      isSuperUser: false,
      myBalance: undefined,
      myVoteCount: 0,
      alreadyVoted: {}, // { codinome: true }
      // Transacoes
      txBeingSent: undefined,
      transactionError: undefined,
      networkError: undefined,
      lastSuccess: undefined,
    };

    this.state = this.initialState;
  }

  render() {
    if (window.ethereum === undefined) {
      return <NoWalletDetected />;
    }

    if (!this.state.selectedAddress) {
      return (
        <ConnectWallet
          connectWallet={() => this._connectWallet()}
          networkError={this.state.networkError}
          dismiss={() => this._dismissNetworkError()}
        />
      );
    }

    if (this.state.contractMissing) {
      return (
        <div className="container p-4">
          <div className="alert alert-warning">
            <h5>Contrato Turing não encontrado nesta rede</h5>
            <p className="mb-1">
              Provavelmente a blockchain local foi reiniciada e o contrato foi
              perdido. Rode de novo:
            </p>
            <pre className="mb-1">
              npx hardhat run scripts/deploy.js --network localhost
            </pre>
            <p className="mb-0">
              Depois reinicie o frontend (<code>npm run start</code>) e confira
              se o MetaMask está na rede local (chainId 31337).
            </p>
          </div>
        </div>
      );
    }

    if (!this.state.tokenData || this.state.myBalance === undefined) {
      return <Loading />;
    }

    const { symbol } = this.state.tokenData;
    const isRegistered = this.state.myCodinome !== "";
    const txPending = this.state.txBeingSent !== undefined;

    // Codinomes de alunos (a professora fica de fora dos seletores),
    // em ordem alfabetica (nome1, nome2, ..., nome10)
    const students = this.state.users
      .map((u) => u.codinome)
      .filter((c) => c !== this.state.professora)
      .sort((a, b) => a.localeCompare(b, "pt", { numeric: true }));

    return (
      <div className="container py-4">
        <Header
          tokenData={this.state.tokenData}
          address={this.state.selectedAddress}
          codinome={this.state.myCodinome}
          isSuperUser={this.state.isSuperUser}
          balance={this._format(this.state.myBalance)}
          voting={this.state.voting}
        />

        {this.state.txBeingSent && (
          <WaitingForTransactionMessage txHash={this.state.txBeingSent} />
        )}

        {this.state.transactionError && (
          <TransactionErrorMessage
            message={this._getRpcErrorMessage(this.state.transactionError)}
            dismiss={() => this._dismissTransactionError()}
          />
        )}

        {this.state.lastSuccess && (
          <div className="alert alert-success" role="alert">
            {this.state.lastSuccess}
            <button
              type="button"
              className="close"
              aria-label="Fechar"
              onClick={() => this.setState({ lastSuccess: undefined })}
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        )}

        {!isRegistered && !this.state.isSuperUser && (
          <div className="alert alert-secondary">
            Esta conta não está na tabela de usuários autorizados. Você pode ver
            o ranking, mas não pode votar.
          </div>
        )}

        <div className="row">
          <div className="col-lg-5">
            {(isRegistered || this.state.isSuperUser) && (
              <VoteForm
                codinomes={students.filter((c) => c !== this.state.myCodinome)}
                alreadyVoted={this.state.alreadyVoted}
                canVote={isRegistered}
                voting={this.state.voting}
                voteCount={this.state.myVoteCount}
                symbol={symbol}
                disabled={txPending}
                onVote={(codinome, amount) => this._vote(codinome, amount)}
              />
            )}

            {this.state.isSuperUser && (
              <AdminPanel
                codinomes={students}
                voting={this.state.voting}
                symbol={symbol}
                disabled={txPending}
                onIssue={(codinome, amount) => this._issueToken(codinome, amount)}
                onVotingOn={() => this._setVoting(true)}
                onVotingOff={() => this._setVoting(false)}
              />
            )}
          </div>

          <div className="col-lg-7">
            <Ranking
              users={this.state.users.map((u) => ({
                ...u,
                balanceText: this._format(u.balance),
              }))}
              me={this.state.myCodinome}
              symbol={symbol}
            />
          </div>
        </div>
      </div>
    );
  }

  componentWillUnmount() {
    this._stopListening();
  }

  // ------------------------------------------------------------------
  // Conexao com a carteira
  // ------------------------------------------------------------------

  async _connectWallet() {
    const [selectedAddress] = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    const ok = await this._checkNetwork();
    if (!ok) return;

    this._initialize(selectedAddress);

    // Reinicializa quando o usuario troca de conta no MetaMask
    window.ethereum.on("accountsChanged", ([newAddress]) => {
      this._stopListening();
      if (newAddress === undefined) {
        return this._resetState();
      }
      this._initialize(newAddress);
    });

    // Se trocar de rede, recarrega a pagina
    window.ethereum.on("chainChanged", () => window.location.reload());
  }

  async _initialize(userAddress) {
    this.setState({ ...this.initialState, selectedAddress: userAddress });

    this._provider = new ethers.providers.Web3Provider(window.ethereum);
    this._provider.pollingInterval = 1000;

    // Se a blockchain foi reiniciada, nao existe codigo no endereco salvo
    const code = await this._provider.getCode(contractAddress.Turing);
    if (code === "0x") {
      this.setState({ contractMissing: true });
      return;
    }

    this._turing = new ethers.Contract(
      contractAddress.Turing,
      TuringArtifact.abi,
      this._provider.getSigner(0)
    );

    const [name, symbol, professora] = await Promise.all([
      this._turing.name(),
      this._turing.symbol(),
      this._turing.PROFESSORA(),
    ]);
    this.setState({ tokenData: { name, symbol }, professora });

    await this._refresh();
    this._startListening();
  }

  // ------------------------------------------------------------------
  // Leitura do contrato e ranking
  // ------------------------------------------------------------------

  // Le tudo que a tela precisa: usuarios, saldos, votacao e papel da conta.
  async _refresh() {
    if (!this._turing) return;
    const me = this.state.selectedAddress;

    const [codinomes, voting, myCodinome, isSuperUser, myBalance] =
      await Promise.all([
        this._turing.getCodinomes(),
        this._turing.voting(),
        this._turing.codinomeOf(me),
        this._turing.isSuperUser(me),
        this._turing.balanceOf(me),
      ]);

    const users = await Promise.all(
      codinomes.map(async (codinome) => {
        const address = await this._turing.users(codinome);
        const balance = await this._turing.balanceOf(address);
        return { codinome, address, balance };
      })
    );

    // Ranking: maior saldo primeiro (empate: ordem alfabetica)
    users.sort((a, b) => {
      if (b.balance.gt(a.balance)) return 1;
      if (b.balance.lt(a.balance)) return -1;
      return a.codinome.localeCompare(b.codinome, "pt", { numeric: true });
    });

    // Em quem esta conta ja votou
    const alreadyVoted = {};
    let myVoteCount = 0;
    if (myCodinome !== "") {
      const flags = await Promise.all(
        codinomes.map((c) => this._turing.hasVote(myCodinome, c))
      );
      codinomes.forEach((c, i) => {
        if (flags[i]) alreadyVoted[c] = true;
      });
      myVoteCount = (await this._turing.voteCount(myCodinome)).toNumber();
    }

    this.setState({
      users,
      voting,
      myCodinome,
      isSuperUser,
      myBalance,
      alreadyVoted,
      myVoteCount,
    });
  }

  // Ranking por EVENTOS: sempre que o contrato emite Transfer (mint de
  // vote/issueToken), VotingStatusChanged ou UserUpdated, a tela e atualizada.
  _startListening() {
    const onEvent = () => this._scheduleRefresh();
    this._turing.on("Transfer", onEvent);
    this._turing.on("VotingStatusChanged", onEvent);
    this._turing.on("UserUpdated", onEvent);
  }

  _stopListening() {
    if (this._turing) this._turing.removeAllListeners();
    clearTimeout(this._refreshTimer);
  }

  // Junta varios eventos seguidos em uma unica leitura
  _scheduleRefresh() {
    clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => this._refresh(), 300);
  }

  // ------------------------------------------------------------------
  // Transacoes
  // ------------------------------------------------------------------

  async _vote(codinome, amount) {
    await this._sendTx(
      () => this._turing.vote(codinome, this._parse(amount)),
      `Voto registrado: ${amount} ${this.state.tokenData.symbol} para ${codinome}.`
    );
  }

  async _issueToken(codinome, amount) {
    await this._sendTx(
      () => this._turing.issueToken(codinome, this._parse(amount)),
      `${amount} ${this.state.tokenData.symbol} emitidos para ${codinome}.`
    );
  }

  async _setVoting(on) {
    await this._sendTx(
      () => (on ? this._turing.votingOn() : this._turing.votingOff()),
      on ? "Votação ativada." : "Votação pausada."
    );
  }

  // Envia uma transacao, espera ser minerada e trata os erros
  async _sendTx(send, successMessage) {
    try {
      this._dismissTransactionError();
      this.setState({ lastSuccess: undefined });

      const tx = await send();
      this.setState({ txBeingSent: tx.hash });

      const receipt = await tx.wait();
      if (receipt.status === 0) {
        throw new Error("Transaction failed");
      }

      this.setState({ lastSuccess: successMessage });
      await this._refresh();
    } catch (error) {
      if (error.code === ERROR_CODE_TX_REJECTED_BY_USER) {
        return;
      }
      console.error(error);
      this.setState({ transactionError: error });
    } finally {
      this.setState({ txBeingSent: undefined });
    }
  }

  // ------------------------------------------------------------------
  // Utilitarios
  // ------------------------------------------------------------------

  // "1.5" -> 1500000000000000000
  _parse(amount) {
    return ethers.utils.parseUnits(String(amount), DECIMALS);
  }

  // 1500000000000000000 -> "1.5"
  _format(value) {
    const text = ethers.utils.formatUnits(value, DECIMALS);
    return text.endsWith(".0") ? text.slice(0, -2) : text;
  }

  _dismissTransactionError() {
    this.setState({ transactionError: undefined });
  }

  _dismissNetworkError() {
    this.setState({ networkError: undefined });
  }

  // Extrai a mensagem do require (ex.: "Ja votou neste codinome")
  _getRpcErrorMessage(error) {
    const text = [
      error.reason,
      error.data && error.data.message,
      error.error && error.error.message,
      error.error && error.error.data && error.error.data.message,
      error.message,
      JSON.stringify(error),
    ]
      .filter(Boolean)
      .join(" ");

    const match = text.match(/reverted with reason string '([^']*)'/);
    if (match) return match[1];

    if (error.reason) return error.reason;
    if (error.data && error.data.message) return error.data.message;
    return error.message;
  }

  _resetState() {
    this.setState(this.initialState);
  }

  // Garante que o MetaMask esta na rede local do Hardhat
  async _checkNetwork() {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (parseInt(chainId, 16) === HARDHAT_CHAIN_ID) return true;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
      });
      return true;
    } catch (e) {
      this.setState({
        networkError:
          "Selecione no MetaMask a rede local do Hardhat (http://127.0.0.1:8545, chainId 31337).",
      });
      return false;
    }
  }
}
