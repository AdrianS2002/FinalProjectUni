let mysql = require('mysql2');
const SqlErrors = require("../src/models/db-errors");

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
     // Exemplu de valori pentru o rețea electrică cu 24 de ore:
    // Consum optim de referință: 80 kW pe oră
    const initialPosition = [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80];
    // Pornim cu o viteză inițială zero (fără ajustări inițiale)
    const initialVelocity = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // Tarife constante, de exemplu 100 (unități monetare per kWh)
    const initialTariff = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
    // Capacitate maximă a rețelei (ex: 1000 kW pe oră)
    const initialCapacity = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
    // Energia regenerabilă disponibilă, de exemplu 20 kW pe oră
    const initialRenewableGeneration = [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20];
    // Capacitatea bateriei, de exemplu 500 kWh per oră
    const initialBatteryCapacity = [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500];
    // Nivelul curent de încărcare a bateriilor, de exemplu 300 kWh
    const initialBatteryCharge = [300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300, 300];
    // Flexible load (capacitatea nodului de a muta consumul) – de exemplu, 50 kW
    const initialFlexibleLoad = [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50];

    // Valorile de flexibilitate: dacă consumul optim este de 80 kW,
    // flexibilityBelow = 25 înseamnă că nodul poate reduce consumul până la 55 kW,
    // iar flexibilityAbove = 70 înseamnă că nodul poate crește consumul până la 150 kW.
    const flexibilityAbove = [70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70];
    const flexibilityBelow = [25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25];

    const node = await Node.deploy(
        globalContract.target,  // Folosim .target pentru ethers v6
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
    console.log("Deployed Node at:", node.target);

    // Save contracts in database using .target
    InsertContract("GlobalContract", globalContract.target, accounts[0].address, "GlobalContract");
    InsertContract("Node", node.target, accounts[0].address, "Node");

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
