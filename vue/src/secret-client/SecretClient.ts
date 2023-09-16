import { SecretNetworkClient, MsgExecuteContract } from "secretjs";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

while (
  !window.keplr ||
  !window.getEnigmaUtils ||
  !window.getOfflineSignerOnlyAmino
) {
  await sleep(50);
}

const CHAIN_ID = "secret-4";

await window.keplr.enable(CHAIN_ID);

const keplrOfflineSigner = window.keplr.getOfflineSignerOnlyAmino(CHAIN_ID);
const [{ address: myAddress }] = await keplrOfflineSigner.getAccounts();

const url = "https://secretnetwork-api.lavenderfive.com:443"//"https://rpc.cosmos.directory/secretnetwork";

const client = new SecretNetworkClient({
  url,
  chainId: CHAIN_ID,
  wallet: keplrOfflineSigner,
  walletAddress: myAddress,
  encryptionUtils: window.keplr.getEnigmaUtils(CHAIN_ID),
});

// Note: Using `window.getEnigmaUtils` is optional, it will allow
// Keplr to use the same encryption seed across sessions for the account.
// The benefit of this is that `secretjs.query.getTx()` will be able to decrypt
// the response across sessions.

/**
 * Query a secret smart contract by address and by passing a msg
 * @param contractAddress string The address of the contract to query
 * @param msg object A JSON object that will be passed to the contract as a query
 * @param codeHash optional for faster resolution
 */
export async function querySecretContract<T extends object, R extends any>(contractAddress: string, msg: T, codeHash: string) {
    return await client.query.compute.queryContract<T, R>({
      code_hash: codeHash,
      contract_address: contractAddress,
      query: msg,
    });
}

  /**
   * Broadcast a handle/execute tx/msg to a secret smart contract by address, wait for execution and return result.
   * @param contractAddress The address of the contract to submit a tx to
   * @param msg A JSON object that will be passed to the contract as a handle msg
   * @param gasPrice
   * @param gasLimit
   */
export async function executeSecretContract(contractAddress: string, msg: any, codeHash: string, gasPrice = 0.015, gasLimit = 1700000, waitForCommit = true) {
    return await client.tx.broadcast([new MsgExecuteContract({
      contract_address: contractAddress,
      code_hash: codeHash,
      sender: client.address,
      msg,
    })], {
      waitForCommit,
      gasLimit,
      gasPriceInFeeDenom: gasPrice,
      feeDenom: 'uscrt',
    });
}

//stkd secret functions
const stkdSecretAddress = "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4"

async function getStkdSecretViewingKey() {
    const result = await window.keplr.getSecret20ViewingKey(CHAIN_ID, stkdSecretAddress)
    console.log("Stkd secret viewing key: ", result)
    return result
}

export async function getStkdSecretBalance() {
    console.log("Inside get stkd secret balance...")
    console.log("Secret client: ", client)

    const codeHash = await client.query.compute.codeHashByContractAddress({
        contract_address: stkdSecretAddress
    })
    console.log("Code hash of stkdSecret contract: ", codeHash)

    const viewingKey = await getStkdSecretViewingKey()
    console.log("Viewing key: ", viewingKey)

    console.log("Sender address: ", client.address)
    const result: any = await querySecretContract(
        stkdSecretAddress,
        {
            balance: {
                address: client.address,
                key: viewingKey,
            }
        },
        codeHash.code_hash ? codeHash.code_hash : '0'
    )
    console.log("Result of get balance: ", result['balance']['amount'])
    return result['balance']['amount']
}