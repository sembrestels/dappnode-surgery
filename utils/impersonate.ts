import hre from 'hardhat'
import { parseEther } from 'viem'

export async function impersonate(address: `0x${string}`) {
    const testClient = await hre.viem.getTestClient();
    await testClient.setBalance({ 
      address,
      value: parseEther('1')
    })
    await testClient.impersonateAccount({ 
      address,
    });
  }
