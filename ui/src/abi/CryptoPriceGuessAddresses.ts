// Contract addresses for CryptoPriceGuess
// Update these addresses after deployment

export const CRYPTO_PRICE_GUESS_ADDRESSES: Record<number, `0x${string}`> = {
  // Hardhat Local Network
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Deployed to localhost
  // Sepolia Testnet
  11155111: "0x0000000000000000000000000000000000000000", // Update after Sepolia deployment
};

export const getCryptoPriceGuessAddress = (chainId: number): `0x${string}` | undefined => {
  return CRYPTO_PRICE_GUESS_ADDRESSES[chainId];
};

