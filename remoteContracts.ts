import { parseAbi } from "viem";

const kernelAddr1 = "0x0F3b8eC182DEee2381A9041e30f65f10098A3B91";
const kernelAddr2 = "0xFCdEDC0397603346788b2567fb5E6d9Fd2AEdF4C";
const aclAddr1 = "0xFCb2C44E61031AE29e5c54A700FB6B4FB430dA4C";
const aclAddr2 = "0x89d0A07b792754460Faa49e57437B40aA33FB757";

export const aclABI = parseAbi([
    "function grantPermission(address, address, bytes32)",
    "function setPermissionManager(address, address, bytes32)",
    "function getPermissionManager(address, bytes32) view returns (address)",
    "function implementation() view returns (address)",
    "function kernel() view returns (address)",
]);

export const kernelABI = parseAbi([
    "function setApp(bytes32,bytes32,address)",
  ]);

export const remoteContracts = [
    {
        name: "Kernel",
        address: kernelAddr1,
        abi: kernelABI
    },
    {
        name: "Kernel",
        address: kernelAddr2,
        abi: kernelABI
    },
    {
        name: "ACL",
        address: aclAddr1,
        abi: aclABI
    },
    {
        name: "ACL",
        address: aclAddr2,
        abi: aclABI
    }
]