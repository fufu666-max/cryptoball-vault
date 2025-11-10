# CryptoBall Vault - Anonymous Price Prediction Market

A privacy-preserving crypto price prediction market built with **FHEVM (Fully Homomorphic Encryption Virtual Machine)**. Users can submit encrypted price predictions for BTC/ETH, and results are only revealed after the prediction period ends through on-chain decryption.

## 🎯 Live Demo

- **Live Application**: [https://cryptoball-vault.vercel.app/](https://cryptoball-vault.vercel.app/)
- **Demo Video**: [https://github.com/MorganDobbin/cryptoball-vault/blob/main/cryptoball-vault.mp4](https://github.com/MorganDobbin/cryptoball-vault/blob/main/cryptoball-vault.mp4)

## ✨ Features

- **🔐 FHE Encryption**: All price predictions are encrypted using Fully Homomorphic Encryption (FHE)
- **🛡️ Privacy-Preserving**: Individual predictions remain completely private until finalization
- **📊 On-Chain Aggregation**: Encrypted predictions are aggregated on-chain without decryption
- **⚖️ Fair Competition**: No copying or cheating - predictions are locked until reveal
- **🎮 Interactive UI**: Modern React frontend with real-time event management
- **👑 Admin Controls**: Event creation, ending, price setting, and result finalization

## 🏗️ Architecture

### Smart Contract (`CryptoPriceGuess.sol`)

The contract manages prediction events and handles encrypted data aggregation:

```solidity
contract CryptoPriceGuess is SepoliaConfig {
    struct PredictionEvent {
        string title;
        TokenType tokenType;        // BTC or ETH
        uint256 targetDate;          // Target date for price prediction
        uint256 endTime;            // End of prediction period
        bool isActive;              // Whether event is accepting predictions
        bool isFinalized;           // Whether results are decrypted
        address admin;              // Event administrator
        uint256 totalPredictions;   // Number of predictions submitted
        uint256 actualPrice;        // Actual price at target date (set by admin)
        euint32 encryptedPriceSum;  // Sum of all encrypted predictions
        uint32 decryptedAveragePrice; // Decrypted average after finalization
    }
}
```

### Key Contract Functions

#### For Users
- `createPredictionEvent()`: Create a new prediction event (admin only)
- `submitPrediction(uint256 _eventId, externalEuint32 _encryptedPrice, bytes inputProof)`: Submit an encrypted price prediction
- `getPredictionEvent(uint256 _eventId)`: Get event details
- `hasUserPredicted(uint256 _eventId, address _user)`: Check if user has submitted a prediction

#### For Admins
- `endPredictionEvent(uint256 _eventId)`: End the prediction period
- `setActualPrice(uint256 _eventId, uint256 _actualPrice)`: Set the actual price after target date
- `finalizePredictionEvent(uint256 _eventId)`: Request decryption and calculate average
- `getDecryptedAveragePrice(uint256 _eventId)`: Get the decrypted average price

## 🔐 Encryption & Decryption Logic

### Encryption Flow (Frontend)

1. **User Input**: User enters price prediction in USD (e.g., $50,000)

2. **Price Conversion**: Convert to cents for precision
   ```typescript
   const priceInCents = Math.round(priceValue * 100); // $50,000 = 5,000,000 cents
   ```

3. **FHEVM Initialization**:
   - **Local Development**: Uses `@fhevm/mock-utils` with Hardhat node
   - **Production (Sepolia)**: Uses `@zama-fhe/relayer-sdk` for real FHE encryption

4. **Encryption Process**:
   ```typescript
   // Create encrypted input
   const input = fhevmInstance.createEncryptedInput(contractAddress, userAddress);
   input.add32(priceInCents);  // Add price as uint32
   const encrypted = await input.encrypt();
   
   // Result contains:
   // - handles[0]: Encrypted value (32 bytes, hex string)
   // - inputProof: Proof for input verification
   ```

5. **Submission**: Encrypted data is submitted to the contract
   ```typescript
   submitPrediction(eventId, encrypted.handles[0], encrypted.inputProof);
   ```

### On-Chain Aggregation

The contract aggregates encrypted predictions without decryption:

```solidity
function submitPrediction(
    uint256 _eventId,
    externalEuint32 _encryptedPrice,
    bytes calldata inputProof
) external {
    // Convert external encrypted input to internal euint32
    euint32 encryptedPrice = FHE.fromExternal(_encryptedPrice, inputProof);
    
    // Store user prediction
    userPredictions[_eventId][msg.sender] = UserPrediction({
        encryptedPrice: encryptedPrice,
        timestamp: block.timestamp,
        exists: true
    });
    
    // Add to encrypted sum (homomorphic addition)
    if (event_.totalPredictions == 0) {
        event_.encryptedPriceSum = encryptedPrice;
    } else {
        event_.encryptedPriceSum = FHE.add(event_.encryptedPriceSum, encryptedPrice);
    }
    
    event_.totalPredictions++;
}
```

**Key Points**:
- Each encrypted prediction is added to `encryptedPriceSum` using homomorphic addition
- No decryption occurs during aggregation
- The sum remains encrypted until finalization

### Decryption Flow (Contract)

1. **Admin Requests Finalization**:
   ```solidity
   function finalizePredictionEvent(uint256 _eventId) external {
       // Request decryption for the encrypted price sum
       bytes32[] memory cts = new bytes32[](1);
       cts[0] = FHE.toBytes32(event_.encryptedPriceSum);
       
       uint256 requestId = FHE.requestDecryption(cts, this.decryptionCallback.selector);
       _requestToEvent[requestId] = _eventId;
   }
   ```

2. **FHEVM Decryption Oracle Callback**:
   ```solidity
   function decryptionCallback(
       uint256 requestId,
       bytes memory cleartexts,
       bytes[] memory signatures
   ) public returns (bool) {
       uint256 eventId = _requestToEvent[requestId];
       PredictionEvent storage event_ = predictionEvents[eventId];
       
       // Parse decrypted sum (uint32)
       uint32 decryptedSum = /* extract from cleartexts */;
       
       // Calculate average
       uint32 averagePrice = decryptedSum / uint32(event_.totalPredictions);
       
       event_.decryptedAveragePrice = averagePrice;
       event_.isFinalized = true;
       
       return true;
   }
   ```

3. **Result Display**: The decrypted average price is now publicly available

## 🚀 Quick Start

### Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Package manager
- **MetaMask**: Browser wallet extension
- **Hardhat Node**: For local development (with FHEVM plugin)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/MorganDobbin/cryptoball-vault.git
   cd cryptoball-vault
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd ui && npm install
   ```

3. **Set up environment variables**
   ```bash
   npx hardhat vars set MNEMONIC
   npx hardhat vars set INFURA_API_KEY
   npx hardhat vars set ETHERSCAN_API_KEY  # Optional
   ```

4. **Compile contracts**
   ```bash
   npm run compile
   ```

### Local Development

1. **Start Hardhat node with FHEVM plugin**
   ```bash
   npx hardhat node
   ```
   This starts a local blockchain with FHEVM support on `http://127.0.0.1:8545`

2. **Deploy contracts**
   ```bash
   # In a new terminal
   npx hardhat deploy --network localhost
   ```

3. **Update contract address**
   - Update `ui/src/abi/CryptoPriceGuessAddresses.ts`
   - Set the address for `chainId: 31337` (localhost)

4. **Start frontend**
   ```bash
   cd ui
   npm run dev
   ```

5. **Connect MetaMask**
   - Add localhost network (chainId: 31337)
   - Import test accounts from Hardhat node
   - Connect wallet to the application

### Testing

```bash
# Test on local network (mock FHEVM)
npm run test

# Test on Sepolia (after deployment)
npm run test:sepolia
```

### Deployment to Sepolia

1. **Deploy contracts**
   ```bash
   npx hardhat deploy --network sepolia
   ```

2. **Update contract address**
   - Update `ui/src/abi/CryptoPriceGuessAddresses.ts`
   - Set the address for `chainId: 11155111` (Sepolia)

3. **Verify contract**
   ```bash
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
   ```

4. **Deploy frontend**
   - The frontend is automatically deployed to Vercel on push to `main` branch
   - Configuration: `ui/vercel.json`

## 📁 Project Structure

```
cryptoball-vault/
├── contracts/
│   ├── CryptoPriceGuess.sol      # Main prediction market contract
│   └── FHECounter.sol             # Example FHE counter contract
├── deploy/                        # Deployment scripts
├── test/                          # Test files
│   ├── CryptoPriceGuess.ts       # Local network tests
│   └── CryptoPriceGuessSepolia.ts # Sepolia testnet tests
├── ui/                            # Frontend React application
│   ├── src/
│   │   ├── abi/                   # Contract addresses
│   │   ├── components/            # React components
│   │   │   ├── PredictionModal.tsx    # Prediction submission with FHE encryption
│   │   │   ├── AdminPanel.tsx         # Admin controls
│   │   │   ├── EventCard.tsx          # Event display
│   │   │   └── CreateEventModal.tsx   # Event creation
│   │   ├── fhevm/
│   │   │   └── mock/
│   │   │       └── fhevmMock.ts   # FHEVM mock implementation
│   │   ├── hooks/
│   │   │   └── useCryptoPriceGuess.tsx # Contract interaction hook
│   │   └── lib/
│   │       └── wagmi.ts           # Wagmi configuration
│   └── vercel.json                # Vercel deployment config
├── hardhat.config.ts              # Hardhat configuration
└── package.json                   # Dependencies and scripts
```

## 🔧 Available Scripts

| Script             | Description                      |
| ------------------ | -------------------------------- |
| `npm run compile`  | Compile all contracts            |
| `npm run test`     | Run all tests (local)            |
| `npm run test:sepolia` | Run tests on Sepolia         |
| `npm run coverage` | Generate coverage report         |
| `npm run lint`     | Run linting checks               |
| `npm run clean`    | Clean build artifacts             |

## 🔄 Workflow

### 1. Event Creation (Admin)
- Admin creates a prediction event with:
  - Title
  - Token type (BTC/ETH)
  - Target date
  - Duration (hours)

### 2. Prediction Submission (Users)
- Users connect wallet
- Enter price prediction
- Price is encrypted using FHEVM
- Encrypted prediction is submitted to contract
- Contract aggregates encrypted values

### 3. Event Ending
- After end time, anyone can call `endPredictionEvent()`
- No more predictions can be submitted

### 4. Price Setting (Admin)
- After target date, admin sets actual price
- This is the reference price for comparison

### 5. Finalization (Admin)
- Admin calls `finalizePredictionEvent()`
- Contract requests decryption of encrypted sum
- FHEVM decryption oracle decrypts the sum
- Average price is calculated: `sum / totalPredictions`
- Results are stored and made public

### 6. Results Display
- Decrypted average price is displayed
- Users can compare their predictions with the average
- Actual price is shown for reference

## 🔒 Security Features

- **FHE Encryption**: Predictions are encrypted using fully homomorphic encryption
- **Input Verification**: All encrypted inputs are verified with proofs
- **Access Control**: Admin-only functions are protected with modifiers
- **Event Validation**: Multiple checks prevent invalid operations
- **Decryption Oracle**: Secure decryption through FHEVM oracle

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [Zama Relayer SDK](https://github.com/zama-ai/relayer-sdk)

## 🛠️ Technology Stack

- **Smart Contracts**: Solidity ^0.8.24, FHEVM
- **Frontend**: React, TypeScript, Vite
- **Web3**: Wagmi, Viem, Ethers.js
- **UI**: Tailwind CSS, shadcn/ui, Lucide Icons
- **Deployment**: Hardhat, Vercel
- **Networks**: Hardhat Local, Sepolia Testnet

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/MorganDobbin/cryptoball-vault/issues)
- **FHEVM Documentation**: [https://docs.zama.ai](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

## 🙏 Acknowledgments

- Built with [FHEVM](https://github.com/zama-ai/fhevm) by Zama
- Uses [@zama-fhe/relayer-sdk](https://github.com/zama-ai/relayer-sdk) for production FHE encryption
- Frontend built with [shadcn/ui](https://ui.shadcn.com/) components

---

**Built with ❤️ using FHEVM and Zama's privacy-preserving technology**
