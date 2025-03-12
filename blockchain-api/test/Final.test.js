const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadCSVData } = require("../scripts/loadCSVData");

describe("PSO Algorithm Simulation with Nodes from CSV", function () {
    let GlobalContract, globalContract;
    let Node, nodes;
    let accounts;
    let nodeParams;

    before(async function () {
        accounts = await ethers.getSigners();
        nodeParams = await loadCSVData(); // Load node parameters from CSV
        console.log("🔹 Node parameters loaded:", JSON.stringify(nodeParams, null, 2));

        // Deploy GlobalContract
        GlobalContract = await ethers.getContractFactory("GlobalContract");
        globalContract = await GlobalContract.deploy();
        await globalContract.waitForDeployment();
        console.log("✅ GlobalContract deployed at:", globalContract.target);

        // Deploy Nodes using CSV data (Fix: Convert read-only arrays to mutable ones)
        Node = await ethers.getContractFactory("Node");
        nodes = [];
        for (let i = 0; i < nodeParams.length; i++) {
            const params = nodeParams[i];

            const node = await Node.deploy(
                globalContract.target,
                Array.from(params.initialPosition),  // Ensure it's mutable
                Array.from(params.initialVelocity),
                Array.from(params.initialTariff),
                Array.from(params.initialCapacity),
                Array.from(params.initialRenewableGeneration),
                Array.from(params.initialBatteryCapacity),
                Array.from(params.initialBatteryCharge),
                Array.from(params.initialFlexibleLoad),
                Array.from(params.flexibilityAbove),
                Array.from(params.flexibilityBelow)
            );

            await node.waitForDeployment();
            nodes.push(node);
            console.log(`✅ Node ${i + 1} deployed at:`, node.target);
        }
    });

    it("Simulates PSO algorithm with Nodes from CSV", async function () {
        console.log("\n=== Initial Node Positions ===");
        for (let i = 0; i < nodes.length; i++) {
            let posArray = Array.from(await nodes[i].getPosition()); // Convert to mutable
            console.log(`Node ${i + 1} initial position:`, posArray.map(p => p.toString()));
            await nodes[i].updateBestPositions();
        }

        // Compute initial global plan
        await globalContract.computeGlobalOptimalPlan();
        console.log("\n=== Global Optimal Plan (Initially) ===");
        let globalPlan = Array.from(await globalContract.getGlobalOptimalPlanArray());
        console.log(globalPlan.map(gp => gp.toString()));

        // Helper: Get total network cost
        async function getTotalNetworkCost() {
            let totalCost = BigInt(0);
            for (let i = 0; i < nodes.length; i++) {
                let pos = Array.from(await nodes[i].getPosition());
                let cost = await nodes[i].objectiveFunction(pos);
                totalCost += BigInt(cost.toString());
            }
            return totalCost;
        }

        // Store initial total cost
        let totalCostBefore = await getTotalNetworkCost();
        console.log("💰 Total network cost BEFORE optimization:", totalCostBefore.toString());

        // Run PSO iterations
        const iterations = 8;
        for (let iter = 0; iter < iterations; iter++) {
            console.log(`\n--- Iteration ${iter + 1} ---`);

            // Update best positions for each node
            for (let i = 0; i < nodes.length; i++) {
                await nodes[i].updateBestPositions();
            }

            // Compute new global plan
            await globalContract.computeGlobalOptimalPlan();
            let currentGlobalPlan = Array.from(await globalContract.getGlobalOptimalPlanArray());
            console.log(`Iteration ${iter + 1} - Global Optimal Plan:`, currentGlobalPlan.map(gp => gp.toString()));

            // Update velocities and positions
            for (let i = 0; i < nodes.length; i++) {
                await nodes[i].updateVelocityAndPosition();
            }

            // Update best positions again
            for (let i = 0; i < nodes.length; i++) {
                await nodes[i].updateBestPositions();
            }

            // Print updated positions
            for (let i = 0; i < nodes.length; i++) {
                let posArray = Array.from(await nodes[i].getPosition());
                console.log(`Iteration ${iter + 1} - Node ${i + 1} position:`, posArray.map(p => p.toString()));
            }

            // Compute total cost after iteration
            let currentTotalCost = await getTotalNetworkCost();
            console.log(`Iteration ${iter + 1} - Total network cost:`, currentTotalCost.toString());
        }

        // Final cost comparison
        let totalCostAfter = await getTotalNetworkCost();
        console.log("\n💰 Total network cost AFTER optimization:", totalCostAfter.toString());
        expect(Number(totalCostAfter)).to.be.below(Number(totalCostBefore));

        // Final node positions
        console.log("\n=== Final Node Positions ===");
        for (let i = 0; i < nodes.length; i++) {
            let finalPos = Array.from(await nodes[i].getPosition());
            console.log(`Node ${i + 1} final position:`, finalPos.map(p => p.toString()));
        }
    });
});


//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
// const { expect } = require("chai");
// const { ethers } = require("hardhat");

// describe("PSO Algorithm Simulation with 4 Nodes (5 Hours)", function () {
//   let GlobalContract, globalContract;
//   let Node, nodes;
//   let accounts;

//   before(async function () {
//     accounts = await ethers.getSigners();

//     // Deploy GlobalContract
//     GlobalContract = await ethers.getContractFactory("GlobalContract");
//     globalContract = await GlobalContract.deploy();
//     await globalContract.waitForDeployment();
//     console.log("GlobalContract deployed at:", globalContract.target);

//     const nodeParams = [
//       {
//         initialPosition: [40, 20, 10, 890, 30],
//         initialVelocity: [0, 0, 0, 0, 0],
//         initialTariff: [100, 10, 4, 500, 100],
//         initialCapacity: [230, 100, 10000, 60000, 300],
//         initialRenewableGeneration: [20, 40, 10, 200, 50],
//         initialBatteryCapacity: [401, 320, 50, 5000, 500],
//         initialBatteryCharge: [300, 300, 300, 300, 300],
//         initialFlexibleLoad: [10, 60, 40, 20, 50],
//         flexibilityAbove: [70, 30, 60, 300, 30],
//         flexibilityBelow: [20, 10, 40, 20, 50]
//       },
//       {
//         initialPosition: [80, 90, 100, 110, 120],
//         initialVelocity: [1, 2, 3, 4, 5],
//         initialTariff: [90, 80, 70, 60, 50],
//         initialCapacity: [1000, 1000, 1000, 1000, 1000],
//         initialRenewableGeneration: [10, 15, 20, 25, 30],
//         initialBatteryCapacity: [500, 500, 500, 500, 500],
//         initialBatteryCharge: [250, 250, 250, 250, 250],
//         initialFlexibleLoad: [20, 20, 20, 20, 20],
//         flexibilityAbove: [50, 50, 50, 50, 50],
//         flexibilityBelow: [10, 10, 10, 10, 10]
//       },
//       {
//         initialPosition: [-120, -50, 420, 5, -420],
//         initialVelocity: [-1, -1, -1, -1, -1],
//         initialTariff: [110, 120, 130, 140, 150],
//         initialCapacity: [800, 800, 800, 800, 800],
//         initialRenewableGeneration: [5, 5, 5, 5, 5],
//         initialBatteryCapacity: [400, 400, 400, 400, 400],
//         initialBatteryCharge: [200, 200, 200, 200, 200],
//         initialFlexibleLoad: [30, 30, 30, 30, 30],
//         flexibilityAbove: [40, 40, 40, 40, 40],
//         flexibilityBelow: [20, 20, 20, 20, 20]
//       },
//       {
//         initialPosition: [100, 110, 120, 130, 140],
//         initialVelocity: [5, 4, 3, 2, 1],
//         initialTariff: [50, 55, 60, 65, 70],
//         initialCapacity: [1200, 1200, 1200, 1200, 1200],
//         initialRenewableGeneration: [30, 30, 30, 30, 30],
//         initialBatteryCapacity: [600, 600, 600, 600, 600],
//         initialBatteryCharge: [400, 400, 400, 400, 400],
//         initialFlexibleLoad: [15, 15, 15, 15, 15],
//         flexibilityAbove: [80, 80, 80, 80, 80],
//         flexibilityBelow: [25, 25, 25, 25, 25]
//       }
//     ];
    
//     // Deploy 4 noduri folosind valorile definite
//     Node = await ethers.getContractFactory("Node");
//     nodes = [];
//     for (let i = 0; i < nodeParams.length; i++) {
//       const params = nodeParams[i];
//       const node = await Node.deploy(
//         globalContract.target, // adresa GlobalContract
//         params.initialPosition,
//         params.initialVelocity,
//         params.initialTariff,
//         params.initialCapacity,
//         params.initialRenewableGeneration,
//         params.initialBatteryCapacity,
//         params.initialBatteryCharge,
//         params.initialFlexibleLoad,
//         params.flexibilityAbove,
//         params.flexibilityBelow
//       );
//       await node.waitForDeployment();
//       nodes.push(node);
//       console.log(`Node ${i + 1} deployed at: ${node.target}`);
//     }
//   });



//   it("Simulates PSO algorithm: nodes send best positions, compute global plan, update positions/velocities, and show total cost per iteration", async function () {
//     // Helper: reconstruiește vectorul de poziții pentru un nod (presupunem 5 ore)
//     async function getPositionArray(node) {
//       let posArray = [];
//       for (let j = 0; j < 5; j++) {
//         posArray.push((await node.position(j)).toString());
//       }
//       return posArray;
//     }
  
//     // Helper: calculează costul total al rețelei (suma costurilor tuturor nodurilor)
//     async function getTotalNetworkCost() {
//       let totalCost = BigInt(0);
//       for (let i = 0; i < nodes.length; i++) {
//         const pos = await getPositionArray(nodes[i]);
//         const cost = await nodes[i].objectiveFunction(pos);
//         totalCost += BigInt(cost.toString());
//       }
//       return totalCost;
//     }
  
//     console.log("\n=== Initial Node Positions ===");
//     // Pentru fiecare nod, afișează poziția inițială (pe 5 ore)
//     for (let i = 0; i < nodes.length; i++) {
//       let posArray = [];
//       for (let j = 0; j < 5; j++) {
//         const pos = await nodes[i].position(j);
//         posArray.push(pos.toString());
//       }
//       console.log(`Node ${i + 1} initial position:`, posArray);
//       // Nodul își transmite soluția curentă către GlobalContract.
//       await nodes[i].updateBestPositions();
//     }
  
//     // Afișează tariful efectiv pentru fiecare nod înainte de optimizare.
//     console.log("\n=== Effective Tariffs BEFORE Optimization ===");
//     for (let i = 0; i < nodes.length; i++) {
//       let tariffsBefore = [];
//       for (let j = 0; j < 5; j++) {
//         const consumption = await nodes[i].position(j);
//         const effectiveTariff = await nodes[i].getEffectiveTariff(j, consumption);
//         tariffsBefore.push(effectiveTariff.toString());
//       }
//       console.log(`Node ${i + 1} effective tariffs before:`, tariffsBefore);
//     }
  
//     // Calculăm planul global optim inițial în GlobalContract.
//     await globalContract.computeGlobalOptimalPlan();
//     let globalPlan = [];
//     for (let j = 0; j < 5; j++) {
//       const gp = await globalContract.getGlobalOptimalPlanHour(j);
//       globalPlan.push(gp.toString());
//     }
//     console.log("\n=== Global Optimal Plan (initially) ===");
//     console.log(globalPlan);
  
//     // Afișăm costul total inițial.
//     let totalCostBefore = await getTotalNetworkCost();
//     console.log("Total network cost BEFORE iterations:", totalCostBefore.toString());
  
//     // Rulăm mai multe iterații de optimizare
//     const iterations = 8;
//     for (let iter = 0; iter < iterations; iter++) {
//       console.log(`\n--- Iteration ${iter + 1} ---`);
//       // Nodurile își actualizează soluția personală înainte de actualizare.
//       for (let i = 0; i < nodes.length; i++) {
//         await nodes[i].updateBestPositions();
//       }
//       // Actualizăm planul global la fiecare iterație.
//       await globalContract.computeGlobalOptimalPlan();
//       // Afișăm noul plan global.
//       let currentGlobalPlan = [];
//       for (let j = 0; j < 5; j++) {
//         const gp = await globalContract.getGlobalOptimalPlanHour(j);
//         currentGlobalPlan.push(gp.toString());
//       }
//       console.log(`Iteration ${iter + 1} - Global Optimal Plan:`, currentGlobalPlan);
//       // Nodurile își actualizează viteza și poziția.
//       for (let i = 0; i < nodes.length; i++) {
//         await nodes[i].updateVelocityAndPosition();
//       }
//       // Actualizează din nou soluția personală pentru a reflecta noile poziții.
//       for (let i = 0; i < nodes.length; i++) {
//         await nodes[i].updateBestPositions();
//       }
//       // Afișăm pozițiile după această iterație.
//       for (let i = 0; i < nodes.length; i++) {
//         let posArray = [];
//         for (let j = 0; j < 5; j++) {
//           const pos = await nodes[i].position(j);
//           posArray.push(pos.toString());
//         }
//         console.log(`Iteration ${iter + 1} - Node ${i + 1} position:`, posArray);
//       }
//       // Calculăm și afișăm costul total al rețelei după această iterație.
//       let currentTotalCost = await getTotalNetworkCost();
//       console.log(`Iteration ${iter + 1} - Total network cost:`, currentTotalCost.toString());
//     }
    
//     // Afișăm tariful efectiv pentru fiecare nod după optimizare.
//     console.log("\n=== Effective Tariffs AFTER Optimization ===");
//     for (let i = 0; i < nodes.length; i++) {
//       let tariffsAfter = [];
//       for (let j = 0; j < 5; j++) {
//         const consumption = await nodes[i].position(j);
//         const effectiveTariff = await nodes[i].getEffectiveTariff(j, consumption);
//         tariffsAfter.push(effectiveTariff.toString());
//       }
//       console.log(`Node ${i + 1} effective tariffs after:`, tariffsAfter);
//     }
    
//     // La final, afișăm pozițiile finale ale nodurilor.
//     console.log("\n=== Final Node Positions ===");
//     for (let i = 0; i < nodes.length; i++) {
//       let finalPos = [];
//       for (let j = 0; j < 5; j++) {
//         const pos = await nodes[i].position(j);
//         finalPos.push(pos.toString());
//       }
//       console.log(`Node ${i + 1} final position:`, finalPos);
//     }
//   });
  
  
  
///+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

  // it("should reduce total network cost and update positions after multiple iterations", async function () {
  //   // Helper: reconstruiește vectorul de poziții pentru un nod (presupunem 5 ore)
  //   async function getPositionArray(node) {
  //     let posArray = [];
  //     for (let j = 0; j < 5; j++) {
  //       posArray.push((await node.position(j)).toString());
  //     }
  //     return posArray;
  //   }
  
  //   // Stocăm pozițiile inițiale și costul total inițial
  //   let initialPositions = [];
  //   let totalCostBefore = BigInt(0);
  //   for (let i = 0; i < nodes.length; i++) {
  //     const pos = await getPositionArray(nodes[i]);
  //     initialPositions.push(pos);
  //     const cost = await nodes[i].objectiveFunction(pos);
  //     totalCostBefore += BigInt(cost.toString());
  //   }
  //   console.log("Total cost BEFORE iterations:", totalCostBefore.toString());
  //   console.log("Initial positions:", initialPositions);
  
  //   // Rulăm mai multe iterații de optimizare
  //   const iterations = 20;
  //   for (let iter = 0; iter < iterations; iter++) {
  //     // Fiecare nod își actualizează cea mai bună soluție înainte de a actualiza viteza
  //     for (let i = 0; i < nodes.length; i++) {
  //       await nodes[i].updateBestPositions();
  //     }
  //     // Apoi se actualizează viteza și poziția
  //     for (let i = 0; i < nodes.length; i++) {
  //       await nodes[i].updateVelocityAndPosition();
  //     }
  //     // După actualizare, nodurile își recalculează soluția personală pe baza noilor poziții
  //     for (let i = 0; i < nodes.length; i++) {
  //       await nodes[i].updateBestPositions();
  //     }
  //   }
  
  //   // Stocăm pozițiile finale și costul total după iterații
  //   let finalPositions = [];
  //   let totalCostAfter = BigInt(0);
  //   for (let i = 0; i < nodes.length; i++) {
  //     const pos = await getPositionArray(nodes[i]);
  //     finalPositions.push(pos);
  //     const cost = await nodes[i].objectiveFunction(pos);
  //     totalCostAfter += BigInt(cost.toString());
  //   }
  //   console.log("Total cost AFTER iterations:", totalCostAfter.toString());
  //   console.log("Final positions:", finalPositions);
  
  //   // Verificăm că costul total a scăzut
  //   expect(totalCostAfter).to.be.below(totalCostBefore);
  
  //   // Verificăm că cel puțin o poziție s-a modificat pentru fiecare nod
  //   for (let i = 0; i < nodes.length; i++) {
  //     expect(finalPositions[i]).to.not.deep.equal(initialPositions[i]);
  //   }
  // });

  
//});
