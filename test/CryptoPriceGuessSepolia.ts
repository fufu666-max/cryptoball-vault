import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { CryptoPriceGuess } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("CryptoPriceGuessSepolia", function () {
  let signers: Signers;
  let cryptoPriceGuessContract: CryptoPriceGuess;
  let cryptoPriceGuessContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const CryptoPriceGuessDeployment = await deployments.get("CryptoPriceGuess");
      cryptoPriceGuessContractAddress = CryptoPriceGuessDeployment.address;
      cryptoPriceGuessContract = await ethers.getContractAt(
        "CryptoPriceGuess",
        CryptoPriceGuessDeployment.address
      );
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("create event and submit prediction", async function () {
    steps = 15;

    this.timeout(4 * 40000);

    const targetDate = Math.floor(Date.now() / 1000) + 86400; // 1 day from now
    const durationInHours = 24;

    progress(`Creating prediction event...`);
    const tx1 = await cryptoPriceGuessContract
      .connect(signers.alice)
      .createPredictionEvent("BTC Price Prediction", 0, targetDate, durationInHours);
    await tx1.wait();

    progress(`Event created. Getting event count...`);
    const eventCount = await cryptoPriceGuessContract.getEventCount();
    expect(eventCount).to.be.gt(0);

    progress(`Encrypting price prediction (500000 = $50,000)...`);
    const encryptedPrice = await fhevm
      .createEncryptedInput(cryptoPriceGuessContractAddress, signers.alice.address)
      .add32(500000)
      .encrypt();

    progress(`Submitting encrypted prediction...`);
    const tx2 = await cryptoPriceGuessContract
      .connect(signers.alice)
      .submitPrediction(0, encryptedPrice.handles[0], encryptedPrice.inputProof);
    await tx2.wait();

    progress(`Getting encrypted price sum...`);
    const encryptedSum = await cryptoPriceGuessContract.getEncryptedPriceSum(0);
    expect(encryptedSum).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting encrypted price sum...`);
    const clearSum = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedSum,
      cryptoPriceGuessContractAddress,
      signers.alice
    );
    progress(`Decrypted sum: ${clearSum}`);

    expect(clearSum).to.eq(500000);

    progress(`Checking if user has predicted...`);
    const hasPredicted = await cryptoPriceGuessContract.hasUserPredicted(0, signers.alice.address);
    expect(hasPredicted).to.be.true;

    progress(`Getting event details...`);
    const event_ = await cryptoPriceGuessContract.getPredictionEvent(0);
    expect(event_.totalPredictions).to.eq(1);
    expect(event_.isActive).to.be.true;
  });
});

