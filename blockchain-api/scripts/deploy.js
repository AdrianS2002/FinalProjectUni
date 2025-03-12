let mysql = require('mysql2');
const SqlErrors = require("../src/models/db-errors");
const { loadCSVData } = require("../scripts/loadCSVData");

let dbIp = 'localhost';
let dbUser = 'root';
let dbPass = 'root';
let dbname = 'licenta-dsrl';  // licenta-dsrl

let db_config = {
    host: dbIp,
    user: dbUser,
    password: dbPass,
    database: dbname
};

let db;

const sqlDeleteAllContracts = "DELETE FROM contracts WHERE true;";
const sqlAddContractWithOwner = "INSERT INTO contracts (id, name, address, owner, type) VALUES (?, ?, ?, ?, ?)";
const sqlAddContractWithOwnerMe = "INSERT INTO contracts (name, address, owner, type) VALUES (?, ?, ?, ?)";

InsertContractWithUUID = (contract_uuid, name, address, owner, type) => {
    db.query(sqlAddContractWithOwner, [contract_uuid, name, address, owner, type], (err, contract) => {
        if (err) {
            console.log(new SqlErrors.SqlError("QueryInsertContract"));
            console.error("SQL Insert Error:", err.sqlMessage || err);
            console.error("Query:", sqlAddContractWithOwner);
            console.error("Params:", { contract_uuid, name, address, owner, type });
        }
        try {
            console.log("Inserted: " + name + " with address: " + address);
        } catch (e) {
            console.log(e);
        }
    });
};

const InsertContract = (name, address, owner, type) => {
    db.query(sqlAddContractWithOwnerMe, [name, address, owner, type], (err) => {
        if (err) {
            console.error("SQL Insert Error:", err.sqlMessage || err);
            console.error("Query:", sqlAddContractWithOwnerMe);
            console.error("Params:", { name, address, owner, type });
        } else {
            console.log(`Inserted contract: ${name} with address: ${address}`);
        }
    });
};

DeleteAll = () => {
    db.query(sqlDeleteAllContracts, (err, result) => {
        if (err) {
            console.log(new SqlErrors.SqlError("DeleteAllContracts"));
        }
        console.log("Deleted all contracts");
    });
};

// Connect to DB, delete all contracts,
async function main() {

    db = mysql.createConnection(db_config); // Recreate the connection, since the old one cannot be reused.

    console.log('Connecting... ');
    db.connect(function (err) {              
        if (err) {                                     
            console.log('error when connecting to db:', err);
        }
    });

    DeleteAll();

    const accounts = await ethers.getSigners();  // All accounts from hardhat.config

    const nodeParams = await loadCSVData();
    console.log("🔹 CSV Data Loaded:", JSON.stringify(nodeParams, null, 2));

    const DateTime = await ethers.getContractFactory("DateTime");
    const dateTime = await DateTime.deploy();
    await dateTime.waitForDeployment();

    // Deploy GlobalContract using ethers v6
    const GlobalContract = await ethers.getContractFactory("GlobalContract");
    const globalContract = await GlobalContract.deploy();
    await globalContract.waitForDeployment();
    console.log("Deployed GlobalContract at:", globalContract.target);

    // Deploy Node folosind globalContract.target
    const Node = await ethers.getContractFactory("Node");
    let nodes = [];

    for (let i = 0; i < nodeParams.length; i++) {
        const params = nodeParams[i];

        const node = await Node.deploy(
            globalContract.target,
            [...params.initialPosition],
            [...params.initialVelocity],
            [...params.initialTariff],
            [...params.initialCapacity],
            [...params.initialRenewableGeneration],
            [...params.initialBatteryCapacity],
            [...params.initialBatteryCharge],
            [...params.initialFlexibleLoad],
            [...params.flexibilityAbove],
            [...params.flexibilityBelow]
        );

        await node.waitForDeployment();
        nodes.push(node);
        console.log(`✅ Node ${i + 1} deployed at:`, node.target);

        // Salvează nodul în baza de date
        InsertContract(`Node ${i + 1}`, node.target, accounts[0].address, "Node");
    }

    // Save contracts in database using .target
    InsertContract("GlobalContract", globalContract.target, accounts[0].address, "GlobalContract");

    const TestContract = await ethers.getContractFactory("TestContract");
    const testContract = await TestContract.connect(accounts[1]).deploy(100);
    await testContract.waitForDeployment();
    await InsertContractWithUUID("d00597e0-2e5c-4487-ac6c-72866ad3514c", "TestContract", testContract.target, accounts[1].address, "TestContract");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
