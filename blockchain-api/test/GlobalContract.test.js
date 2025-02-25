const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GlobalContract", function () {
  let GlobalContract, globalContract;

  beforeEach(async () => {
    GlobalContract = await ethers.getContractFactory("GlobalContract");
    globalContract = await GlobalContract.deploy();
    await globalContract.waitForDeployment();
  });

  it("Should initialize with max score", async function () {
    const globalBestScore = await globalContract.globalBestScore();
    expect(globalBestScore).to.equal(ethers.MaxUint256);
  });

  it("Should update global best position and score", async function () {
    const newPosition = [10, 20, 30];
    const newScore = 100;

    await globalContract.updateGlobalBestPosition(newPosition, newScore);

    const globalBestPosition = await globalContract.getGlobalBestPosition();
    const globalBestScore = await globalContract.globalBestScore();

    expect(globalBestPosition.map(n => Number(n))).to.deep.equal(newPosition);
    expect(Number(globalBestScore)).to.equal(newScore);
  });

  it("Should not update if new score is worse", async function () {
    const betterPosition = [10, 20, 30];
    const betterScore = 100;
    await globalContract.updateGlobalBestPosition(betterPosition, betterScore);

    const worsePosition = [5, 15, 25];
    const worseScore = 200;
    await globalContract.updateGlobalBestPosition(worsePosition, worseScore);

    const globalBestPosition = await globalContract.getGlobalBestPosition();
    const globalBestScore = await globalContract.globalBestScore();

    expect(globalBestPosition.map(n => Number(n))).to.deep.equal(betterPosition);
    expect(Number(globalBestScore)).to.equal(betterScore);
  });
});
