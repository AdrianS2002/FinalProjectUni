const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Node Contract", function () {
  let Node, node, GlobalContract, globalContract, accounts;

  beforeEach(async () => {
    accounts = await ethers.getSigners();

    // Deploy GlobalContract
    GlobalContract = await ethers.getContractFactory("GlobalContract");
    globalContract = await GlobalContract.deploy();
    await globalContract.waitForDeployment();

    // Pentru sincronizare, transmitem o soluție inițială de la un nod în GlobalContract
    // (Aceasta nu este strict necesară pentru testele Node, dar ajută la popularea mapping-ului din GlobalContract)
    await globalContract.connect(accounts[0]).updateNodeResult([10, 20, 30], 100);

    // Deploy Node cu cei 9 parametri necesari
    Node = await ethers.getContractFactory("Node");

    const initialPosition = [500, 600, 700];
    const initialVelocity = [10, 15, -5];
    const initialTariff = [20, 18, 25];
    const initialCapacity = [1000, 1200, 1100];
    const initialRenewableGeneration = [0, 3, 1];
    const initialBatteryCapacity = [1000, 1000, 1000];
    const initialBatteryCharge = [400, 700, 500];
    const initialFlexibleLoad = [200, 150, 100];


    node = await Node.deploy(
      globalContract.target, // adresa GlobalContract (folosind .target pentru ethers v6)
      initialPosition,
      initialVelocity,
      initialTariff,
      initialCapacity,
      initialRenewableGeneration,
      initialBatteryCapacity,
      initialBatteryCharge,
      initialFlexibleLoad
    );
    await node.waitForDeployment();
  });

  it("Should initialize with default values", async function () {
    // personalBestScore trebuie să fie egal cu uint.max, adică ethers.constants.MaxUint256
    const bestScore = await node.personalBestScore();
    console.log("🔹 Initial Best Score:", bestScore.toString());
    expect(bestScore).to.equal(ethers.MaxUint256);
  });

  it("Should update personal best score after calling updateBestPositions", async function () {
    // Apelăm updateBestPositions pentru a actualiza scorul personal
    const bestScoreBefore = await node.personalBestScore();
    console.log("🔹 Best Score Before Update:", bestScoreBefore.toString());

    await node.updateBestPositions();
    const updatedBestScore = await node.personalBestScore();
    // Verificăm că scorul s-a actualizat (este mai mic decât valoarea maximă inițială)
    console.log("✅ Best Score After Update:", updatedBestScore.toString());
    expect(updatedBestScore < ethers.MaxUint256).to.be.true;
  });


  it("Should update best positions and reflect in GlobalContract", async function () {
    console.log("-------------------------------------------------------");
    const initialBestPos = await node.personalBestPosition(0);
    console.log("🔹 Initial Best Position:", initialBestPos.toString());

    // Nodul își actualizează cea mai bună soluție personală și o transmite către GlobalContract
    await node.updateBestPositions();

    const updatedBestPos = await node.personalBestPosition(0);
    console.log("✅ Best Position After Update:", updatedBestPos.toString());

    const bestPositionInGlobal = await globalContract.getBestPosition(node.target);
    console.log("🌍 Best Position in GlobalContract:", bestPositionInGlobal.map(n => n.toString()));

    const personalBestScore = await node.personalBestScore();
    const nodeResult = await globalContract.nodeResults(node.target);
    
    expect(nodeResult.bestScore).to.equal(personalBestScore);
});

  it("Should update velocity and position", async function () {
    let initPos = [], initVel = [], debugLogs = [];
    const len = 3;

    for (let i = 0; i < len; i++) {
      const pos = await node.position(i);
      const vel = await node.velocity(i);
      initPos.push(Number(pos));
      initVel.push(Number(vel));
    }


    console.log("🚀 Initial Position:", initPos);
    console.log("🚀 Initial Velocity:", initVel);
    // 📌 ACTUALIZĂM GLOBAL PLAN CU VALORI NOI
    await globalContract.connect(accounts[0]).updateNodeResult([5, 15, 25], 50);
    await globalContract.computeGlobalOptimalPlan();
    await node.updateBestPositions();

    let globalPlan = [];
    for (let i = 0; i < len; i++) {
      const globalValue = await globalContract.getGlobalOptimalPlanHour(i);
      globalPlan.push(Number(globalValue));
    }

    console.log("🌍 Global Plan:", globalPlan);

    expect(globalPlan.some(value => value !== 0)).to.be.true;

    await node.updateVelocityAndPosition();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Așteaptă logurile


    let newPos = [], newVel = [];
    for (let i = 0; i < len; i++) {
      const pos = await node.position(i);
      const vel = await node.velocity(i);
      newPos.push(Number(pos));
      newVel.push(Number(vel));
    }

    console.log("✅ New Position:", newPos);
    console.log("✅ New Velocity:", newVel);

    expect(newPos.some((pos, i) => pos !== initPos[i])).to.be.true;
    expect(newVel.some((vel, i) => vel !== initVel[i])).to.be.true;
  });

});
