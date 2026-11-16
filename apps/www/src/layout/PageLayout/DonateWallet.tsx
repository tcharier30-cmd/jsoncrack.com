import React from "react";
import { Anchor, Button, Popover, Stack, Text, TextInput } from "@mantine/core";
import toast from "react-hot-toast";
import { FaEthereum } from "react-icons/fa";

export const DONATION_ADDRESS = "0x3b7e02e8134e3761E1fE5702e09D05Dd7D228519";
const MAINNET_CHAIN_ID = "0x1";

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
}

const getProvider = (): EthereumProvider | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EthereumProvider }).ethereum;
};

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** Converts a decimal ETH amount (e.g. "0.01") to a hex wei string without floating point errors. */
export const ethToWeiHex = (amount: string): string | null => {
  const trimmed = amount.trim().replace(",", ".");
  if (!/^\d+(\.\d{0,18})?$/.test(trimmed) && !/^\.\d{1,18}$/.test(trimmed)) return null;
  const [whole = "0", fraction = ""] = trimmed.split(".");
  const wei =
    BigInt(whole || "0") * BigInt("1000000000000000000") + BigInt(fraction.padEnd(18, "0") || "0");
  if (wei <= BigInt(0)) return null;
  return `0x${wei.toString(16)}`;
};

export const DonateWallet = () => {
  const [account, setAccount] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState("0.01");
  const [loading, setLoading] = React.useState(false);
  const [opened, setOpened] = React.useState(false);

  React.useEffect(() => {
    const provider = getProvider();
    if (!provider) return;

    provider
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => setAccount(accounts[0] ?? null))
      .catch(() => undefined);

    const handleAccountsChanged = (accounts: string[]) => setAccount(accounts[0] ?? null);
    provider.on?.("accountsChanged", handleAccountsChanged);
    return () => provider.removeListener?.("accountsChanged", handleAccountsChanged);
  }, []);

  const connect = async () => {
    const provider = getProvider();
    if (!provider) {
      toast.error("No Ethereum wallet found. Please install MetaMask.");
      window.open("https://metamask.io/download/", "_blank", "noopener");
      return;
    }

    try {
      setLoading(true);
      const accounts: string[] = await provider.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0] ?? null);
      setOpened(true);
    } catch (error: any) {
      toast.error(error?.message ?? "Wallet connection rejected.");
    } finally {
      setLoading(false);
    }
  };

  const donate = async () => {
    const provider = getProvider();
    if (!provider || !account) return;

    const value = ethToWeiHex(amount);
    if (!value) {
      toast.error("Please enter a valid ETH amount.");
      return;
    }

    try {
      setLoading(true);
      const chainId: string = await provider.request({ method: "eth_chainId" });
      if (chainId !== MAINNET_CHAIN_ID) {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: MAINNET_CHAIN_ID }],
        });
      }

      const txHash: string = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: account, to: DONATION_ADDRESS, value }],
      });

      toast.success("Thank you for your donation! 💜");
      window.open(`https://etherscan.io/tx/${txHash}`, "_blank", "noopener");
      setOpened(false);
    } catch (error: any) {
      toast.error(error?.message ?? "Transaction rejected.");
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <Button
        variant="subtle"
        color="black"
        size="md"
        radius="md"
        loading={loading}
        onClick={connect}
        leftSection={<FaEthereum size={16} />}
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <Popover opened={opened} onChange={setOpened} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <Button
          variant="light"
          color="black"
          size="md"
          radius="md"
          onClick={() => setOpened(o => !o)}
          leftSection={<FaEthereum size={16} />}
        >
          {shortAddress(account)}
        </Button>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="xs" w={260}>
          <Text fw={600}>Donate with ETH</Text>
          <Text size="xs" c="dimmed">
            To{" "}
            <Anchor
              href={`https://etherscan.io/address/${DONATION_ADDRESS}`}
              target="_blank"
              rel="noopener"
              size="xs"
            >
              {shortAddress(DONATION_ADDRESS)}
            </Anchor>{" "}
            on Ethereum Mainnet
          </Text>
          <TextInput
            label="Amount (ETH)"
            value={amount}
            onChange={e => setAmount(e.currentTarget.value)}
            inputMode="decimal"
          />
          <Button color="#202842" radius="md" loading={loading} onClick={donate}>
            Donate
          </Button>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
