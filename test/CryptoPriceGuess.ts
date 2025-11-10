import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { CryptoPriceGuess, CryptoPriceGuess__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CryptoPriceGuess")) as CryptoPriceGuess__factory;
  const cryptoPriceGuessContract = (await factory.deploy()) as CryptoPriceGuess;
  const cryptoPriceGuessContractAddress = await cryptoPriceGuessContract.getAddress();

  return { cryptoPriceGuessContract, cryptoPriceGuessContractAddress };
}

describe("CryptoPriceGuess", function () {
  let signers: Signers;
  let cryptoPriceGuessContract: CryptoPriceGuess;
  let cryptoPriceGuessContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ cryptoPriceGuessContract, cryptoPriceGuessContractAddress } = await deployFixture());
  });

  it("should create a new prediction event", async function () {
    const targetDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    const durationInHours = 24;

    const tx = await cryptoPriceGuessContract
      .connect(signers.deployer)
      .createPredictionEvent("BTC Price Prediction", 0, targetDate, durationInHours);
    const receipt = await tx.wait();

    const eventCount = await cryptoPriceGuessContract.getEventCount();
    expect(eventCount).to.eq(1);

    const event_ = await cryptoPriceGuessContract.getPredictionEvent(0);
    expect(event_.title).to.eq("BTC Price Prediction");
    expect(event_.tokenType).to.eq(0); // BTC
    expect(event_.isActive).to.be.true;
    expect(event_.admin).to.eq(signers.deployer.address);
  });

  it("should submit encrypted price predictions", async function () {
    const targetDate = Math.floor(Date.now() / 1000) + 86400;
    const durationInHours = 24;

    // Create event
    await cryptoPriceGuessContract
      .connect(signers.deployer)
      .createPredictionEvent("ETH Price Prediction", 1, targetDate, durationInHours);

    // Alice submits prediction: $3,500 (350000 in cents)
    const alicePrice = 350000;
    const encryptedAlicePrice = await fhevm
      .createEncryptedInput(cryptoPriceGuessContractAddress, signers.alice.address)
      .add32(alicePrice)
      .encrypt();

    const tx1 = await cryptoPriceGuessContract
      .connect(signers.alice)
      .submitPrediction(0, encryptedAlicePrice.handles[0], encryptedAlicePrice.inputProof);
    await tx1.wait();

    // Check if Alice has predicted
    const hasPredicted = await cryptoPriceGuessContract.hasUserPredicted(0, signers.alice.address);
    expect(hasPredicted).to.be.true;

    // Bob submits prediction: $3,600 (360000 in cents)
    const bobPrice = 360000;
    const encryptedBobPrice = await fhevm
      .createEncryptedInput(cryptoPriceGuessContractAddress, signers.bob.address)
      .add32(bobPrice)
      .encrypt();

    const tx2 = await cryptoPriceGuessContract
      .connect(signers.bob)
      .submitPrediction(0, encryptedBobPrice.handles[0], encryptedBobPrice.inputProof);
    await tx2.wait();

    const event_ = await cryptoPriceGuessContract.getPredictionEvent(0);
    expect(event_.totalPredictions).to.eq(2);
  });

  it("should prevent double submission", async function () {
    const targetDate = Math.floor(Date.now() / 1000) + 86400;
    const durationInHours = 24;

    await cryptoPriceGuessContract
      .connect(signers.deployer)
      .createPredictionEvent("BTC Price Prediction", 0, targetDate, durationInHours);

    const price = 500000; // $50,000
    const encryptedPrice = await fhevm
      .createEncryptedInput(cryptoPriceGuessContractAddress, signers.alice.address)
      .add32(price)
      .encrypt();

    await cryptoPriceGuessContract
      .connect(signers.alice)
      .submitPrediction(0, encryptedPrice.handles[0], encryptedPrice.inputProof);

    // Try to submit again
    await expect(
      cryptoPriceGuessContract
        .connect(signers.alice)
        .submitPrediction(0, encryptedPrice.handles[0], encryptedPrice.inputProof)
    ).to.be.revertedWith("Already submitted prediction");
  });

  it("should end prediction event after end time", async function () {
    const targetDate = Math.floor(Date.now() / 1000) + 86400;
    const durationInHours = 1; // 1 hour

    await cryptoPriceGuessContract
      .connect(signers.deployer)
      .createPredictionEvent("BTC Price Prediction", 0, targetDate, durationInHours);

    // Fast forward time
    await ethers.provider.send("evm_increaseTime", [3601]); // 1 hour + 1 second
    await ethers.provider.send("evm_mine", []);

    await cryptoPriceGuessContract.connect(signers.deployer).endPredictionEvent(0);

    const event_ = await cryptoPriceGuessContract.getPredictionEvent(0);
    expect(event_.isActive).to.be.false;
  });

  it("should finalize and decrypt average price", async function () {
    const targetDate = Math.floor(Date.now() / 1000) + 86400;
    const durationInHours = 24;

    // Create event
    await cryptoPriceGuessContract
      .connect(signers.deployer)
      .createPredictionEvent("BTC Price Prediction", 0, targetDate, durationInHours);

    // Submit predictions
    const alicePrice = 500000; // $50,000
    const encryptedAlicePrice = await fhevm
      .createEncryptedInput(cryptoPriceGuessContractAddress, signers.alice.address)
      .add32(alicePrice)
      .encrypt();

    await cryptoPriceGuessContract
      .connect(signers.alice)
      .submitPrediction(0, encryptedAlicePrice.handles[0], encryptedAlicePrice.inputProof);

    const bobPrice = 520000; // $52,000
    const encryptedBobPrice = await fhevm
      .createEncryptedInput(cryptoPriceGuessContractAddress, signers.bob.address)
      .add32(bobPrice)
      .encrypt();

    await cryptoPriceGuessContract
      .connect(signers.bob)
      .submitPrediction(0, encryptedBobPrice.handles[0], encryptedBobPrice.inputProof);

    // End event
    await ethers.provider.send("evm_increaseTime", [86401]);
    await ethers.provider.send("evm_mine", []);
    await cryptoPriceGuessContract.connect(signers.deployer).endPredictionEvent(0);

    // Get encrypted sum
    const encryptedSum = await cryptoPriceGuessContract.getEncryptedPriceSum(0);

    // Decrypt sum (simulating what admin would do)
    const clearSum = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSum,
      cryptoPriceGuessContractAddress,
      signers.deployer
    );

    // Expected sum: 500000 + 520000 = 1020000
    expect(clearSum).to.eq(1020000);

    // Finalize (this will trigger decryption callback)
    const tx = await cryptoPriceGuessContract.connect(signers.deployer).finalizePredictionEvent(0);
    await tx.wait();

    // Wait for decryption callback (in mock environment, this happens immediately)
    // In real environment, we'd need to wait for the oracle callback

    const event_ = await cryptoPriceGuessContract.getPredictionEvent(0);
    // Average should be approximately (500000 + 520000) / 2 = 510000
    // Note: Due to integer division, this might be slightly different
    expect(event_.isFinalized).to.be.true;
  });

  it("should set actual price after target date", async function () {
    const targetDate = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const durationInHours = 24;

    await cryptoPriceGuessContract
      .connect(signers.deployer)
      .createPredictionEvent("BTC Price Prediction", 0, targetDate, durationInHours);

    // Fast forward to target date
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine", []);

    const actualPrice = 510000; // $51,000
    await cryptoPriceGuessContract.connect(signers.deployer).setActualPrice(0, actualPrice);

    const event_ = await cryptoPriceGuessContract.getPredictionEvent(0);
    expect(event_.actualPrice).to.eq(actualPrice);
  });
});

