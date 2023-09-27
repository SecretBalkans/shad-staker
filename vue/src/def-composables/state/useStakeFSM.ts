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

function getTimeoutTimestamp() {
  const timeoutInMinutes = 15;
  const timeoutTimestampInSeconds = Math.floor(new Date().getTime() / 1000 + 60 * timeoutInMinutes);
  const timeoutTimestampNanoseconds = BigNumber(timeoutTimestampInSeconds).multipliedBy(1_000_000_000);

  return timeoutTimestampNanoseconds.toNumber();
}

const IBCTxGasStakeGas = "" + 350_000;
const secretGasPrice = 0.1;

async function broadcast(message: string | Uint8Array, task: any): Promise<string> {
  const walletStore = useWalletStore();
  if (typeof message === "string") {
    const response: TxResponse = await walletStore.secretJsClient!.broadcastSignedMessage(message);
    return response.transactionHash;
  } else {
    const activeClient = walletStore.activeClients[task.chainId];
    const client = await SigningStargateClient.connectWithSigner(activeClient.env.rpcURL, activeClient.signer!, {
      registry: new Registry(activeClient.registry),
      prefix: activeClient.env.prefix,
    });
    try {
      const response = await client.broadcastTx(message, 0, 1000);
      return response.transactionHash;
    } catch (e) {
      if (e instanceof TimeoutError) {
        return e.txId;
      } else if (e instanceof BroadcastTxError) {
        throw new Error(`Error broadcasting tx. code: ${e.code}/log: ${e.log}`);
      } else {
        throw e;
      }
    }
  }
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

async function balanceWaitTask(startAmount: any, task: any) {
  const { balances } = useAssets();
  let totalDiff = BigNumber(0);
  let prevAmount = startAmount;
  const isWatchingReduction = BigNumber(task.amount).isNegative();
  let timeout = task.waitSec;
  do {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const currentAmount = balances.value.assets.find((x: any) => x.denom === task.denom)?.amount;
    const diff = BigNumber(currentAmount).minus(prevAmount);
    prevAmount = currentAmount;
    if (diff[isWatchingReduction ? `isNegative` : `isPositive`]()) {
      totalDiff = BigNumber(totalDiff).plus(diff);
    }
    timeout--;
    if (timeout === 0) {
      throw new Error("Balance Change Timeout");
    }
  } while (BigNumber(task.amount)[`${isWatchingReduction ? "isLessThan" : "isGreaterThan"}`](totalDiff));
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
  return await walletStore.secretJsClient!.signContractCall(
    stkdSCRTContractAddress,
    {
      stake: {},
    },
    secretGasPrice,
    +IBCTxGasStakeGas,
    [
      {
        amount: BigNumber(task.amount)
          .multipliedBy(10 ** 6)
          .toFixed(0),
        denom: "uscrt",
      },
    ]
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
            target: "txBroadcast",
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
                    error: event.data,
                  }),
              }),
            ],
          },
        },
      },
      txBroadcast: {
        invoke: {
          src: (context: any) => broadcast(context.jobStates[contextTaskKey].txSigned, context.tasks[contextTaskKey]),
          onDone: {
            target: "txWait",
            actions: [
              assign({
                jobStates: (context: any, event: any) =>
                  addJobStateData(context, contextTaskKey, "txBroadcast", {
                    txHash: event.data,
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
                    error: event.data,
                  }),
              }),
            ],
          },
        },
      },
      txWait: {
        initial: "initialBalance",
        states: {
          initialBalance: {
            entry: [
              assign({
                jobStates: (context: any) => {
                  const { balances } = useAssets();
                  const startAmount = balances.value.assets.find((x: any) => x.denom === context.tasks[contextTaskKey].wait.denom)?.amount;
                  return addJobStateData(context, contextTaskKey, "initialBalance", {
                    startAmount,
                  });
                },
              }),
            ],
            always: "balanceWait",
          },
          balanceWait: {
            invoke: {
              src: (context: any) => balanceWaitTask(context.jobStates[contextTaskKey].startAmount, context.tasks[contextTaskKey].wait),
              onDone: {
                target: "success",
                actions: [
                  assign({
                    jobStates: (context: any) =>
                      addJobStateData(context, contextTaskKey, "balanceWait", {
                        finished: true,
                      }),
                  }),
                ],
              },
              onError: {
                target: "failure",
                actions: [
                  assign({
                    jobStates: (context: any, event: any) =>
                      addJobStateData(context, contextTaskKey, "balanceWait", {
                        error: event.data,
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
        onDone: [
          {
            cond: (context: any) => {
              return !context.jobStates[contextTaskKey].error;
            },
            target: "success",
          },
          {
            cond: (context: any) => {
              return !!context.jobStates[contextTaskKey].error;
            },
            target: "failure",
          },
        ],
      },
      success: {
        type: "final" as "final",
      },
      failure: {
        type: "final" as "final",
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
                  tasks: createTasks(event.amounts, event.price),
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
                        console.log(event);
                        return {
                          ...context.jobStates,
                          stake: {
                            type: "error",
                            data: event.data,
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
              cond: (context, event) => {
                return context.jobStates.stake.type !== "error";
              },
              target: "#success",
            },
            {
              cond: (context, event) => {
                return context.jobStates.stake.type === "error";
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
          const areAllTxFinished =
            (!context.tasks.ibc || (context.tasks.ibc && context.jobStates.ibc?.type === "finished")) &&
            (!context.tasks.unwrap || (context.tasks.unwrap && context.jobStates.unwrap?.type === "finished"));
          console.log({ areAllTxFinished });
          return areAllTxFinished;
        },
        isSomeTxFail: (context) => {
          const isSomeTxFail = !!context.jobStates.ibc?.error || !!context.jobStates.unwrap?.error;
          console.log({ isSomeTxFail });
          return isSomeTxFail;
        },
      },
    }
  );
};

const id = (i: BalanceAmount) => i;
const stake = (b: BalanceAmount, price: any) => {
  const stkdSCRTRawPrice =
    "" +
    +BigNumber(b.amount)
      .dividedBy(+price / 10 ** 6)
      .toFixed(6);
  const stkdSCRTExpected = BigNumber(stkdSCRTRawPrice)
    .multipliedBy(1 - 0.2 / 100 - 0.01 / 100 /* epsilon for more reliable balance wait tx */)
    .minus(1 / 10 ** 6)
    .toFixed(6);
  return {
    denom: "uscrt",
    txName: "stake",
    amount: b.amount,
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

function createTasks(amounts: any, price: any): { ibc: null; unwrap: null; base: null; stake: null } | undefined {
  return amounts?.reduce(
    (agg: any, amount: any) => {
      +amount.amount > 0 &&
        routes[amount.denom].forEach((fn: any) => {
          const nextStep = fn(amount, price);
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
}
