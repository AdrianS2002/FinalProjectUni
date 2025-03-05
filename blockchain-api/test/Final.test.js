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

   
    const nodeParams = [
      {
        initialPosition: [40, 20, 10, 890, 30],
        initialVelocity: [0, 0, 0, 0, 0],
        initialTariff: [100, 10, 4, 500, 100],
        initialCapacity: [230, 100, 10000, 60000, 300],
        initialRenewableGeneration: [20, 40, 10, 200, 50],
        initialBatteryCapacity: [401, 320, 50, 5000, 500],
        initialBatteryCharge: [300, 300, 300, 300, 300],
        initialFlexibleLoad: [10, 60, 40, 20, 50],
        flexibilityAbove: [70, 30, 60, 300, 30],
        flexibilityBelow: [20, 10, 40, 20, 50]
      },
      {
        initialPosition: [80, 90, 100, 110, 120],
        initialVelocity: [1, 2, 3, 4, 5],
        initialTariff: [90, 80, 70, 60, 50],
        initialCapacity: [1000, 1000, 1000, 1000, 1000],
        initialRenewableGeneration: [10, 15, 20, 25, 30],
        initialBatteryCapacity: [500, 500, 500, 500, 500],
        initialBatteryCharge: [250, 250, 250, 250, 250],
        initialFlexibleLoad: [20, 20, 20, 20, 20],
        flexibilityAbove: [50, 50, 50, 50, 50],
        flexibilityBelow: [10, 10, 10, 10, 10]
      },
      {
        initialPosition: [-120, -50, 420, 5, -420],
        initialVelocity: [-1, -1, -1, -1, -1],
        initialTariff: [110, 120, 130, 140, 150],
        initialCapacity: [800, 800, 800, 800, 800],
        initialRenewableGeneration: [5, 5, 5, 5, 5],
        initialBatteryCapacity: [400, 400, 400, 400, 400],
        initialBatteryCharge: [200, 200, 200, 200, 200],
        initialFlexibleLoad: [30, 30, 30, 30, 30],
        flexibilityAbove: [40, 40, 40, 40, 40],
        flexibilityBelow: [20, 20, 20, 20, 20]
      },
      {
        initialPosition: [100, 110, 120, 130, 140],
        initialVelocity: [5, 4, 3, 2, 1],
        initialTariff: [50, 55, 60, 65, 70],
        initialCapacity: [1200, 1200, 1200, 1200, 1200],
        initialRenewableGeneration: [30, 30, 30, 30, 30],
        initialBatteryCapacity: [600, 600, 600, 600, 600],
        initialBatteryCharge: [400, 400, 400, 400, 400],
        initialFlexibleLoad: [15, 15, 15, 15, 15],
        flexibilityAbove: [80, 80, 80, 80, 80],
        flexibilityBelow: [25, 25, 25, 25, 25]
      }
    ];

    // Deploy 4 noduri folosind valorile definite
    Node = await ethers.getContractFactory("Node");
    nodes = [];
    for (let i = 0; i < nodeParams.length; i++) {
      const params = nodeParams[i];
      const node = await Node.deploy(
        globalContract.target, // adresa GlobalContract
        params.initialPosition,
        params.initialVelocity,
        params.initialTariff,
        params.initialCapacity,
        params.initialRenewableGeneration,
        params.initialBatteryCapacity,
        params.initialBatteryCharge,
        params.initialFlexibleLoad,
        params.flexibilityAbove,
        params.flexibilityBelow
      );
      await node.waitForDeployment();
      nodes.push(node);
      console.log(`Node ${i + 1} deployed at: ${node.target}`);
    }
  });

  it("Simulates PSO algorithm: nodes send best positions, compute global plan, and update positions/velocities", async function () {
    console.log("\n=== Initial Node Positions ===");
    // Pentru fiecare nod, afișăm poziția inițială (pe 5 ore)
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
    
    // La final, afișăm pozițiile finale ale nodurilor:
    console.log("\n=== Final Node Positions ===");
    for (let i = 0; i < nodes.length; i++) {
      let finalPos = [];
      for (let j = 0; j < 5; j++) {
        const pos = await nodes[i].position(j);
        finalPos.push(pos.toString());
      }
      console.log(`Node ${i + 1} final position:`, finalPos);
    }
  });
});
