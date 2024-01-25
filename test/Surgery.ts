import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { keccak256, toHex, fromHex, getAddress } from "viem";

import { exec } from "../utils/exec";
import { get } from "../utils/get";
import { impersonate } from "../utils/impersonate";

const kernelAddr1 = "0x0F3b8eC182DEee2381A9041e30f65f10098A3B91";
const kernelAddr2 = "0xFCdEDC0397603346788b2567fb5E6d9Fd2AEdF4C";
const aclAddr1 = "0xFCb2C44E61031AE29e5c54A700FB6B4FB430dA4C";
const aclAddr2 = "0x89d0A07b792754460Faa49e57437B40aA33FB757";
const jordiAddr = "0x1dba1131000664b884a1ba238464159892252d3a";
const besuRepoAddr = "0x2914045962C6ea7706311D47937Be373b71A6060";
const goerliBesuRepoAddr = "0xf508C8Fc3F121B18794489659a5e2CcC255E9CA2";

const role = "0x0000000000000000000000000000000000000000000000000000000000000001";
const APP_MANAGER_ROLE = keccak256(toHex("APP_MANAGER_ROLE"));
const CREATE_PERMISSIONS_ROLE = keccak256(toHex("CREATE_PERMISSIONS_ROLE"));

describe("Surgery", function () {
  async function deploySurgeryFixture() {
    const [owner, otherAccount] = await hre.viem.getWalletClients();
    const surgery = await hre.viem.deployContract("Surgery");
    const publicClient = await hre.viem.getPublicClient();
    return {
      surgery,
      owner,
      otherAccount,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should set the right bypass", async function () {
      const { surgery } = await loadFixture(deploySurgeryFixture);

      await surgery.write.setBypass([aclAddr1]);

      expect(await surgery.read.getBypass()).to.equal(aclAddr1);

      const aclKernel = await get(aclAddr1, "kernel():(address)", []);

      expect(aclKernel).to.equal(kernelAddr1);
    });

    it("Should work with aragon", async function () {
      const { surgery } = await loadFixture(deploySurgeryFixture);
      const [, newManagerWalletClient] = await hre.viem.getWalletClients();
      const newManagerAddr = getAddress(newManagerWalletClient.account.address);

      // exec $acl1 $setPermissionManagerABI $newManager $kernel1 @id(APP_MANAGER_ROLE) --from $jordi
      // exec $acl2 $setPermissionManagerABI $newManager $kernel2 @id(APP_MANAGER_ROLE) --from $jordi
      // exec $acl1 $setPermissionManagerABI $newManager $acl1 @id(CREATE_PERMISSIONS_ROLE) --from $jordi
      // exec $acl2 $setPermissionManagerABI $newManager $acl2 @id(CREATE_PERMISSIONS_ROLE) --from $jordi        

      await impersonate(jordiAddr);
      await exec(aclAddr1, "setPermissionManager(address,address,bytes32)", [newManagerAddr, kernelAddr1, APP_MANAGER_ROLE], jordiAddr);
      await exec(aclAddr2, "setPermissionManager(address,address,bytes32)", [newManagerAddr, kernelAddr2, APP_MANAGER_ROLE], jordiAddr);
      await exec(aclAddr1, "setPermissionManager(address,address,bytes32)", [newManagerAddr, aclAddr1, CREATE_PERMISSIONS_ROLE], jordiAddr);
      await exec(aclAddr2, "setPermissionManager(address,address,bytes32)", [newManagerAddr, aclAddr2, CREATE_PERMISSIONS_ROLE], jordiAddr);

      // exec $acl1 $grantPermissionABI $newManager $kernel1 @id(APP_MANAGER_ROLE)
      // exec $acl2 $grantPermissionABI $newManager $kernel2 @id(APP_MANAGER_ROLE)
      // exec $acl1 $grantPermissionABI $newManager $acl1 @id(CREATE_PERMISSIONS_ROLE)
      // exec $acl2 $grantPermissionABI $newManager $acl2 @id(CREATE_PERMISSIONS_ROLE)

      await impersonate(newManagerAddr);
      await exec(aclAddr1, "grantPermission(address,address,bytes32)", [newManagerAddr, kernelAddr1, APP_MANAGER_ROLE], newManagerAddr);
      await exec(aclAddr2, "grantPermission(address,address,bytes32)", [newManagerAddr, kernelAddr2, APP_MANAGER_ROLE], newManagerAddr);
      await exec(aclAddr1, "grantPermission(address,address,bytes32)", [newManagerAddr, aclAddr1, CREATE_PERMISSIONS_ROLE], newManagerAddr);
      await exec(aclAddr2, "grantPermission(address,address,bytes32)", [newManagerAddr, aclAddr2, CREATE_PERMISSIONS_ROLE], newManagerAddr);

      // set $baseNamespace @id(base)
      // set $aclAppId @id(acl.aragonpm.eth)
      // exec $kernel1 setApp(bytes32,bytes32,address) $coreNamespace $kernelAppId $surgery
      const baseNamespace = keccak256(toHex("base"));
      const aclAppId = keccak256(toHex("acl.aragonpm.eth"));

      await exec(surgery.address, "setBypass(address)", [aclAddr2], newManagerAddr);
      const prevACLBase = "0x96f041b96708813b1d789606926c524e78543664";
      await exec(kernelAddr1, "setApp(bytes32,bytes32,address)", [baseNamespace, aclAppId, surgery.address], newManagerAddr);

      // Perform a change in the Permission Manager of the Besu Repo
      const slot = fromHex("0x868fb0c687fcce346fe7790b64ddf3e858a500b9839f02ad58166f0c874c1e0c", "bigint");
      const value = fromHex(newManagerAddr, "bigint");
      await exec(aclAddr1, "operate(uint256,uint256)", [slot, value], newManagerAddr);
      await exec(kernelAddr1, "setApp(bytes32,bytes32,address)", [baseNamespace, aclAppId, prevACLBase], newManagerAddr);

      // exec $acl1 $setPermissionManagerABI $newManager $besuRepo $role
      await exec(aclAddr1, "setPermissionManager(address,address,bytes32)", [newManagerAddr, besuRepoAddr, role], newManagerAddr);

      const newPermissionManager = await get(aclAddr1, "getPermissionManager(address,bytes32):(address)", [besuRepoAddr, role]);

      expect(newPermissionManager).to.equal(newManagerAddr);

      // exec $kernel2 setApp(bytes32,bytes32,address) $baseNamespace $aclAppId $surgery
      await exec(kernelAddr2, "setApp(bytes32,bytes32,address)", [baseNamespace, aclAppId, surgery.address], newManagerAddr);
      // set $slot 0xeb60016b99dc728d8e3169c1c27ba4ffe30fcd3160f09589fb5163d9792120df
      // set $value 0x... (newManagerAddr)
      const slot2 = fromHex("0xeb60016b99dc728d8e3169c1c27ba4ffe30fcd3160f09589fb5163d9792120df", "bigint");
      const value2 = fromHex(newManagerAddr, "bigint");
      // exec $acl2 $operateABI $slot $value
      await exec(aclAddr2, "operate(uint256,uint256)", [slot2, value2], newManagerAddr);

      // exec $kernel2 setApp(bytes32,bytes32,address) $baseNamespace $aclAppId $prevACLBase
      await exec(kernelAddr2, "setApp(bytes32,bytes32,address)", [baseNamespace, aclAppId, prevACLBase], newManagerAddr);
      // exec $acl2 $setPermissionManagerABI $newManager $goerliBesuRepo $role
      await exec(aclAddr2, "setPermissionManager(address,address,bytes32)", [newManagerAddr, goerliBesuRepoAddr, role], newManagerAddr);

      const newPermissionManager2 = await get(aclAddr2, "getPermissionManager(address,bytes32):(address)", [goerliBesuRepoAddr, role]);

      expect(newPermissionManager2).to.equal(newManagerAddr);
    });
  });
});
