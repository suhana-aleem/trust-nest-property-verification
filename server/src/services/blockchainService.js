const { Web3 } = require("web3");

const CONTRACT_ABI = [
  {
    inputs: [{ internalType: "bytes32", name: "_hash", type: "bytes32" }],
    name: "storeHash",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "_hash", type: "bytes32" }],
    name: "verifyHash",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
];

let web3;
let contract;

const initBlockchain = () => {
  if (!web3) {
    web3 = new Web3(process.env.ETH_RPC_URL);
    contract = new web3.eth.Contract(CONTRACT_ABI, process.env.ETH_CONTRACT_ADDRESS);
  }
};

const storeHashOnChain = async (hashHex) => {
  initBlockchain();
  const account = web3.eth.accounts.privateKeyToAccount(process.env.ETH_PRIVATE_KEY);
  web3.eth.accounts.wallet.add(account);

  const hashBytes32 = `0x${hashHex}`;
  const tx = contract.methods.storeHash(hashBytes32);
  const gas = await tx.estimateGas({ from: account.address });

  let receipt;
  try {
    receipt = await tx.send({
      from: account.address,
      gas
    });
  } catch (error) {
    const msg = String(error?.message || "");
    const mappedError = new Error("Blockchain transaction failed");
    mappedError.statusCode = 502;

    if (msg.toLowerCase().includes("insufficient funds")) {
      mappedError.message = "Insufficient Sepolia ETH in deployer wallet for gas";
      mappedError.statusCode = 400;
    } else if (msg.toLowerCase().includes("only owner")) {
      mappedError.message = "Configured ETH_PRIVATE_KEY is not contract owner";
      mappedError.statusCode = 403;
    } else if (msg.toLowerCase().includes("hash already stored")) {
      mappedError.message = "This hash is already stored on blockchain";
      mappedError.statusCode = 409;
    } else if (msg) {
      mappedError.message = msg;
    }

    throw mappedError;
  }

  return receipt;
};

const verifyHashOnChain = async (hashHex) => {
  initBlockchain();
  const hashBytes32 = `0x${hashHex}`;
  return contract.methods.verifyHash(hashBytes32).call();
};

module.exports = {
  CONTRACT_ABI,
  storeHashOnChain,
  verifyHashOnChain
};
