import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "hardhat-gas-reporter";
import { remoteContracts } from "./remoteContracts";

const config: HardhatUserConfig = {
  solidity: "0.8.23",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/m7LQXXlgaZzKkpLI44JFHtWxHKXtHIpl",
        blockNumber: 19077000,
      }
    }
  },
  gasReporter: {
    gasPrice: 100,
    enabled: true,
    maxMethodDiff: 25,
    remoteContracts,
    showMethodSig: true,
  },
};

export default config;
