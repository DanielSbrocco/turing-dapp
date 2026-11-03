const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
  impersonateAccount,
  setBalance,
} = require("@nomicfoundation/hardhat-network-helpers");

// Endereco da professora (roberta) na tabela. Nao e uma conta do Hardhat,
// entao nos testes usamos impersonateAccount para assinar como ela.
const ROBERTA = "0x502542668aF09fa7aea52174b9965A7799343Df7";

// 1 Turing = 10**18 unidades (ERC-20 com 18 casas decimais).
const T = (n) => ethers.utils.parseUnits(String(n), 18);

describe("Turing", function () {
  // Contas da blockchain local (as mesmas da tabela no construtor):
  //   #0 owner | #1..#5 nome1..nome5 | roberta (endereco proprio)
  async function deployTuringFixture() {
    const signers = await ethers.getSigners();
    const owner = signers[0];
    const nome = (i) => signers[i]; // nome(1) = conta #1 = "nome1"

    await impersonateAccount(ROBERTA);
    await setBalance(ROBERTA, ethers.utils.parseEther("100"));
    const professora = await ethers.getSigner(ROBERTA);

    const Turing = await ethers.getContractFactory("Turing");
    const turing = await Turing.deploy();
    await turing.deployed();

    return { turing, signers, owner, nome, professora };
  }

  // Liga a votacao (atalho usado em varios testes).
  async function deployWithVotingOn() {
    const f = await deployTuringFixture();
    await f.turing.votingOn();
    return f;
  }

  describe("Deploy", function () {
    it("e um ERC-20 chamado Turing (TUR)", async function () {
      const { turing } = await loadFixture(deployTuringFixture);
      expect(await turing.name()).to.equal("Turing");
      expect(await turing.symbol()).to.equal("TUR");
      expect(await turing.decimals()).to.equal(18);
    });

    it("nao cria nenhum token no construtor (sem ICO)", async function () {
      const { turing, owner } = await loadFixture(deployTuringFixture);
      expect(await turing.totalSupply()).to.equal(0);
      expect(await turing.balanceOf(owner.address)).to.equal(0);
    });

    it("define o owner e inicializa o mapping users com a tabela", async function () {
      const { turing, owner, nome, professora } = await loadFixture(
        deployTuringFixture
      );
      expect(await turing.owner()).to.equal(owner.address);
      expect(await turing.users("nome1")).to.equal(nome(1).address);
      expect(await turing.users("nome5")).to.equal(nome(5).address);
      expect(await turing.users("roberta")).to.equal(ROBERTA);
      expect(await turing.PROFESSORA()).to.equal("roberta");
      expect(await turing.codinomeOf(nome(5).address)).to.equal("nome5");
      expect((await turing.getCodinomes()).length).to.equal(6);
    });

    it("comeca com a votacao ligada", async function () {
      const { turing } = await loadFixture(deployTuringFixture);
      expect(await turing.voting()).to.equal(true);
    });

    it("identifica os superusuarios", async function () {
      const { turing, owner, nome, professora } = await loadFixture(
        deployTuringFixture
      );
      expect(await turing.isSuperUser(owner.address)).to.equal(true);
      expect(await turing.isSuperUser(professora.address)).to.equal(true);
      expect(await turing.isSuperUser(nome(1).address)).to.equal(false);
    });
  });

  describe("Modifier onlyOwnerOrProfessora", function () {
    it("bloqueia usuarios comuns em updateUser, votingOn, votingOff e issueToken", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      const aluno = turing.connect(nome(1));
      const msg = "Apenas o owner ou a professora";

      await expect(aluno.updateUser("nome2", nome(1).address)).to.be.revertedWith(msg);
      await expect(aluno.votingOn()).to.be.revertedWith(msg);
      await expect(aluno.votingOff()).to.be.revertedWith(msg);
      await expect(aluno.issueToken("nome1", T(1))).to.be.revertedWith(msg);
    });

    it("permite que a professora use as funcoes de superusuario", async function () {
      const { turing, nome, professora } = await loadFixture(deployTuringFixture);
      const prof = turing.connect(professora);

      await prof.votingOff();
      expect(await turing.voting()).to.equal(false);
      await prof.votingOn();
      expect(await turing.voting()).to.equal(true);

      await expect(prof.issueToken("nome3", T(5))).to.changeTokenBalance(
        turing,
        nome(3),
        T(5)
      );
    });
  });

  describe("updateUser", function () {
    it("nao aceita codinome vazio", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(turing.updateUser("", nome(1).address)).to.be.revertedWith(
        "Codinome nao pode ser vazio"
      );
    });

    it("troca o endereco de um codinome e desautoriza o endereco antigo", async function () {
      const { turing, signers, nome } = await loadFixture(deployWithVotingOn);
      // Move "nome2" para um endereco novo, liberando a conta #2.
      // Depois passa a conta #2 para "nome1".
      const novo = ethers.Wallet.createRandom().address;
      await turing.updateUser("nome2", novo);
      await expect(turing.updateUser("nome1", signers[2].address))
        .to.emit(turing, "UserUpdated")
        .withArgs("nome1", signers[2].address);

      expect(await turing.users("nome1")).to.equal(signers[2].address);
      expect(await turing.codinomeOf(signers[2].address)).to.equal("nome1");
      expect(await turing.codinomeOf(nome(1).address)).to.equal("");

      // A conta antiga de nome1 nao pode mais votar.
      await expect(
        turing.connect(nome(1)).vote("nome3", T(1))
      ).to.be.revertedWith("Usuario nao autorizado");
      // A conta nova vota como nome1.
      await expect(turing.connect(signers[2]).vote("nome3", T(1)))
        .to.emit(turing, "Voted")
        .withArgs("nome1", "nome3", T(1));
    });

    it("nao deixa um endereco pertencer a dois codinomes", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(turing.updateUser("nome1", nome(2).address)).to.be.revertedWith(
        "Endereco ja pertence a outro codinome"
      );
    });

    it("cadastra um codinome novo", async function () {
      const { turing } = await loadFixture(deployTuringFixture);
      const novo = ethers.Wallet.createRandom().address;
      await turing.updateUser("nome6", novo);
      expect(await turing.users("nome6")).to.equal(novo);
      expect(await turing.getCodinomes()).to.include("nome6");
    });
  });

  describe("votingOn / votingOff", function () {
    it("desliga e liga a votacao", async function () {
      const { turing } = await loadFixture(deployTuringFixture);

      await expect(turing.votingOff())
        .to.emit(turing, "VotingStatusChanged")
        .withArgs(false);
      expect(await turing.voting()).to.equal(false);

      await expect(turing.votingOn())
        .to.emit(turing, "VotingStatusChanged")
        .withArgs(true);
      expect(await turing.voting()).to.equal(true);
    });
  });

  describe("issueToken", function () {
    it("cria Turings na carteira do codinome", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await expect(turing.issueToken("nome4", T(10))).to.changeTokenBalance(
        turing,
        nome(4),
        T(10)
      );
      expect(await turing.totalSupply()).to.equal(T(10));
    });

    it("falha para codinome nao cadastrado", async function () {
      const { turing } = await loadFixture(deployTuringFixture);
      await expect(turing.issueToken("ninguem", T(1))).to.be.revertedWith(
        "Codinome nao cadastrado"
      );
    });
  });

  describe("vote", function () {
    it("falha se a votacao nao estiver ativa", async function () {
      const { turing, nome } = await loadFixture(deployTuringFixture);
      await turing.votingOff();
      await expect(
        turing.connect(nome(1)).vote("nome2", T(1))
      ).to.be.revertedWith("Votacao nao esta ativa");
    });

    it("falha para quem nao esta na tabela", async function () {
      // O owner (conta #0) nao esta na tabela.
      const { turing } = await loadFixture(deployWithVotingOn);
      await expect(turing.vote("nome2", T(1))).to.be.revertedWith(
        "Usuario nao autorizado"
      );
    });

    it("falha se o usuario votar em si mesmo", async function () {
      const { turing, nome } = await loadFixture(deployWithVotingOn);
      await expect(
        turing.connect(nome(1)).vote("nome1", T(1))
      ).to.be.revertedWith("Nao pode votar em si mesmo");
    });

    it("exige quantidade maior que 0 e no maximo 2 Turings", async function () {
      const { turing, nome } = await loadFixture(deployWithVotingOn);
      const msg = "Quantidade deve ser maior que 0 e no maximo 2 Turings";
      const aluno = turing.connect(nome(1));

      await expect(aluno.vote("nome2", 0)).to.be.revertedWith(msg);
      await expect(aluno.vote("nome2", T(2).add(1))).to.be.revertedWith(msg);
      await expect(aluno.vote("nome2", T(2))).to.changeTokenBalance(
        turing,
        nome(2),
        T(2)
      );
      await expect(aluno.vote("nome3", T("1.5"))).to.changeTokenBalance(
        turing,
        nome(3),
        T("1.5")
      );
    });

    it("so permite um voto por codinome", async function () {
      const { turing, nome } = await loadFixture(deployWithVotingOn);
      const aluno = turing.connect(nome(1));

      await aluno.vote("nome2", T(1));
      expect(await turing.hasVote("nome1", "nome2")).to.equal(true);
      await expect(aluno.vote("nome2", T(1))).to.be.revertedWith(
        "Ja votou neste codinome"
      );
    });

    it("falha para codinome nao cadastrado", async function () {
      const { turing, nome } = await loadFixture(deployWithVotingOn);
      await expect(
        turing.connect(nome(1)).vote("ninguem", T(1))
      ).to.be.revertedWith("Codinome nao cadastrado");
    });

    it("cria Turings para o votado e emite o evento Voted", async function () {
      const { turing, nome } = await loadFixture(deployWithVotingOn);
      await expect(turing.connect(nome(1)).vote("nome2", T(1)))
        .to.emit(turing, "Voted")
        .withArgs("nome1", "nome2", T(1));
      expect(await turing.balanceOf(nome(2).address)).to.equal(T(1));
    });

    it("a professora tambem pode votar", async function () {
      const { turing, nome, professora } = await loadFixture(deployWithVotingOn);
      await expect(
        turing.connect(professora).vote("nome5", T(2))
      ).to.changeTokenBalance(turing, nome(5), T(2));
    });

    it("da 1 Turing ao eleitor a cada 10 votos", async function () {
      const { turing, nome } = await loadFixture(deployWithVotingOn);
      const aluno = turing.connect(nome(1));

      // A tabela so tem 5 alunos; para chegar a 10 votos, o owner cadastra
      // nome6..nome11 com enderecos novos.
      for (let i = 6; i <= 11; i++) {
        await turing.updateUser(`nome${i}`, ethers.Wallet.createRandom().address);
      }

      // 9 votos (em nome2..nome10): ainda sem recompensa.
      for (let i = 2; i <= 10; i++) {
        await aluno.vote(`nome${i}`, T(1));
      }
      expect(await turing.voteCount("nome1")).to.equal(9);
      expect(await turing.balanceOf(nome(1).address)).to.equal(0);

      // 10o voto: o eleitor ganha 1 Turing.
      await expect(aluno.vote("nome11", T(1))).to.changeTokenBalance(
        turing,
        nome(1),
        T(1)
      );
      expect(await turing.voteCount("nome1")).to.equal(10);
    });
  });
});