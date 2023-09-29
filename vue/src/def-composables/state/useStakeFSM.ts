import { assign, createMachine } from "xstate";
import { useDenom } from "@/def-composables/useDenom";
import BigNumber from "bignumber.js";
import { useWalletStore } from "@/stores/useWalletStore";
import { MsgTransfer } from "example-client-ts/ibc.applications.transfer.v1/types/ibc/applications/transfer/v1/tx";
import { useAssets } from "@/def-composables/useAssets";
import { scrtDenomOsmosis, sSCRTContractAddress, stkdSCRTContractAddress } from "@/utils/const";
import type { BalanceAmount } from "@/utils/interfaces";
import { envOsmosis, envSecret } from "@/env";
import { BroadcastTxError, SigningStargateClient, TimeoutError } from "@cosmjs/stargate";
import { Registry } from "@cosmjs/proto-signing";
import { TxRaw } from "example-client-ts/cosmos.tx.v1beta1";
import type { TxResponse } from "secretjs";
import { Service as TxService } from "secretjs/src/grpc_gateway/cosmos/tx/v1beta1/service.pb";
import type { TxResponse as TxResponsePb } from "secretjs/src/grpc_gateway/cosmos/base/abci/v1beta1/abci.pb";
import type { Tx as TxPb } from "secretjs/src/grpc_gateway/cosmos/tx/v1beta1/tx.pb";
import { fromBase64, fromHex, fromUtf8 } from "@cosmjs/encoding";
import { TxMsgData } from "secretjs/src/protobuf/cosmos/base/abci/v1beta1/abci";
import { MsgExecuteContractResponse, MsgInstantiateContractResponse } from "secretjs/src/protobuf/secret/compute/v1beta1/msg";
import type { AnyJson, ArrayLog, JsonLog } from "secretjs/src/secret_network_client";
import type { V1Beta1TxResponse } from "example-client-ts/cosmos.tx.v1beta1/rest";
import { useStkdScrtSwapPoolData } from "@/def-composables/useStkdScrtSwapPoolData";
import { MsgExecuteContract } from "secretjs";

function getTimeoutTimestamp() {
  const timeoutInMinutes = 15;
  const timeoutTimestampInSeconds = Math.floor(new Date().getTime() / 1000 + 60 * timeoutInMinutes);
  const timeoutTimestampNanoseconds = BigNumber(timeoutTimestampInSeconds).multipliedBy(1_000_000_000);

  return timeoutTimestampNanoseconds.toNumber();
}

const IBCTxGasStakeGas = "" + 350_000;
const secretGasPrice = 0.1;

async function broadcast(message: string | Uint8Array | any, task: any): Promise<string> {
  const walletStore = useWalletStore();
  let retries = 8;
  let waitTime = 150;
  const MAX_WAIT_TIME = 3000;
  let client;
  let lastErr: Error;

  do {
    try {
      if (typeof message === "string") {
        const response: TxResponse = await walletStore.secretJsClient!.broadcastSignedMessage(message);
        return response.transactionHash;
      } else {
        const activeClient = walletStore.activeClients[task.chainId];
        client =
          client ||
          (await SigningStargateClient.connectWithSigner(activeClient.env.rpcURL, activeClient.signer!, {
            registry: new Registry(activeClient.registry),
            prefix: activeClient.env.prefix,
          }));
        // deserialized message is { 0:...,1:..}
        if (!(message instanceof Uint8Array)) {
          const array: number[] = [];
          Object.values(message).forEach((val: any) => array.push(+val));
          message = Uint8Array.from(array);
        }
        const response = await client.broadcastTx(message, 0, 1000); // will never poll
        return response.transactionHash;
      }
    } catch (e: any) {
      if (e instanceof TimeoutError) {
        return e.txId;
      } else if (e instanceof BroadcastTxError) {
        throw new Error(`Error broadcasting tx. code: ${e.code}/ log: ${e.log}`);
      } else {
        if (!e.message.includes("fetch")) {
          // continue on fetch errors with exponential back-off retry
          throw e;
        }
        lastErr = e;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(MAX_WAIT_TIME, (waitTime *= 2))));
  } while (retries-- > 0);
  throw lastErr;
}

async function ibcFn(task: any): Promise<Uint8Array> {
  const walletStore = useWalletStore();
  const activeClient = walletStore.activeClients[task.chainId];
  const client = await SigningStargateClient.connectWithSigner(activeClient.env.rpcURL, activeClient.signer!, {
    registry: new Registry(activeClient.registry),
    prefix: activeClient.env.prefix,
  });
  const txRaw = await client.sign(
    walletStore.addresses[task.chainId],
    [
      {
        typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
        value: MsgTransfer.fromPartial({
          sourcePort: "transfer",
          sourceChannel: useDenom(task.denom, task.chainId).path.value.split("/")[1],
          sender: walletStore.addresses[task.chainId],
          receiver: walletStore.secretAddress,
          token: {
            denom: task.denom,
            amount: BigNumber(task.amount)
              .multipliedBy(10 ** 6)
              .toString(),
          },
          // Nanoseconds
          timeoutTimestamp: getTimeoutTimestamp(),
        }),
      },
    ],
    {
      gas: IBCTxGasStakeGas,
      amount: [
        {
          denom: "uosmo",
          amount: BigNumber(0.005)
            .multipliedBy(10 ** 6)
            .toFixed(0),
        },
      ],
    },
    ""
  );
  return TxRaw.encode(txRaw).finish();
}

async function waitTxComplete(txHash: string, task: any) {
  const store = useWalletStore();
  const enigmaUtils = window.keplr.getEnigmaUtils(envSecret.chainId);
  let timeout = task.wait.waitSec;
  let data;
  do {
    try {
      const txQueryResult = await store.activeClients[task.chainId].CosmosTxV1Beta1.query.serviceGetTx(txHash);
      data = txQueryResult.data;
      if (data) {
        break;
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
    await new Promise((resolve) => setTimeout(resolve, 2500));
  } while (--timeout > 0);
  const response = data?.tx_response;
  if (!response || response?.code) {
    return {
      success: false,
      timeout: !response ? `No tx response in ${task.wait.waitSec} seconds` : null,
      tx: response,
    };
  }
  if (task.chainId !== task.wait.chainId) {
    console.log("IBC", response.logs);
    const channel: any = (data?.tx?.body?.messages?.[0] as any)?.source_channel;
    const packetSequence: any = response.logs?.[0]?.events
      ?.find((ev: any) => ev?.type === "send_packet")
      ?.attributes?.find((a: any) => a.key === "packet_sequence")?.value;
    const isDoneObject = { isDone: false };
    const result = await Promise.race([
      waitForIbcResponse("acknowledge", packetSequence, channel, enigmaUtils, isDoneObject),
      waitForIbcResponse("timeout", packetSequence, channel, enigmaUtils, isDoneObject),
    ]);
    return {
      timeout: result?.type === "timeout" ? `Timeout IBC transaction: ${task.wait.waitSec}sec` : null,
      success: result?.type === "acknowledge",
      tx: result?.tx,
    };
  } else {
    const tx = await decodeTxResponse(response as any, enigmaUtils);
    return {
      success: !tx.code,
      tx,
    };
  }
}

async function decodeTxResponse(txResp: TxResponsePb, enigmaUtils: any): Promise<TxResponse> {
  const nonces: any = [];

  const tx = txResp.tx as TxPb;

  // Decoded input tx messages
  for (let i = 0; !isNaN(Number(tx?.body?.messages?.length)) && i < Number(tx?.body?.messages?.length); i++) {
    const msg: AnyJson = tx.body!.messages![i];

    // Check if the message needs decryption
    let contractInputMsgFieldName = "";
    if (msg["@type"] === "/secret.compute.v1beta1.MsgInstantiateContract") {
      contractInputMsgFieldName = "init_msg";
    } else if (msg["@type"] === "/secret.compute.v1beta1.MsgExecuteContract") {
      contractInputMsgFieldName = "msg";
    }

    if (contractInputMsgFieldName !== "") {
      // Encrypted, try to decrypt
      try {
        const contractInputMsgBytes = fromBase64(msg[contractInputMsgFieldName]);

        const nonce = contractInputMsgBytes.slice(0, 32);
        const ciphertext = contractInputMsgBytes.slice(64);

        const plaintext = await enigmaUtils.decrypt(ciphertext, nonce);
        msg[contractInputMsgFieldName] = JSON.parse(
          fromUtf8(plaintext).slice(64) // first 64 chars is the codeHash as a hex string
        );

        nonces[i] = nonce; // Fill nonces array to later use it in output decryption
      } catch (decryptionError) {
        // Not encrypted or can't decrypt because not original sender
      }
    }

    tx.body!.messages![i] = msg;
  }

  let rawLog: string = txResp.raw_log!;
  let jsonLog: JsonLog | undefined;
  let arrayLog: ArrayLog | undefined;
  if (txResp.code === 0 && rawLog !== "") {
    jsonLog = JSON.parse(rawLog) as JsonLog;

    arrayLog = [];
    for (let msgIndex = 0; msgIndex < jsonLog.length; msgIndex++) {
      if (jsonLog[msgIndex].msg_index === undefined) {
        jsonLog[msgIndex].msg_index = msgIndex;
        // See https://github.com/cosmos/cosmos-sdk/pull/11147
      }

      const log = jsonLog[msgIndex];
      for (const event of log.events) {
        for (const attr of event.attributes) {
          // Try to decrypt
          if (event.type === "wasm") {
            const nonce = nonces[msgIndex];
            if (nonce && nonce.length === 32) {
              try {
                attr.key = fromUtf8(await enigmaUtils.decrypt(fromBase64(attr.key), nonce)).trim();
                // eslint-disable-next-line no-empty
              } catch (e) {}
              try {
                attr.value = fromUtf8(await enigmaUtils.decrypt(fromBase64(attr.value), nonce)).trim();
                // eslint-disable-next-line no-empty
              } catch (e) {}
            }
          }

          arrayLog.push({
            msg: msgIndex,
            type: event.type,
            key: attr.key,
            value: attr.value,
          });
        }
      }
    }
  } else if (txResp.code !== 0 && rawLog !== "") {
    try {
      const errorMessageRgx = /; message index: (\d+):.+?encrypted: (.+?): (?:instantiate|execute|query|reply to) contract failed/;
      const rgxMatches = errorMessageRgx.exec(rawLog);
      if (rgxMatches?.length === 3) {
        const encryptedError = fromBase64(rgxMatches[2]);
        const msgIndex = Number(rgxMatches[1]);

        const decryptedBase64Error = await enigmaUtils.decrypt(encryptedError, nonces[msgIndex]);

        const decryptedError = fromUtf8(decryptedBase64Error);

        rawLog = rawLog.replace(`encrypted: ${rgxMatches[2]}`, decryptedError);

        try {
          jsonLog = JSON.parse(decryptedError);
          // eslint-disable-next-line no-empty
        } catch (e) {}
      }
    } catch (decryptionError) {
      // Not encrypted or can't decrypt because not original sender
    }
  }

  const txMsgData = TxMsgData.decode(fromHex(txResp.data!));
  const data = new Array<Uint8Array>(txMsgData.data.length);

  for (let msgIndex = 0; msgIndex < txMsgData.data.length; msgIndex++) {
    data[msgIndex] = txMsgData.data[msgIndex].data;

    const nonce = nonces[msgIndex];
    if (nonce && nonce.length === 32) {
      // Check if the output data needs decryption

      try {
        const { "@type": type_url } = tx.body!.messages![msgIndex] as AnyJson;

        if (type_url === "/secret.compute.v1beta1.MsgInstantiateContract") {
          const decoded = MsgInstantiateContractResponse.decode(txMsgData.data[msgIndex].data);
          const decrypted = fromBase64(fromUtf8(await enigmaUtils.decrypt(decoded.data, nonce)));
          data[msgIndex] = MsgInstantiateContractResponse.encode({
            address: decoded.address,
            data: decrypted,
          }).finish();
        } else if (type_url === "/secret.compute.v1beta1.MsgExecuteContract") {
          const decoded = MsgExecuteContractResponse.decode(txMsgData.data[msgIndex].data);
          const decrypted = fromBase64(fromUtf8(await enigmaUtils.decrypt(decoded.data, nonce)));
          data[msgIndex] = MsgExecuteContractResponse.encode({
            data: decrypted,
          }).finish();
        }
      } catch (decryptionError) {
        // Not encrypted or can't decrypt because not original sender
      }
    }
  }

  return {
    height: Number(txResp.height),
    timestamp: txResp.timestamp!,
    transactionHash: txResp.txhash!,
    code: txResp.code!,
    codespace: txResp.codespace!,
    info: txResp.info!,
    tx,
    rawLog,
    jsonLog,
    arrayLog,
    events: txResp.events!,
    data,
    gasUsed: Number(txResp.gas_used),
    gasWanted: Number(txResp.gas_wanted),
    ibcResponses: [],
  };
}
async function waitForIbcResponse(
  txType: any,
  packetSequence: any,
  packetSrcChannel: any,
  enigmaUtils: any,
  isDoneObject: { isDone: boolean }
) {
  // an IBC transfer
  const query = [`${txType}_packet.packet_src_channel='${packetSrcChannel}'`, `${txType}_packet.packet_sequence='${packetSequence}'`];
  let tries = 120;
  while (tries > 0 && !isDoneObject.isDone) {
    try {
      const { tx_responses } = await TxService.GetTxsEvent(
        {
          events: query,
        },
        {
          pathPrefix: envOsmosis.apiURL,
        }
      );
      const txs = await decodeTxResponses(tx_responses || [], enigmaUtils);
      const ibcRespTx = txs.find((tx) => tx.code === 0);

      if (ibcRespTx) {
        isDoneObject.isDone = true;
        return {
          type: txType,
          tx: ibcRespTx,
        };
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}

    tries--;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

async function decodeTxResponses(txResponses: TxResponsePb[], enigmaUtils: any): Promise<TxResponse[]> {
  return await Promise.all(txResponses.map((x) => decodeTxResponse(x, enigmaUtils)));
}

async function balanceWaitTask(startAmount: any, task: any) {
  const { balances } = useAssets();
  let totalDiff = BigNumber(0);
  let prevAmount = startAmount;
  const isWatchingReduction = BigNumber(task.amount).isNegative();
  let timeout = task.waitSec * 10;
  do {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const currentAmount = balances.value.assets.find((x: any) => x.denom === task.denom)?.amount;
    if (!Number.isNaN(+currentAmount)) {
      const diff = BigNumber(currentAmount).minus(prevAmount);
      prevAmount = currentAmount;
      if (diff[isWatchingReduction ? `isNegative` : `isPositive`]()) {
        totalDiff = BigNumber(totalDiff).plus(diff);
      }
    }
    timeout--;
    if (timeout === 0) {
      throw new Error("Balance Change Timeout");
    }
  } while (
    Number.isNaN(totalDiff.toNumber()) ||
    BigNumber(task.amount)[`${isWatchingReduction ? "isLessThan" : "isGreaterThan"}`](totalDiff)
  );
  return totalDiff.toNumber();
}

async function unwrapFn(task: any): Promise<string> {
  const walletStore = useWalletStore();
  return await walletStore.secretJsClient!.signContractCall(
    task.secretAddress,
    {
      redeem: {
        amount: BigNumber(task.amount)
          .multipliedBy(10 ** 6)
          .toFixed(0),
        denom: task.denom,
      },
    },
    secretGasPrice,
    60_000
  );
}

async function stakeFn(task: any): Promise<string> {
  const walletStore = useWalletStore();
  const stakeOp = task.ops.find((d: any) => d.tx === "stake");
  const unwrapOp = task.ops.find((d: any) => d.tx === "unwrap");
  const swapOp = task.ops.find((d: any) => d.tx === "swap");
  const wrapOp = task.ops.find((d: any) => d.tx === "wrap");
  const swapMsgs: any[] = [];
  const unwrapMsgs: any[] = [];
  let gas = 0;
  const sSCRTCodeHash = await walletStore.secretJsClient!.getCodeHash(sSCRTContractAddress);
  if (swapOp) {
    const rawMsg = JSON.stringify({
      swap_tokens_for_exact: {
        expected_return: BigNumber(swapOp.minReceive).toFixed(6),
        path: [
          {
            addr: "secret1y6w45fwg9ln9pxd6qys8ltjlntu9xa4f2de7sp",
            code_hash: "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2",
          },
        ],
      },
    });
    const swapAmountString = BigNumber(swapOp.amount)
      .multipliedBy(10 ** 6)
      .toFixed(0);
    const msg = {
      send: {
        recipient: "secret1pjhdug87nxzv0esxasmeyfsucaj98pw4334wyc",
        recipient_code_hash: "448e3f6d801e453e838b7a5fbaa4dd93b84d0f1011245f0d5745366dadaf3e85",
        amount: swapAmountString,
        msg: btoa(rawMsg),
        // TODO: padding calculation
        padding: "u3a9nScQ",
      },
    };
    if (wrapOp) {
      swapMsgs.push(
        new MsgExecuteContract({
          contract_address: sSCRTContractAddress,
          sender: walletStore.secretAddress!,
          code_hash: sSCRTCodeHash,
          msg: {
            deposit: {},
          },
          sent_funds: [
            {
              amount: BigNumber(wrapOp.amount)
                .times(10 ** 6)
                .toFixed(0),
              denom: "uscrt",
            },
          ],
        })
      );
      gas += 60_000;
    }
    gas += 2_275_000;
    swapMsgs.push(
      new MsgExecuteContract({
        contract_address: sSCRTContractAddress,
        code_hash: sSCRTCodeHash!,
        sender: walletStore.secretAddress!,
        msg,
      })
    );
  }
  if (unwrapOp) {
    gas += 60_000;
    unwrapMsgs.push(
      new MsgExecuteContract({
        contract_address: sSCRTContractAddress,
        sender: walletStore.secretAddress!,
        code_hash: sSCRTCodeHash,
        msg: {
          redeem: {
            amount: BigNumber(unwrapOp.amount)
              .multipliedBy(10 ** 6)
              .toFixed(0),
            denom: "uscrt",
          },
        },
      })
    );
  }
  gas += +IBCTxGasStakeGas;
  return await walletStore.secretJsClient!.signContractCall(
    stkdSCRTContractAddress,
    stakeOp && {
      stake: {},
    },
    secretGasPrice,
    gas,
    stakeOp && [
      {
        amount: BigNumber(stakeOp.amount)
          .multipliedBy(10 ** 6)
          .toFixed(0),
        denom: "uscrt",
      },
    ],
    [...unwrapMsgs, ...swapMsgs]
  );
}

function addJobStateData(context: any, contextTaskKey: string, eventType: string, eventData: any) {
  return {
    ...context.jobStates,
    [contextTaskKey]: {
      ...context.jobStates[contextTaskKey],
      ...eventData,
      type: eventType,
    },
  };
}

function txMachine(contextTaskKey: string, taskFn: (task: any) => Promise<string | Uint8Array>) {
  return {
    initial: "check",
    states: {
      check: {
        always: [
          {
            target: "signing",
            cond: (context: any) => !!context.tasks[contextTaskKey],
          },
          {
            target: "skipped",
            cond: (context: any) => !context.tasks[contextTaskKey],
          },
        ],
      },
      skipped: {
        type: "final" as "final",
      },
      signing: {
        invoke: {
          src: (context: any) => taskFn(context.tasks[contextTaskKey]),
          onDone: {
            target: "initialBalance",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "signed", {
                    txSigned: event.data,
                  }),
              }),
            ],
          },
          onError: {
            target: "failure",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "signing", {
                    error: event.data?.message || event.data,
                  }),
              }),
            ],
          },
        },
      },
      initialBalance: {
        invoke: {
          src: (context: any) => balanceWaitTask(0, { ...context.tasks[contextTaskKey].wait, amount: 0 }),
          onDone: {
            target: "broadcast",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "initialBalance", {
                    startAmount: event.data,
                  }),
              }),
            ],
          },
          onError: {
            target: "failure",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "initialBalance", {
                    error: event.data?.message || event.data,
                  }),
              }),
            ],
          },
        },
      },
      broadcast: {
        invoke: {
          src: (context: any) => broadcast(context.jobStates[contextTaskKey].txSigned, context.tasks[contextTaskKey]),
          onDone: {
            target: "txWait",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "txBroadcast", {
                    txHash: event.data,
                    txSigned: "<discarded>",
                  }),
              }),
            ],
          },
          onError: {
            target: "failure",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "txBroadcast", {
                    error: event.data?.message || event.data,
                  }),
              }),
            ],
          },
        },
      },
      txWait: {
        invoke: {
          src: (context: any) =>
            waitTxComplete(context.jobStates[contextTaskKey].txHash, context.tasks[contextTaskKey]).then((d) => {
              if (d.success) {
                return d.tx;
              } else {
                throw new Error(d.timeout ? d.timeout : (d.tx as V1Beta1TxResponse)?.raw_log || (d.tx as TxResponse)?.rawLog);
              }
            }),
          onDone: {
            target: "success",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "txWait", {
                    finished: true,
                    result: event.tx,
                  }),
              }),
            ],
          },
          onError: {
            target: "failure",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "txWait", {
                    error: event.data?.message || event.data,
                  }),
              }),
            ],
          },
        },
      },
      success: {
        type: "final" as "final",
        entry: [
          assign({
            jobStates: (context: any) =>
              addJobStateData(context, contextTaskKey, "finished", {
                finished: true,
              }),
          }),
        ],
      },
      failure: {
        type: "final" as "final",
        entry: [
          assign({
            jobStates: (context: any) => addJobStateData(context, contextTaskKey, "error", {}),
          }),
        ],
      },
    },
  };
}

function getContext() {
  return {
    tasks: {
      ibc: null,
      unwrap: null,
      base: null,
      stake: null,
    },
    jobStates: {
      ibc: { type: "", error: null },
      unwrap: { type: "", error: null },
      stake: { type: "", error: null },
    },
  };
}

export const useStakeFSM = () => {
  return createMachine(
    {
      id: "moveAndStake",
      predictableActionArguments: true,
      initial: "idle",
      context: getContext(),
      on: {
        RESET: {
          target: "idle",
          actions: [assign(() => getContext())],
        },
      },
      states: {
        idle: {
          on: {
            INIT: {
              actions: [
                assign((context, event: any) => ({
                  ...context,
                  tasks: createTasks(event.amounts, event.price, event.swapLimit),
                  jobStates: { ibc: { type: "", error: null }, unwrap: { type: "", error: null }, stake: { type: "", error: null } },
                })),
              ],
            },
            START: [
              {
                target: ["working.stake", "working.unwrap", "working.ibc"],
              },
            ],
          },
        },
        working: {
          type: "parallel",
          states: {
            stake: {
              initial: "waitAll",
              states: {
                waitAll: {
                  always: [
                    {
                      cond: "areAllTxFinished",
                      target: "staking",
                    },
                    {
                      cond: "isSomeTxFail",
                      target: "failure",
                    },
                  ],
                },
                staking: {
                  ...txMachine("stake", stakeFn),
                  onDone: "success",
                },
                success: {
                  type: "final" as "final",
                },
                failure: {
                  type: "final" as "final",
                  entry: [
                    assign({
                      jobStates: (context: any, event: any) => {
                        return {
                          ...context.jobStates,
                          stake: {
                            type: "error",
                            error: event.data?.message || event.data,
                          },
                        };
                      },
                    }),
                  ],
                },
              },
            },
            unwrap: txMachine("unwrap", unwrapFn),
            ibc: txMachine("ibc", ibcFn),
          },
          onDone: [
            {
              cond: "isSomeTxFail",
              target: "#failure",
            },
            {
              cond: (context, event) => {
                return !context.jobStates.stake.error;
              },
              target: "#success",
            },
            {
              cond: (context, event) => {
                return !!context.jobStates.stake.error;
              },
              target: "#failure",
            },
          ],
        },
        success: {
          id: "success",
        },
        failure: {
          id: "failure",
        },
      },
    },
    {
      guards: {
        areAllTxFinished: (context) => {
          return (
            (!context.tasks.ibc || (context.tasks.ibc && context.jobStates.ibc?.type === "finished")) &&
            (!context.tasks.unwrap || (context.tasks.unwrap && context.jobStates.unwrap?.type === "finished"))
          );
        },
        isSomeTxFail: (context) => {
          return !!context.jobStates.ibc?.error || !!context.jobStates.unwrap?.error;
        },
      },
    }
  );
};

const id = (i: BalanceAmount) => i;

const stake = (b: BalanceAmount, price: any, swapLimit: number) => {
  let ops;
  let stkdSCRTExpected;
  let ratio = 0;
  const swapFn = useStkdScrtSwapPoolData().swapSCRT;
  if (BigNumber(b.amount).isGreaterThan(swapLimit)) {
    const step = 1 / 7;
    const max = 1;
    let bestLimitRatio = 0;
    let bestOutcome: BigNumber | null = null;
    for (let i = 0; i < max / step; i++) {
      const currentRatio = i * step;
      const swapChoice = swapLimit * currentRatio;
      const stakeAmount = BigNumber(BigNumber(b.amount).toFixed(6)).minus(swapChoice);
      const expectedResult = BigNumber(stakeAmount)
        .dividedBy(+price / 10 ** 6)
        .multipliedBy(1 - 0.2 / 100)
        .plus(swapFn(BigNumber(swapChoice)));
      const outcome = BigNumber(b.amount).dividedBy(expectedResult);
      const diff = BigNumber(outcome).minus(price / 10 ** 6);
      if (!diff.isNaN() && (!bestOutcome || diff.isLessThan(bestOutcome))) {
        bestLimitRatio = currentRatio;
        bestOutcome = diff;
      } else if (!diff.isNaN()) {
        break;
      }
    }
    const swapChoice = swapLimit * bestLimitRatio;
    const stakeChoice = BigNumber(BigNumber(b.amount).toFixed(6)).minus(swapChoice);
    ops = [
      {
        tx: "swap",
        amount: BigNumber(swapChoice).toFixed(6),
        slippage: bestOutcome,
        minReceive: BigNumber(swapChoice)
          .dividedBy(+price / 10 ** 6)
          .multipliedBy(1 - 0.2 / 100),
      },
      { tx: "stake", amount: stakeChoice.toFixed(6) },
    ];
    ratio = BigNumber(swapChoice).dividedBy(b.amount).toNumber();
    stkdSCRTExpected = swapFn(swapChoice)
      .plus(stakeChoice.dividedBy(+price / 10 ** 6).multipliedBy(1 - 0.2 / 100))
      .toFixed(6);
  } else if (swapLimit > 0) {
    ratio = 1;
    stkdSCRTExpected = BigNumber(b.amount).toFixed(6);
    ops = [{ tx: "swap", amount: BigNumber(b.amount).toFixed(6) }];
  } else {
    ratio = 0;
    stkdSCRTExpected = BigNumber(b.amount)
      .dividedBy(+price / 10 ** 6)
      .multipliedBy(1 - 0.2 / 100);
    ops = [{ tx: "stake", amount: b.amount }];
  }
  return {
    denom: "uscrt",
    txName: "stake",
    amount: b.amount,
    ops,
    ratio,
    icon: "scrt.svg",
    stakable: true,
    chainId: envSecret.chainId,
    unstakable: false,
    wait: {
      denom: "stkd-SCRT",
      icon: "stkd-scrt-logo.svg",
      chainId: envSecret.chainId,
      waitSec: 40,
      secretAddress: stkdSCRTContractAddress,
      amount: stkdSCRTExpected,
    },
  };
};
const ibc = (b: any) => ({
  ...b,
  txName: "ibc",
  denom: scrtDenomOsmosis,
  stakable: true,
  unstakable: false,
  secretAddress: null,
  chainId: envOsmosis.chainId,
  wait: {
    denom: "uscrt",
    chainId: envSecret.chainId,
    icon: "scrt.svg",
    amount: b.amount,
    waitSec: 120,
  },
});
const unwrap = (b: any) => ({
  ...b,
  txName: "unwrap",
  denom: "sSCRT",
  chainId: envSecret.chainId,
  secretAddress: sSCRTContractAddress,
  wait: {
    denom: "sSCRT",
    icon: "scrt.svg",
    chainId: envSecret.chainId,
    waitSec: 30,
    amount: `-${b.amount}`,
  },
});

const routes = {
  //scrt on osmosis
  sSCRT: [id, unwrap, stake],
  [scrtDenomOsmosis]: [id, ibc, stake],
  uscrt: [id, stake],
} as Record<string, any>;

function createTasks(amounts: any, price: any, swapLimit: any): { ibc: null; unwrap: null; base: null; stake: null } | undefined {
  const reduce = amounts?.reduce(
    (agg: any, amount: any) => {
      +amount.amount > 0 &&
        routes[amount.denom].forEach((fn: any) => {
          const nextStep = fn(amount, price, swapLimit.scrtSwapLimit);
          if (nextStep.txName) {
            if (agg[nextStep.txName]) {
              agg[nextStep.txName] = {
                ...nextStep,
                amount: BigNumber(nextStep.amount).plus(BigNumber(agg[nextStep.txName].amount)).toString(),
                wait: {
                  ...nextStep.wait,
                  amount: BigNumber(nextStep.wait.amount).plus(BigNumber(agg[nextStep.txName].wait.amount)).toString(),
                },
              };
            } else {
              agg[nextStep.txName] = nextStep;
            }
          }
          if (amount.denom === "uscrt") {
            agg.base = id(amount);
          }
        });
      return agg;
    },
    {
      base: null,
      ibc: null,
      unwrap: null,
      stake: null,
    }
  ) as { ibc: any; unwrap: any; stake: any; base: any };
  const amnts = {
    uscrt: BigNumber(reduce.ibc?.amount).plus(reduce.base?.amount),
    sSCRT: reduce.unwrap?.amount,
  };
  const swapOp = reduce.stake?.ops?.find((d: any) => d.tx === "swap");
  const stakeOp = reduce.stake?.ops?.find((d: any) => d.tx === "stake");
  if (swapOp) {
    if (amnts.sSCRT < swapOp.amount) {
      // we need to wrap some
      reduce.stake.ops.unshift({
        tx: "wrap",
        amount: BigNumber(swapOp.amount).minus(amnts.sSCRT).toString(),
      });
    }
    reduce.unwrap.amount -= swapOp.amount;
    if (reduce.unwrap.amount > 0) {
      reduce.stake.ops.unshift({
        tx: "unwrap",
        amount: reduce.unwrap.amount,
      });
    }
    delete reduce.unwrap;
  }
  return reduce;
}
