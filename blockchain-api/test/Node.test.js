const { expect } = require("chai");
const { ethers } = require("hardhat");
const { isHexString } = require("ethers"); 

describe("Node Contract", function () {
  let Node, node, GlobalContract, globalContract, accounts;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
  
    GlobalContract = await ethers.getContractFactory("GlobalContract");
    globalContract = await GlobalContract.deploy();
    await globalContract.waitForDeployment();
  
    await globalContract.updateGlobalBestPosition([10, 20, 30], 100); // Asigurăm sincronizarea inițială
  
    Node = await ethers.getContractFactory("Node");
    const initialPosition = [10, 20, 30];
    const initialVelocity = [1, 1, 1];
    const initialTariff = [100, 200, 300];
    const initialCapacity = [50, 50, 50];
    const renewableGeneration = [10, 10, 10];
    const batteryCapacity = [20, 20, 20];
    const batteryCharge = [10, 10, 10];
    const flexibleLoad = [5, 5, 5];
    const penaltyRate = 200;
    const peakDemandThreshold = 100;
    const peakDemandPenalty = 300;
  
    node = await Node.deploy(
      globalContract.target,
      initialPosition,
      initialVelocity,
      initialTariff,
      initialCapacity,
      renewableGeneration,
      batteryCapacity,
      batteryCharge,
      flexibleLoad,
      penaltyRate,
      peakDemandThreshold,
      peakDemandPenalty
    );
    await node.waitForDeployment();
  });

  it("Should initialize with default values", async function () {
    const bestScore = await node.personalBestScore();
    expect(bestScore).to.equal(ethers.MaxUint256);
  });

  it("Should update personal best score after optimization", async function () {
    await node.updateBestPositions();
    const updatedBestScore = await node.personalBestScore();
    expect(Number(updatedBestScore)).to.be.below(Number(ethers.MaxUint256));
  });
  

  it("Should respect global best position updates", async function () {
    // Actualizează poziția globală apelând metoda din Node
    await node.updateBestPositions();
  
    // Obține pozițiile
    const globalBest = await globalContract.getGlobalBestPosition();
    const personalBest = await node.getPersonalBestPosition();
  
    // Verifică dacă poziția globală a fost actualizată automat
    expect(globalBest.map(Number)).to.deep.equal(personalBest.map(Number));
  });
  
  

  it("Should update velocity and position", async function () {
    await node.updateVelocityAndPosition();
  
    for (let i = 0; i < 3; i++) {
      const updatedPosition = await node.position(i);
      expect(updatedPosition).to.be.a("bigint");
    }
  });
  
  
});
