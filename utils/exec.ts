import hre from 'hardhat'
import { encodeFunctionData, parseAbiItem } from 'viem'

export async function exec(target: `0x${string}`, functionSignature: string, args: any[], from: `0x${string}`) {
  const walletClient = await hre.viem.getWalletClient(from);
  const abiItem = parseAbiItem(`function ${functionSignature} external`)
  const data = encodeFunctionData({
    abi : [abiItem],
    args
  })
  const tx = await walletClient.sendTransaction({
    to: target,
    data
  })
  return tx
}