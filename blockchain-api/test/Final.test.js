const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PSO Algorithm Simulation with 4 Nodes (5 Hours)", function () {
  let GlobalContract, globalContract;
  let Node, nodes;
  let accounts;

  before(async function () {
    accounts = await ethers.getSigners();

    // Deploy GlobalContract
    GlobalContract = await ethers.getContractFactory("GlobalContract");
    globalContract = await GlobalContract.deploy();
    await globalContract.waitForDeployment();
    console.log("GlobalContract deployed at:", globalContract.target);

    // Pentru test, folosim 5 ore:
    const initialPosition = [80, 80, 80, 80, 80];       // consum optim de referință: 80 kW pe oră
    const initialVelocity = [0, 0, 0, 0, 0];              // viteze inițiale: 0
    const initialTariff = [100, 100, 100, 100, 100];        // tarif constant 100 unități/kWh
    const initialCapacity = [1000, 1000, 1000, 1000, 1000];  // capacitate maximă rețea: 1000 kW
    const initialRenewableGeneration = [20, 20, 20, 20, 20]; // energie regenerabilă: 20 kW
    const initialBatteryCapacity = [500, 500, 500, 500, 500]; // capacitate baterie: 500 kWh
    const initialBatteryCharge = [300, 300, 300, 300, 300];   // încărcare baterie: 300 kWh
    const initialFlexibleLoad = [50, 50, 50, 50, 50];         // flexible load: 50 kW

    // Valorile de flexibilitate:
    // flexibilityAbove: nodul poate crește consumul cu 30 kW (max 80 + 30 = 110 kW)
    // flexibilityBelow: nodul poate reduce consumul cu 20 kW (min 80 - 20 = 60 kW)
    const flexibilityAbove = [30, 30, 30, 30, 30];
    const flexibilityBelow = [20, 20, 20, 20, 20];

    // Deploy 4 noduri
    Node = await ethers.getContractFactory("Node");
    nodes = [];
    for (let i = 0; i < 4; i++) {
      const node = await Node.deploy(
        globalContract.target,   // adresa GlobalContract (folosim .target pentru ethers v6)
        initialPosition,
        initialVelocity,
        initialTariff,
        initialCapacity,
        initialRenewableGeneration,
        initialBatteryCapacity,
        initialBatteryCharge,
        initialFlexibleLoad,
        flexibilityAbove,
        flexibilityBelow
      );
      await node.waitForDeployment();
      nodes.push(node);
      console.log(`Node ${i + 1} deployed at: ${node.target}`);
    }
  });

  it("Simulates PSO algorithm: nodes send best positions, compute global plan, and update positions/velocities", async function () {
    console.log("\n=== Initial Node Positions ===");
    // Pentru fiecare nod, afișăm poziția inițială prin iterarea peste cele 5 ore.
    for (let i = 0; i < nodes.length; i++) {
      let posArray = [];
      for (let j = 0; j < 5; j++) {
        const pos = await nodes[i].position(j);
        posArray.push(pos.toString());
      }
      console.log(`Node ${i + 1} initial position:`, posArray);
      // Nodul își transmite rezultatul curent către GlobalContract.
      await nodes[i].updateBestPositions();
    }

    // Calculăm planul global optim în GlobalContract.
    await globalContract.computeGlobalOptimalPlan();
    let globalPlan = [];
    for (let j = 0; j < 5; j++) {
      const gp = await globalContract.getGlobalOptimalPlanHour(j);
      globalPlan.push(gp.toString());
    }
    console.log("\n=== Global Optimal Plan (per hour) ===");
    console.log(globalPlan);

    // Fiecare nod își actualizează viteza și poziția folosind planul global.
    console.log("\n=== Updating Node Velocities and Positions ===");
    for (let i = 0; i < nodes.length; i++) {
      await nodes[i].updateVelocityAndPosition();
      let newPosArray = [];
      let newVelArray = [];
      for (let j = 0; j < 5; j++) {
        const pos = await nodes[i].position(j);
        const vel = await nodes[i].velocity(j);
        newPosArray.push(pos.toString());
        newVelArray.push(vel.toString());
      }
      console.log(`Node ${i + 1} updated position:`, newPosArray);
      console.log(`Node ${i + 1} updated velocity:`, newVelArray);
    }
  });
});
