const { expect } = require("chai");
const { ethers } = require("hardhat");
require("@nomicfoundation/hardhat-chai-matchers");

describe("GlobalContract", function () {
  let GlobalContract, globalContract;
  let owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    GlobalContract = await ethers.getContractFactory("GlobalContract");
    globalContract = await GlobalContract.deploy();
    await globalContract.waitForDeployment();
  });

  it("should update node result for a new node and set numHours", async function () {
    const newPosition = [10, 20, 30];
    const newScore = 100;
    const newFlexibilityWeight = [5, 3, 2];

    await globalContract.connect(addr1).updateNodeResult(newPosition, newScore, newFlexibilityWeight);

    const nodeResult = await globalContract.nodeResults(addr1.address);
    expect(nodeResult.bestScore).to.equal(BigInt(newScore));

    const storedBest = (await globalContract.getBestPosition(addr1.address)).map(n => Number(n));
    expect(storedBest).to.deep.equal(newPosition);

    expect(nodeResult.exists).to.equal(true);

    // numHours should be set to the length of newPosition (3)
    expect(Number(await globalContract.numHours())).to.equal(newPosition.length);
  });

  it("should update node result for an existing node with a better score", async function () {
    const initialPosition = [10, 20, 30];
    const initialScore = 100;
    const initialFlexibilityWeight = [5, 3, 2];
    await globalContract.connect(addr1).updateNodeResult(initialPosition, initialScore, initialFlexibilityWeight);

    const betterPosition = [5, 15, 25];
    const betterScore = 50;
    const betterFlexibilityWeight = [5, 3, 2];
    await globalContract.connect(addr1).updateNodeResult(betterPosition, betterScore, betterFlexibilityWeight);

    const nodeResult = await globalContract.nodeResults(addr1.address);
    expect(nodeResult.bestScore).to.equal(BigInt(betterScore));

    const storedBest = (await globalContract.getBestPosition(addr1.address)).map(n => Number(n));
    expect(storedBest).to.deep.equal(betterPosition);
  });

  it("should not update node result if new score is worse", async function () {
    const initialPosition = [10, 20, 30];
    const initialScore = 100;
    const initialFlexibilityWeight = [5, 3, 2];
    await globalContract.connect(addr1).updateNodeResult(initialPosition, initialScore, initialFlexibilityWeight);

    const worsePosition = [1, 2, 3];
    const worseScore = 150;
    const worseFlexibilityWeight = [5, 3, 2];
    await globalContract.connect(addr1).updateNodeResult(worsePosition, worseScore, worseFlexibilityWeight);

    const nodeResult = await globalContract.nodeResults(addr1.address);
    // Valorile trebuie să rămână cele inițiale
    expect(nodeResult.bestScore).to.equal(BigInt(initialScore));

    const storedBest = (await globalContract.getBestPosition(addr1.address)).map(n => Number(n));
    expect(storedBest).to.deep.equal(initialPosition);
  });

  it("should revert updateNodeResult if newPosition length doesn't match numHours", async function () {
    const validPosition = [10, 20, 30];
    const validScore = 100;
    const validFlexibilityWeight = [5, 3, 2];
    await globalContract.connect(addr1).updateNodeResult(validPosition, validScore, validFlexibilityWeight);

    // Încercăm să actualizăm cu un vector de lungime diferită (ex. lungime 2)
    const invalidPosition = [5, 15];
    const invalidScore = 80;
    const invalidFlexibilityWeight = [5, 3];
    await expect(
      globalContract.connect(addr2).updateNodeResult(invalidPosition, invalidScore, invalidFlexibilityWeight)
    ).to.be.revertedWith("Dimensiune necorespunzatoare");
  });

  it("should compute global optimal plan correctly", async function () {
    // Setăm rezultatele pentru două noduri (cu același număr de ore: 3)
    const position1 = [10, 20, 30];
    const score1 = 100;
    const flexibility1 = [5, 3, 2];
    await globalContract.connect(addr1).updateNodeResult(position1, score1, flexibility1);

    const position2 = [20, 30, 40];
    const score2 = 80;
    const flexibility2 = [5, 3, 2];
    await globalContract.connect(addr2).updateNodeResult(position2, score2, flexibility2);

    // Calculăm planul global optim
    await globalContract.computeGlobalOptimalPlan();

    // Pentru fiecare oră, media ar trebui să fie:
    // ora 0: (10 + 20) / 2 = 15, ora 1: (20 + 30) / 2 = 25, ora 2: (30 + 40) / 2 = 35
    const expectedPlan = [15, 25, 35];

    const planArray = await globalContract.getGlobalOptimalPlanArray();
    expect(planArray.map(n => Number(n))).to.deep.equal(expectedPlan);

    // Testăm și funcția getGlobalOptimalPlanHour pentru fiecare oră
    for (let i = 0; i < expectedPlan.length; i++) {
      const hourValue = await globalContract.getGlobalOptimalPlanHour(i);
      expect(Number(hourValue)).to.equal(expectedPlan[i]);
    }
  });

  it("should revert computeGlobalOptimalPlan if no nodes registered", async function () {
    await expect(globalContract.computeGlobalOptimalPlan()).to.be.revertedWith("Niciun nod inregistrat");
  });

  it("should revert getGlobalOptimalPlanHour for out-of-range hour", async function () {
    const newPosition = [10, 20, 30];
    const newScore = 100;
    const flexibility = [5, 3, 2];
    await globalContract.connect(addr1).updateNodeResult(newPosition, newScore, flexibility);

    await expect(globalContract.getGlobalOptimalPlanHour(3)).to.be.revertedWith("Ora in afara intervalului");
  });
});
