const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Synchronization between Node and GlobalContract", function () {
    let GlobalContract, globalContract;
    let Node, node;
    let owner, addr1;

    beforeEach(async function () {
        [owner, addr1] = await ethers.getSigners();

        // Deploy GlobalContract
        GlobalContract = await ethers.getContractFactory("GlobalContract");
        globalContract = await GlobalContract.deploy();
        await globalContract.waitForDeployment();

        // Deploy Node contract
        Node = await ethers.getContractFactory("Node");
        node = await Node.deploy(
            globalContract.target, // Se folosește .target în ethers v6
            [10, 20, 30], // initialPosition
            [1, 1, 1], // initialVelocity
            [100, 200, 300], // initialTariff
            [50, 50, 50], // initialCapacity
            [10, 15, 20], // initialRenewableGeneration
            [100, 100, 100], // initialBatteryCapacity
            [50, 50, 50], // initialBatteryCharge
            [5, 10, 15] // initialFlexibleLoad
        );
        await node.waitForDeployment();
    });

    it("should initialize lastUpdatedTimestamp as 0", async function () {
        const timestamp = await globalContract.getLastUpdatedTimestamp();
        expect(timestamp).to.equal(0);
    });

    it("should update lastUpdatedTimestamp after computing optimal plan", async function () {
        // Nodul trimite un rezultat inițial către GlobalContract
        await globalContract.connect(addr1).updateNodeResult([10, 20, 30], 100);

        // Obținem timestamp-ul înainte de update
        const initialTimestamp = await globalContract.getLastUpdatedTimestamp();

        // Computăm planul global (ar trebui să schimbe timestamp-ul)
        await globalContract.computeGlobalOptimalPlan();

        // Obținem timestamp-ul nou
        const newTimestamp = await globalContract.getLastUpdatedTimestamp();
        expect(Number(newTimestamp)).to.be.greaterThan(Number(initialTimestamp));
    });

    it("should not update node position if global timestamp hasn't changed", async function () {
        // Obținem timestamp-ul global inițial
        const initialGlobalTimestamp = await globalContract.getLastUpdatedTimestamp();

        // Nodul încearcă să își actualizeze poziția fără un update global
        await expect(node.updateVelocityAndPosition()).to.not.be.reverted;

        // Nodul ar trebui să aibă același timestamp local ca cel global
        const nodeTimestamp = await node.lastKnownGlobalTimestamp();
        expect(nodeTimestamp).to.equal(initialGlobalTimestamp);
    });

    it("should update node position when global timestamp changes", async function () {
        // Obținem timestamp-ul inițial
        const initialGlobalTimestamp = await globalContract.getLastUpdatedTimestamp();

        // Actualizăm un nod pentru a permite un nou calcul global
        await globalContract.connect(addr1).updateNodeResult([15, 25, 35], 90);
        await globalContract.computeGlobalOptimalPlan();

        // Obținem timestamp-ul nou din contractul global
        const newGlobalTimestamp = await globalContract.getLastUpdatedTimestamp();
        expect(Number(newGlobalTimestamp)).to.be.greaterThan(Number(initialGlobalTimestamp));

        // Nodul trebuie să-și actualizeze poziția
        await expect(node.updateVelocityAndPosition()).to.not.be.reverted;

        // Verificăm că nodul a preluat noul timestamp
        const nodeTimestamp = await node.lastKnownGlobalTimestamp();
        expect(nodeTimestamp).to.equal(newGlobalTimestamp);
    });

    it("should sync node timestamp with global timestamp after update", async function () {
        // Actualizăm un nod pentru a permite un nou calcul global
        await globalContract.connect(addr1).updateNodeResult([15, 25, 35], 90);
        await globalContract.computeGlobalOptimalPlan();

        // Obținem timestamp-ul nou din contractul global
        const newGlobalTimestamp = await globalContract.getLastUpdatedTimestamp();

        // Nodul trebuie să-și actualizeze timestamp-ul
        await node.updateVelocityAndPosition();

        // Verificăm că timestamp-ul nodului s-a sincronizat
        const nodeTimestamp = await node.lastKnownGlobalTimestamp();
        expect(nodeTimestamp).to.equal(newGlobalTimestamp);
    });

    it("should allow multiple nodes to sync their timestamps", async function () {
        // Deploy al doilea nod
        const node2 = await Node.deploy(
            globalContract.target, // Se folosește .target în ethers v6
            [5, 10, 15], // initialPosition
            [2, 2, 2], // initialVelocity
            [50, 150, 250], // initialTariff
            [20, 40, 60], // initialCapacity
            [5, 10, 15], // initialRenewableGeneration
            [80, 90, 100], // initialBatteryCapacity
            [30, 40, 50], // initialBatteryCharge
            [3, 7, 12] // initialFlexibleLoad
        );
        await node2.waitForDeployment();

        // Actualizăm un nod și calculăm planul global
        await globalContract.connect(addr1).updateNodeResult([15, 25, 35], 90);
        await globalContract.computeGlobalOptimalPlan();

        // Obținem timestamp-ul nou
        const newGlobalTimestamp = await globalContract.getLastUpdatedTimestamp();

        // Ambele noduri trebuie să-și actualizeze timestamp-ul
        await node.updateVelocityAndPosition();
        await node2.updateVelocityAndPosition();

        // Verificăm că timestamp-ul fiecărui nod este sincronizat cu cel global
        const node1Timestamp = await node.lastKnownGlobalTimestamp();
        const node2Timestamp = await node2.lastKnownGlobalTimestamp();
        expect(node1Timestamp).to.equal(newGlobalTimestamp);
        expect(node2Timestamp).to.equal(newGlobalTimestamp);
    });
});
