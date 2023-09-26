/* eslint-disable no-case-declarations */
import { useWalletStore } from "@/stores/useWalletStore";
import { MsgTransfer } from "example-client-ts/ibc.applications.transfer.v1/types/ibc/applications/transfer/v1/tx";
import { useDenom } from "@/def-composables/useDenom";
import BigNumber from "bignumber.js";
import { useAssets } from "./useAssets";
import async from "async";
import { EventEmitter } from "events";

function getTimeoutTimestamp() {
  const timeoutInMinutes = 15;
  const timeoutTimestampInSeconds = Math.floor(new Date().getTime() / 1000 + 60 * timeoutInMinutes);
  const timeoutTimestampNanoseconds = BigNumber(timeoutTimestampInSeconds).multipliedBy(1_000_000_000);

  return timeoutTimestampNanoseconds.toNumber();
}

const IBCTxGasStakeGas = "" + 350_000;
const secretGasPrice = 0.035;

export const useRouteQueries = (queries: any[][]) => {
  const auto: any = {};
  const waitAllFns: any[] = [];
  let index: number = 0;
  const walletStore = useWalletStore();
  const emitter = new EventEmitter();
  function createJobFn(q: any, jobId: any) {
    return async () => {
      const args = {
        ...q,
        id: jobId,
      };

      switch (q.type) {
        case "ibc":
          emitter.emit("status", {
            jobId,
            status: "signing",
          });
          try {
            const signAndBroadcast = await walletStore.activeClients[q.chainId].signAndBroadcast(
              [
                {
                  typeUrl: "/ibc.applications.transfer.v1.MsgTransfer",
                  value: MsgTransfer.fromPartial({
                    sourcePort: "transfer",
                    sourceChannel: useDenom(q.denom, q.chainId).path.value.split("/")[1],
                    sender: walletStore.addresses[q.chainId],
                    receiver: walletStore.secretAddress,
                    token: {
                      denom: q.denom,
                      amount: BigNumber(q.amount)
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
            emitter.emit("status", {
              jobId,
              status: "signed",
            });
            return signAndBroadcast;
          } catch (err) {
            emitter.emit("status", {
              jobId,
              status: "rejected",
            });
            throw err;
          }
        case "unwrap":
          try {
            emitter.emit("status", {
              jobId,
              status: "signing",
            });
            const txResponseWrap = await walletStore.secretJsClient!.executeSecretContract(
              q.secretAddress,
              {
                redeem: {
                  amount: BigNumber(q.amount)
                    .multipliedBy(10 ** 6)
                    .toFixed(0),
                  denom: q.denom,
                },
              },
              secretGasPrice,
              60_000,
              true
            );
            emitter.emit("status", {
              jobId,
              status: "signed",
            });
            return txResponseWrap;
          } catch (err) {
            emitter.emit("status", {
              jobId,
              status: "rejected",
            });
            throw err;
          }
        case "stake":
          try {
            emitter.emit("status", {
              jobId,
              status: "signing",
            });
            const txResponseStake = await walletStore.secretJsClient!.executeSecretContract(
              q.secretAddress,
              {
                stake: {},
              },
              secretGasPrice,
              +IBCTxGasStakeGas,
              true,
              [
                {
                  amount: BigNumber(q.amount)
                    .multipliedBy(10 ** 6)
                    .toFixed(0),
                  denom: "uscrt",
                },
              ]
            );
            emitter.emit("status", {
              jobId,
              status: "signed",
            });
            return txResponseStake;
          } catch (err) {
            emitter.emit("status", {
              jobId,
              status: "rejected",
            });
            throw err;
          }
        case "balance":
          emitter.emit("status", {
            jobId,
            status: "started",
          });
          const { balances } = useAssets();
          const startAmount = balances.value.assets.find((x: any) => x.denom === q.denom)?.amount;
          let totalDiff = BigNumber(0);
          let prevAmount = startAmount;
          const isWatchingReduction = BigNumber(q.amount).isNegative();
          let timeout = q.wait;
          do {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const currentAmount = balances.value.assets.find((x: any) => x.denom === q.denom)?.amount;
            const diff = BigNumber(currentAmount).minus(prevAmount);
            prevAmount = currentAmount;
            if (diff[isWatchingReduction ? `isNegative` : `isPositive`]()) {
              totalDiff = BigNumber(totalDiff).plus(diff);
            }
            timeout--;
            if (timeout === 0) {
              emitter.emit("status", {
                jobId,
                status: "rejected",
              });
              throw new Error("IBC Timeout");
            }
          } while (BigNumber(q.amount)[`${isWatchingReduction ? "isLessThan" : "isGreaterThan"}`](totalDiff));
          emitter.emit("status", {
            jobId,
            status: "finished",
          });
          return totalDiff.toNumber();
        case "waitAll":
          emitter.emit("end", args);
          return "auto";
        // do nothing - this is a placeholder for the async.auto doing its magic of waiting tasks
        default:
          throw new Error(`Unrecognized q.type=${q.type} in ${JSON.stringify(q)}`);
      }
    };
  }

  queries.forEach((branch) => {
    let prev = "";
    branch.forEach((q) => {
      index++;
      const fnName = `${q.id}_${q.type}`;
      const fn = createJobFn(q, q.id);
      if (q.type === "waitAll") {
        auto[fnName] = [...waitAllFns, fn];
      } else if (prev) {
        auto[fnName] = [prev, fn];
      } else {
        auto[fnName] = fn;
      }
      if (q.type === "balance") {
        waitAllFns.push(fnName);
      }
      prev = fnName;
    });
  });
  return {
    async startQueries() {
      return async.auto(auto);
    },
    events: emitter,
  };
};
