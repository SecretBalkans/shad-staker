import { assign, createMachine } from "xstate";
import { useDenom } from "@/def-composables/useDenom";
import BigNumber from "bignumber.js";
import { useWalletStore } from "@/stores/useWalletStore";
import { MsgTransfer } from "example-client-ts/ibc.applications.transfer.v1/types/ibc/applications/transfer/v1/tx";
import { useAssets } from "@/def-composables/useAssets";
import type { EventEmitter } from "events";

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

async function balanceWaitTask(task: any) {
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
    task.secretAddress,
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
            target: "balanceWait",
            actions: [assign({ jobStates: (context: any) => ({ ...context.jobStates, [contextTaskKey]: "signed" }) })],
          },
          onError: {
            target: "failure",
            actions: [assign({ jobStates: (context: any) => ({ ...context.jobStates, [contextTaskKey]: "error" }) })],
          },
        },
      },
      balanceWait: {
        invoke: {
          src: (context: any) => balanceWaitTask(context.tasks[contextTaskKey].wait),
          onDone: {
            target: "success",
            actions: [assign({ jobStates: (context: any) => ({ ...context.jobStates, [contextTaskKey]: "finished" }) })],
          },
          onError: {
            target: "failure",
            actions: [assign({ jobStates: (context: any) => ({ ...context.jobStates, [contextTaskKey]: "error" }) })],
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

export const useStakeFSM = () => {
  return createMachine(
    {
      id: "moveAndStake",
      predictableActionArguments: true,
      initial: "idle",
      context: {
        tasks: {
          ibc: null,
          unwrap: null,
          base: null,
          stake: null,
        },
        jobStates: {
          ibc: "",
          unwrap: "",
          stake: "",
        },
      },
      states: {
        idle: {
          on: {
            INIT: {
              actions: [
                assign((context, event: any) => ({ ...context, tasks: event.tasks, jobStates: { ibc: "", unwrap: "", stake: "" } })),
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
                  always: {
                    cond: "areAllBalanceWait",
                    target: "staking",
                  },
                },
                staking: {
                  ...txMachine("stake", stakeFn),
                  onDone: "success",
                },
                success: {
                  type: "final" as "final",
                },
              },
            },
            unwrap: txMachine("unwrap", unwrapFn),
            ibc: txMachine("ibc", ibcFn),
          },
          onDone: "#success",
        },
        success: {
          id: "success",
          type: "final" as "final",
        },
        failure: {
          id: "failure",
          type: "final" as "final",
        },
      },
    },
    {
      guards: {
        areAllBalanceWait: (context) => {
          const allWait =
            (!context.tasks.ibc || (context.tasks.ibc && context.jobStates.ibc === "finished")) &&
            (!context.tasks.unwrap || (context.tasks.unwrap && context.jobStates.unwrap === "finished"));
          console.log({ allWait });
          return allWait;
        },
      },
    }
  );
};
