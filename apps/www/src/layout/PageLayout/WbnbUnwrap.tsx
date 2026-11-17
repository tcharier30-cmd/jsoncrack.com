import React from "react";
import { Anchor, Button, Divider, Stack, Text } from "@mantine/core";
import toast from "react-hot-toast";
import { getProvider, switchChain } from "./wallet";

/** Official Wrapped BNB contract on BNB Smart Chain. */
export const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const BSC_CHAIN = {
  chainId: "0x38",
  chainName: "BNB Smart Chain",
  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
  rpcUrls: ["https://bsc-dataseed.bnbchain.org"],
  blockExplorerUrls: ["https://bscscan.com"],
};

// Function selectors: balanceOf(address) and withdraw(uint256)
const BALANCE_OF_SELECTOR = "0x70a08231";
const WITHDRAW_SELECTOR = "0x2e1a7d4d";

const pad32 = (hex: string) => hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");

/** Formats a wei amount as a decimal string with up to 6 decimals. */
export const formatUnits18 = (wei: bigint): string => {
  const base = BigInt("1000000000000000000");
  const whole = wei / base;
  const fraction = (wei % base).toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
};

export const WbnbUnwrap = ({ account }: { account: string }) => {
  const [balance, setBalance] = React.useState<bigint | null>(null);
  const [loading, setLoading] = React.useState(false);

  const checkBalance = async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      setLoading(true);
      await switchChain(provider, BSC_CHAIN);
      const result: string = await provider.request({
        method: "eth_call",
        params: [{ to: WBNB_ADDRESS, data: BALANCE_OF_SELECTOR + pad32(account) }, "latest"],
      });
      setBalance(BigInt(result === "0x" ? "0" : result));
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to read WBNB balance.");
    } finally {
      setLoading(false);
    }
  };

  const unwrap = async () => {
    const provider = getProvider();
    if (!provider || !balance) return;

    try {
      setLoading(true);
      await switchChain(provider, BSC_CHAIN);
      const txHash: string = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: WBNB_ADDRESS,
            data: WITHDRAW_SELECTOR + pad32(balance.toString(16)),
            value: "0x0",
          },
        ],
      });

      toast.success(`${formatUnits18(balance)} WBNB unwrapped to BNB.`);
      window.open(`https://bscscan.com/tx/${txHash}`, "_blank", "noopener");
      setBalance(BigInt(0));
    } catch (error: any) {
      toast.error(error?.message ?? "Transaction rejected.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Divider my={4} />
      <Text fw={600}>Recover WBNB</Text>
      <Text size="xs" c="dimmed">
        Unwrap your{" "}
        <Anchor
          href={`https://bscscan.com/token/${WBNB_ADDRESS}`}
          target="_blank"
          rel="noopener"
          size="xs"
        >
          WBNB
        </Anchor>{" "}
        back to BNB on BNB Smart Chain (1:1).
      </Text>
      <Stack gap={6}>
        {balance !== null && (
          <Text size="sm">
            Balance: <b>{formatUnits18(balance)} WBNB</b>
          </Text>
        )}
        {balance === null || balance === BigInt(0) ? (
          <Button variant="default" radius="md" loading={loading} onClick={checkBalance}>
            Check WBNB balance
          </Button>
        ) : (
          <Button color="yellow.7" radius="md" loading={loading} onClick={unwrap}>
            Unwrap {formatUnits18(balance)} WBNB
          </Button>
        )}
      </Stack>
    </>
  );
};
