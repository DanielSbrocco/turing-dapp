// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// EXTRA: o Turing e um token ERC-20 (biblioteca OpenZeppelin).
// O ERC-20 ja traz balanceOf, totalSupply, transfer, decimals e o evento Transfer.
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Turing - criptomoeda da disciplina usada para votar nos projetos finais.
 *
 * Estrategia "Uncapped Lazy Supply":
 *   - nenhum token e criado no construtor (sem ICO);
 *   - os Turings sao criados (mint) sob demanda, em issueToken() e vote();
 *   - nao existe limite maximo de emissao.
 *
 * Como e um ERC-20 com 18 casas decimais, 1 Turing = 10**18 unidades.
 * Por isso, 2 Turings = 2 * 10**18 e o frontend converte com parseUnits/formatUnits.
 */
contract Turing is ERC20 {
    // Codinome da professora (da tabela). Ela e superusuaria, junto com o owner.
    string public constant PROFESSORA = "roberta";

    // Conta que fez o deploy do contrato.
    address public owner;

    // Controle de acesso: codinome => endereco do usuario autorizado.
    mapping(string => address) public users;

    // Caminho inverso: endereco => codinome.
    // Usado em vote() para descobrir quem esta votando.
    mapping(address => string) public codinomeOf;

    // Lista de codinomes cadastrados (um mapping nao pode ser percorrido).
    // O frontend usa essa lista para montar os seletores e o ranking.
    string[] private codinomes;

    // Indica se a votacao esta ativa. A especificacao pede que comece em true.
    bool public voting = true;

    // hasVote[eleitor][votado] = true quando o eleitor ja votou naquele codinome.
    mapping(string => mapping(string => bool)) public hasVote;

    // Quantos votos cada codinome ja deu (para a recompensa a cada 10 votos).
    mapping(string => uint256) public voteCount;

    event UserUpdated(string codinome, address userAddr);
    event VotingStatusChanged(bool voting);
    event Voted(string voter, string codinome, uint256 amount);

    // Require que se repete em updateUser, votingOn, votingOff e issueToken.
    modifier onlyOwnerOrProfessora() {
        require(
            msg.sender == owner || msg.sender == users[PROFESSORA],
            "Apenas o owner ou a professora"
        );
        _;
    }

    constructor() ERC20("Turing", "TUR") {
        owner = msg.sender;

        // ------------------------------------------------------------------
        // TABELA EXEMPLO (especificacao da atividade)
        // A conta #0 do `npx hardhat node` e o owner (quem faz o deploy).
        // nome1..nome5 sao as contas #1..#5 do `npx hardhat node`.
        // ------------------------------------------------------------------
        _addUser(PROFESSORA, 0x502542668aF09fa7aea52174b9965A7799343Df7); // roberta
        _addUser("nome1", 0x70997970C51812dc3A010C7d01b50e0d17dc79C8); // conta #1
        _addUser("nome2", 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC); // conta #2
        _addUser("nome3", 0x90F79bf6EB2c4f870365E785982E1f101E93b906); // conta #3
        _addUser("nome4", 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65); // conta #4
        _addUser("nome5", 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc); // conta #5
    }

    // ----------------------------------------------------------------------
    // Funcoes dos superusuarios (owner ou professora)
    // ----------------------------------------------------------------------

    /// Atualiza (ou cadastra) o endereco do usuario `codinome`.
    function updateUser(string memory codinome, address user_addr)
        public
        onlyOwnerOrProfessora
    {
        require(bytes(codinome).length > 0, "Codinome nao pode ser vazio");
        require(user_addr != address(0), "Endereco invalido");
        require(
            bytes(codinomeOf[user_addr]).length == 0 ||
                _equals(codinomeOf[user_addr], codinome),
            "Endereco ja pertence a outro codinome"
        );

        address oldAddr = users[codinome];
        if (oldAddr == address(0)) {
            // Codinome novo: entra na lista.
            codinomes.push(codinome);
        } else {
            // Codinome existente: o endereco antigo deixa de ser autorizado.
            delete codinomeOf[oldAddr];
        }

        users[codinome] = user_addr;
        codinomeOf[user_addr] = codinome;

        emit UserUpdated(codinome, user_addr);
    }

    /// Ativa a votacao.
    function votingOn() public onlyOwnerOrProfessora {
        voting = true;
        emit VotingStatusChanged(true);
    }

    /// Pausa a votacao.
    function votingOff() public onlyOwnerOrProfessora {
        voting = false;
        emit VotingStatusChanged(false);
    }

    /// Cria (mint) `qtde` Turings na carteira do `codinome`.
    function issueToken(string memory codinome, uint256 qtde)
        public
        onlyOwnerOrProfessora
    {
        address to = users[codinome];
        require(to != address(0), "Codinome nao cadastrado");

        _mint(to, qtde);
    }

    // ----------------------------------------------------------------------
    // Votacao (usuarios pre-autorizados)
    // ----------------------------------------------------------------------

    /// Vota em `codinome`, criando (mint) `qtde` Turings para ele.
    /// A cada 10 votos, o eleitor ganha 1 Turing.
    function vote(string memory codinome, uint256 qtde) public {
        require(voting, "Votacao nao esta ativa");

        string memory voter = codinomeOf[msg.sender];
        require(bytes(voter).length > 0, "Usuario nao autorizado");

        address to = users[codinome];
        require(to != address(0), "Codinome nao cadastrado");

        require(!_equals(voter, codinome), "Nao pode votar em si mesmo");

        require(
            qtde > 0 && qtde <= 2 * 10 ** decimals(),
            "Quantidade deve ser maior que 0 e no maximo 2 Turings"
        );

        require(!hasVote[voter][codinome], "Ja votou neste codinome");

        hasVote[voter][codinome] = true;
        _mint(to, qtde);

        voteCount[voter] += 1;
        if (voteCount[voter] % 10 == 0) {
            // Recompensa: 1 Turing a cada 10 votos.
            _mint(msg.sender, 1 * 10 ** decimals());
        }

        emit Voted(voter, codinome, qtde);
    }

    // ----------------------------------------------------------------------
    // Leitura
    // ----------------------------------------------------------------------

    /// Lista de todos os codinomes cadastrados (inclui a professora).
    function getCodinomes() public view returns (string[] memory) {
        return codinomes;
    }

    /// true se `account` e o owner ou a professora.
    function isSuperUser(address account) public view returns (bool) {
        return account == owner || account == users[PROFESSORA];
    }

    // ----------------------------------------------------------------------
    // Auxiliares internas
    // ----------------------------------------------------------------------

    function _addUser(string memory codinome, address userAddr) private {
        users[codinome] = userAddr;
        codinomeOf[userAddr] = codinome;
        codinomes.push(codinome);
    }

    function _equals(string memory a, string memory b)
        private
        pure
        returns (bool)
    {
        return keccak256(bytes(a)) == keccak256(bytes(b));
    }
}