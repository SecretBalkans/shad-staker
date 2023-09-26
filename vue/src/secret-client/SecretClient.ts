import { MsgExecuteContract, SecretNetworkClient, type Coin } from "secretjs";
import { stkdSCRTContractAddress } from "@/utils/const";
import type { Nullable } from "@/utils/interfaces";

export class SecretClient {
  signer: any;
  client: SecretNetworkClient;
  chainId: string;

  constructor(address: string, signer: any, env: any) {
    this.client = new SecretNetworkClient({
      url: env.apiURL,
      chainId: env.chainId,
      wallet: signer,
      walletAddress: address,
      encryptionUtils: window.keplr.getEnigmaUtils(env.chainId),
    });

    this.chainId = env.chainId;
  }

  /**
   * Query a secret smart contract by address and by passing a msg
   * @param contractAddress string The address of the contract to query
   * @param msg object A JSON object that will be passed to the contract as a query
   * @param codeHash optional for faster resolution
   */
  async querySecretContract<T extends object, R extends any>(contractAddress: string, msg: T, codeHash: string) {
    return await this.client.query.compute.queryContract<T, R>({
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
   * @param waitForCommit
   * @param funds
   */
  async executeSecretContract(
    contractAddress: string,
    msg: any,
    gasPrice = 0.035,
    gasLimit = 350000,
    waitForCommit = true,
    funds = null as Nullable<Coin[]>
  ) {
    const codeHash = await this.client.query.compute.codeHashByContractAddress({
      contract_address: contractAddress,
    });
    return await this.client.tx.broadcast(
      [
        new MsgExecuteContract({
          contract_address: contractAddress,
          code_hash: codeHash.code_hash,
          sender: this.client.address,
          msg,
          sent_funds: funds || [],
        }),
      ],
      {
        waitForCommit,
        gasLimit,
        gasPriceInFeeDenom: gasPrice,
        feeDenom: "uscrt",
      }
    );
  }

  async getSecretViewingKey(contractAddress: string) {
    return await window.keplr.getSecret20ViewingKey(this.chainId, contractAddress);
  }

  async getSecretBalance(contractAddress: string) {
    const codeHash = await this.client.query.compute.codeHashByContractAddress({
      contract_address: contractAddress,
    });

    const viewingKey = await this.getSecretViewingKey(contractAddress);
    const result: any = await this.querySecretContract(
      contractAddress,
      {
        balance: {
          address: this.client.address,
          key: viewingKey,
        },
      },
      codeHash.code_hash ? codeHash.code_hash : "0"
    );
    return result["balance"]["amount"];
  }

  async getSktdSecretInfo() {
    const codeHash = await this.client.query.compute.codeHashByContractAddress({
      contract_address: stkdSCRTContractAddress,
    }); //af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e

    const msgStakingInfo = () => {
      const time = Math.round(new Date().getTime() / 1000);
      return { staking_info: { time } };
    };
    const result: any = await this.querySecretContract(
      stkdSCRTContractAddress,
      msgStakingInfo(),
      // msgStakingInfo,
      codeHash.code_hash ? codeHash.code_hash : "0"
    );
    // return result
    return result;
  }

  async getStakingFees() {
    const msgFees = () => ({ fee_info: {} });
    const codeHash = await this.client.query.compute.codeHashByContractAddress({
      contract_address: stkdSCRTContractAddress,
    });
    const result: any = await this.querySecretContract(stkdSCRTContractAddress, msgFees(), codeHash.code_hash ? codeHash.code_hash : "0");
    return result;
  }

  async getUnbonding() {
    const viewingKey = await this.getSecretViewingKey(stkdSCRTContractAddress);
    const msgUnbonding = () => ({
      unbonding: {
        address: this.client.address,
        key: viewingKey,
      },
    });
    const codeHash = await this.client.query.compute.codeHashByContractAddress({
      contract_address: stkdSCRTContractAddress,
    });
    const result: any = await this.querySecretContract(
      stkdSCRTContractAddress,
      msgUnbonding(),
      codeHash.code_hash ? codeHash.code_hash : "0"
    );
    return result;
  }

  async executeStkdSecretWithdraw(amount: string) {
    const msgUnbond = (amount: string) => ({
      unbond: {
        redeem_amount: amount,
      },
    });
    const result = await this.executeSecretContract(stkdSCRTContractAddress, msgUnbond(amount), 0.1, 250_000);
    return result;
  }

  async executeStkdSecretClaim() {
    const msgClaim = () => ({
      claim: {},
    });
    const result = await this.executeSecretContract(stkdSCRTContractAddress, msgClaim());
    return result;
  }
}

export const useSecretClient = (address: string, signer: any, env: any) => new SecretClient(address, signer, env);
