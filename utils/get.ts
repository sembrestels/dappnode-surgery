import hre from 'hardhat'
import { encodeFunctionData, decodeFunctionResult, parseAbiItem } from 'viem'

export async function get(target: `0x${string}`, functionSignatureAndReturns: string, args: any[]) {
  const [functionSignature, returns] = functionSignatureAndReturns.split(':')
  const publicClient = await hre.viem.getPublicClient();
  const abiItem = parseAbiItem(`function ${functionSignature} external view returns ${returns}`)
  const data = encodeFunctionData({
    abi : [abiItem],
    args
  })
  const tx = await publicClient.call({
    to: target,
    data
  })
  if (!tx.data) {
    return
  }
    const result = decodeFunctionResult({
        abi: [abiItem],
        data: tx.data,
    })
  return result
}