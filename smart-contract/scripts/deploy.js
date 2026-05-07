const fs = require("fs");
const path = require("path");

async function main() {
  const Factory = await hre.ethers.getContractFactory("DocumentHashRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("DocumentHashRegistry deployed at:", address);

  const outPath = path.join(__dirname, "..", "deployment.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        network: hre.network.name,
        contract: "DocumentHashRegistry",
        address
      },
      null,
      2
    )
  );
  console.log("Deployment details saved to:", outPath);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
