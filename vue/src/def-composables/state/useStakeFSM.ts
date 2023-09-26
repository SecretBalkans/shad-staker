import { assign, createMachine } from "xstate";
import { useDenom } from "@/def-composables/useDenom";
import BigNumber from "bignumber.js";
import { useWalletStore } from "@/stores/useWalletStore";
import { MsgTransfer } from "example-client-ts/ibc.applications.transfer.v1/types/ibc/applications/transfer/v1/tx";
import { useAssets } from "@/def-composables/useAssets";
import { scrtDenomOsmosis, sSCRTContractAddress, stkdSCRTContractAddress } from "@/utils/const";
import type { BalanceAmount } from "@/utils/interfaces";
import { envOsmosis, envSecret } from "@/env";

function getTimeoutTimestamp() {
  const timeoutInMinutes = 15;
  const timeoutTimestampInSeconds = Math.floor(new Date().getTime() / 1000 + 60 * timeoutInMinutes);
  const timeoutTimestampNanoseconds = BigNumber(timeoutTimestampInSeconds).multipliedBy(1_000_000_000);

  return timeoutTimestampNanoseconds.toNumber();
}

const IBCTxGasStakeGas = "" + 350_000;
const secretGasPrice = 0.1;

async function ibcFn(task: any) {
  const walletStore = useWalletStore();
  return await walletStore.activeClients[task.chainId].signAndBroadcast(
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
}

async function txWaitTask(task: any) {
  const { balances } = useAssets();
  const startAmount = balances.value.assets.find((x: any) => x.denom === task.denom)?.amount;
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
      throw new Error("IBC Timeout");
    }
  } while (BigNumber(task.amount)[`${isWatchingReduction ? "isLessThan" : "isGreaterThan"}`](totalDiff));
  return totalDiff.toNumber();
}

async function unwrapFn(task: any) {
  const walletStore = useWalletStore();
  return await walletStore.secretJsClient!.executeSecretContract(
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
    60_000,
    true
  );
}

async function stakeFn(task: any) {
  const walletStore = useWalletStore();
  return await walletStore.secretJsClient!.executeSecretContract(
    stkdSCRTContractAddress,
    {
      stake: {},
    },
    secretGasPrice,
    +IBCTxGasStakeGas,
    true,
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

function txMachine(contextTaskKey: string, taskFn: (task: any) => Promise<any>) {
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
          src: (context: any) => context.tasks[contextTaskKey] && taskFn(context.tasks[contextTaskKey]),
          onDone: {
            target: "txWait",
            actions: [
              assign({
                jobStates: (context: any) => ({
                  ...context.jobStates,
                  [contextTaskKey]: {
                    type: "signed",
                  },
                }),
              }),
            ],
          },
          onError: {
            target: "failure",
            actions: [
              assign({
                jobStates: (context: any, event: any) => {
                  return {
                    ...context.jobStates,
                    [contextTaskKey]: {
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
      txWait: {
        invoke: {
          src: (context: any) => txWaitTask(context.tasks[contextTaskKey].wait),
          onDone: {
            target: "success",
            actions: [
              assign({
                jobStates: (context: any) => ({
                  ...context.jobStates,
                  [contextTaskKey]: {
                    type: "finished",
                  },
                }),
              }),
            ],
          },
          onError: {
            target: "failure",
            actions: [
              assign({
                jobStates: (context: any, event: any) => ({
                  ...context.jobStates,
                  [contextTaskKey]: {
                    type: "error",
                    data: event.data,
                  },
                }),
              }),
            ],
          },
        },
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
      ibc: { type: "" },
      unwrap: { type: "" },
      stake: { type: "" },
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
                  jobStates: { ibc: { type: "" }, unwrap: { type: "" }, stake: { type: "" } },
                })),
              ],
            },
            START: [
              {
                target: ["working.stake", "working.unwrap", "working.ibc"],
                cond: (context) => !!context.tasks.ibc && !!context.tasks.unwrap,
              },
              {
                target: ["working.stake", "working.ibc"],
                cond: (context) => !!context.tasks.ibc && !context.tasks.unwrap,
              },
              {
                target: ["working.stake", "working.unwrap"],
                cond: (context) => !context.tasks.ibc && !!context.tasks.unwrap,
              },
              {
                target: ["working.stake"],
                cond: (context) => !context.tasks.ibc && !context.tasks.unwrap,
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
                      cond: "areAllTxWait",
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
        areAllTxWait: (context) => {
          const allWait =
            (!context.tasks.ibc || (context.tasks.ibc && context.jobStates.ibc?.type === "finished")) &&
            (!context.tasks.unwrap || (context.tasks.unwrap && context.jobStates.unwrap?.type === "finished"));
          console.log({ allWait });
          return allWait;
        },
        isSomeTxFail: (context) => {
          const someFail = context.jobStates.ibc?.type === "error" || context.jobStates.unwrap?.type === "error";
          console.log({ someFail });
          return someFail;
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
