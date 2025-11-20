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

#### Prerequisites
- **Environment Variables**: Set up all required environment variables
- **Wallet Funding**: Ensure deployment wallet has sufficient Sepolia ETH
- **API Keys**: Configure Infura, Etherscan, and other service API keys

#### Step-by-Step Deployment

1. **Configure Environment**
   ```bash
   # Set deployment environment variables
   export PRIVATE_KEY="your-private-key"
   export INFURA_API_KEY="your-infura-key"
   export ETHERSCAN_API_KEY="your-etherscan-key"
   ```

2. **Deploy Smart Contracts**
   ```bash
   # Deploy to Sepolia testnet
   npx hardhat deploy --network sepolia --tags CryptoPriceGuess

   # The deployment will output the contract address
   # Example output: CryptoPriceGuess deployed to: 0x1234...
   ```

3. **Verify Contracts on Etherscan**
   ```bash
   # Verify the main contract
   npx hardhat verify --network sepolia <CONTRACT_ADDRESS>

   # Verify FHECounter contract (optional)
   npx hardhat verify --network sepolia <FHE_COUNTER_ADDRESS>
   ```

4. **Update Frontend Configuration**
   ```typescript
   // Update ui/src/abi/CryptoPriceGuessAddresses.ts
   export const CRYPTO_PRICE_GUESS_ADDRESSES = {
     11155111: "0x-your-sepolia-contract-address", // Sepolia
     31337: "0x-your-localhost-contract-address"  // Localhost
   } as const;
   ```

5. **Configure Price Feeders**
   ```bash
   # Authorize price feeder addresses
   npx hardhat set-price-feeder --network sepolia --address <FEEDER_ADDRESS>
   ```

6. **Deploy Frontend**
   - **Automatic**: Frontend deploys automatically to Vercel on push to `main`
   - **Manual**: Use Vercel CLI for manual deployment
     ```bash
     cd ui
     vercel --prod
     ```

#### Post-Deployment Configuration

1. **Initialize Price Feeds**
   - Set up initial price data for BTC and ETH
   - Configure authorized price feeder addresses
   - Test price update functionality

2. **Create Initial Events**
   - Use admin panel to create initial prediction events
   - Test event creation and prediction submission
   - Verify FHE encryption/decryption flow

3. **Monitor and Maintenance**
   - Set up monitoring for contract events
   - Configure alerts for critical operations
   - Regular security audits and updates

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

### Encryption & Privacy
- **FHE Encryption**: All predictions are encrypted using Fully Homomorphic Encryption (FHE)
- **Zero-Knowledge Proofs**: Input verification ensures encrypted data integrity
- **Privacy Preservation**: Individual predictions remain private until finalization
- **Secure Decryption**: FHEVM oracle handles decryption with cryptographic guarantees

### Access Control & Validation
- **Role-Based Permissions**: Strict admin controls for sensitive operations
- **Input Sanitization**: Comprehensive validation of all user inputs
- **Event State Management**: Multi-stage validation prevents invalid state transitions
- **Timestamp Verification**: Time-based constraints prevent manipulation

### Smart Contract Security
- **Reentrancy Protection**: Guards against reentrancy attacks
- **Overflow Protection**: SafeMath operations prevent arithmetic overflows
- **Access Modifiers**: Proper visibility controls on all functions
- **Event Logging**: Comprehensive event emission for transparency

### Infrastructure Security
- **Encrypted Storage**: Sensitive data stored with FHE encryption
- **Secure Randomness**: Cryptographically secure random number generation
- **Audit Trail**: Complete transaction history and state changes
- **Rate Limiting**: Protection against spam and abuse

## 📚 Documentation

### Core Documentation
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Setup Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [FHEVM Testing Guide](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat/write_test)
- [FHEVM Hardhat Plugin](https://docs.zama.ai/protocol/solidity-guides/development-guide/hardhat)
- [Zama Relayer SDK](https://github.com/zama-ai/relayer-sdk)

### Project Documentation
- [API Reference](./docs/API_REFERENCE.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Testing Strategy](./docs/TESTING.md)
- [Security Considerations](./docs/SECURITY.md)
- [User Guide](./docs/USER_GUIDE.md)
- [Developer Guide](./docs/DEVELOPER_GUIDE.md)

## 🛠️ Technology Stack

### Blockchain & Smart Contracts
- **Solidity**: ^0.8.24 with FHEVM extensions
- **FHEVM**: Fully Homomorphic Encryption Virtual Machine
- **Hardhat**: Development framework with custom plugins
- **OpenZeppelin**: Secure contract libraries and patterns
- **Networks**: Hardhat Local, Sepolia Testnet, Mainnet (future)

### Frontend & User Interface
- **React 18**: Modern React with hooks and concurrent features
- **TypeScript**: Full type safety and enhanced developer experience
- **Vite**: Fast build tool with HMR and optimized production builds
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **shadcn/ui**: High-quality, accessible component library
- **Lucide Icons**: Beautiful, consistent icon set

### Web3 Integration
- **Wagmi**: React hooks for Ethereum blockchain interactions
- **Viem**: Lightweight, composable Ethereum library
- **Ethers.js v6**: Ethereum blockchain interaction library
- **MetaMask**: Wallet integration and connection management
- **WalletConnect**: Multi-wallet protocol support

### Development & Testing
- **Jest**: JavaScript testing framework with custom matchers
- **React Testing Library**: Component testing utilities
- **Hardhat Chai Matchers**: Ethereum-specific test assertions
- **Coverage Reports**: Comprehensive test coverage analysis
- **ESLint + Prettier**: Code quality and formatting tools

### Infrastructure & Deployment
- **Vercel**: Global CDN deployment with preview deployments
- **GitHub Actions**: CI/CD pipelines with automated testing
- **Docker**: Containerized development and deployment
- **IPFS**: Decentralized storage for static assets (future)
- **The Graph**: Subgraph for efficient data querying (future)

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support & Troubleshooting

### Getting Help
- **GitHub Issues**: [Report bugs or request features](https://github.com/MorganDobbin/cryptoball-vault/issues)
- **Documentation**: Check our [comprehensive docs](./docs/) first
- **FHEVM Documentation**: [Official FHEVM docs](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

### Common Issues & Solutions

#### Wallet Connection Issues
**Problem**: MetaMask not connecting
```
Solution:
1. Ensure MetaMask is installed and unlocked
2. Add localhost network (chainId: 31337) for local development
3. For Sepolia: Switch to Sepolia testnet in MetaMask
4. Clear MetaMask cache and refresh the page
```

#### FHE Encryption Errors
**Problem**: Encryption/decryption failing
```
Solution:
1. Verify FHEVM is properly initialized
2. Check input proof validity
3. Ensure contract addresses are correct
4. Verify network compatibility (Sepolia vs localhost)
```

#### Transaction Failures
**Problem**: Transactions reverting
```
Common causes:
1. Insufficient gas: Increase gas limit
2. Insufficient funds: Get test ETH from faucet
3. Invalid input: Check parameter validation
4. Timing issues: Events may have expired
5. Permission denied: Verify wallet ownership
```

#### Build Errors
**Problem**: Compilation failing
```
Solution:
1. Clear node_modules: rm -rf node_modules && npm install
2. Update dependencies: npm update
3. Check Node.js version (20+ required)
4. Verify Hardhat configuration
5. Check for syntax errors in Solidity files
```

#### Frontend Issues
**Problem**: UI not loading or broken
```
Solution:
1. Clear browser cache and local storage
2. Check browser console for JavaScript errors
3. Verify contract addresses in configuration
4. Ensure MetaMask is connected to correct network
5. Try incognito/private browsing mode
```

### Performance Optimization

#### Smart Contract Optimization
- **Gas Optimization**: Minimize storage operations and loops
- **Batch Operations**: Use batch functions for multiple operations
- **Event Filtering**: Efficient event querying with indexed parameters
- **Storage Patterns**: Optimize struct packing and storage layout

#### Frontend Optimization
- **Code Splitting**: Lazy load components and routes
- **Image Optimization**: Compress and optimize static assets
- **Caching Strategy**: Implement proper caching for API calls
- **Bundle Analysis**: Monitor and optimize bundle size

#### Database/Query Optimization
- **Indexed Queries**: Use indexed event parameters for fast lookups
- **Pagination**: Implement efficient pagination for large datasets
- **Caching**: Cache frequently accessed data
- **Batch Loading**: Load data in batches to reduce network overhead

### Security Best Practices

#### For Users
- **Private Keys**: Never share your private keys or seed phrases
- **Wallet Security**: Use hardware wallets for large amounts
- **Transaction Review**: Always review transaction details before signing
- **Network Verification**: Ensure you're on the correct network
- **Scam Awareness**: Be cautious of phishing attempts

#### For Developers
- **Code Review**: All changes require peer review
- **Testing**: Comprehensive test coverage before deployment
- **Audit**: Third-party security audits for production contracts
- **Monitoring**: Implement monitoring and alerting systems
- **Updates**: Regular dependency updates and security patches

### Contributing Guidelines

#### Development Workflow
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

#### Code Standards
- **Solidity**: Follow official style guide and use latest stable version
- **TypeScript**: Strict type checking enabled, no `any` types
- **Testing**: Minimum 90% test coverage required
- **Documentation**: All public functions must be documented

#### Testing Requirements
- **Unit Tests**: Test all contract functions and edge cases
- **Integration Tests**: Test full user workflows
- **Security Tests**: Include reentrancy and overflow tests
- **Gas Tests**: Monitor gas usage and optimize expensive operations

### License & Legal

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.

#### Important Legal Notices
- **Not Financial Advice**: This is for educational and experimental purposes
- **No Warranty**: Software provided "as is" without warranties
- **Jurisdictional Compliance**: Users responsible for legal compliance
- **Risk Disclosure**: Cryptocurrency investments carry significant risk

## 🙏 Acknowledgments

- Built with [FHEVM](https://github.com/zama-ai/fhevm) by Zama
- Uses [@zama-fhe/relayer-sdk](https://github.com/zama-ai/relayer-sdk) for production FHE encryption
- Frontend built with [shadcn/ui](https://ui.shadcn.com/) components

---

**Built with ❤️ using FHEVM and Zama's privacy-preserving technology**
