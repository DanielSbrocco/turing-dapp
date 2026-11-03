// Faz o deploy do contrato Turing e copia o ABI e o endereco para o frontend.
// Uso: npx hardhat run scripts/deploy.js --network localhost

const path = require("path");
const fs = require("fs");

async function main() {
  if (network.name === "hardhat") {
    console.warn(
      "Voce esta fazendo deploy na Hardhat Network embutida, que e apagada " +
        "ao final do comando. Use a opcao '--network localhost'."
    );
  }

  // A conta #0 do `npx hardhat node` faz o deploy e vira o owner.
  const [deployer] = await ethers.getSigners();
  console.log("Deploy feito pela conta (owner):", deployer.address);

  const Turing = await ethers.getContractFactory("Turing");
  const turing = await Turing.deploy();
  await turing.deployed();

  console.log("Endereco do contrato Turing:", turing.address);

  saveFrontendFiles(turing);
}

function saveFrontendFiles(turing) {
  const contractsDir = path.join(__dirname, "..", "frontend", "src", "contracts");

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(contractsDir, "contract-address.json"),
    JSON.stringify({ Turing: turing.address }, undefined, 2)
  );

  const TuringArtifact = artifacts.readArtifactSync("Turing");

  fs.writeFileSync(
    path.join(contractsDir, "Turing.json"),
    JSON.stringify(TuringArtifact, null, 2)
  );

  console.log("ABI e endereco salvos em frontend/src/contracts/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
