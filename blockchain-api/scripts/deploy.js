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
    console.log(`📥 Inserting contract ${name}, type ${type}, address ${address}, owner ${owner} in DB`);
    db.query(sqlAddContractWithOwnerMe, [name, address, owner, type], (err) => {
        if (err) {
            console.error("❌ SQL Insert Error:", err.sqlMessage || err);
            console.error("Query:", sqlAddContractWithOwnerMe);
            console.error("Params:", { name, address, owner, type });
        } else {
            console.log(`✅ Inserted contract: ${name} with address: ${address}`);
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

async function getAddressByUsername(username) {
    console.log(`🔎 Caut adresa pentru username: ${username}`);
    const [rows] = await db.promise().query(
        'SELECT address FROM users WHERE id = (SELECT user_id FROM credentials WHERE username = ?)',
        [username]
    );
    console.log("📥 Rezultat găsit pentru user:", rows);
    if (rows.length > 0) {
        console.log(`✅ Adresă utilizator: ${rows[0].address}`);
        return rows[0].address;
    } else {
        throw new Error(`❌ User ${username} not found in DB`);
    }
}


async function runPSO(globalContract, nodes, iterations = 3) {
    console.log("=== Initial Node Positions ===");
    for (let i = 0; i < nodes.length; i++) {
        let posArray = Array.from(await nodes[i].getPosition());
        console.log(`Node ${i + 1} initial position:`, posArray.map(p => p.toString()));
        await nodes[i].updateBestPositions();
    }

    await globalContract.computeGlobalOptimalPlan();
    console.log("\n=== Initial Global Plan ===");
    let initialPlan = Array.from(await globalContract.getGlobalOptimalPlanArray());
    console.log(initialPlan.map(x => x.toString()));

    for (let iter = 0; iter < iterations; iter++) {
        console.log(`\n--- Iteration ${iter + 1} ---`);

        for (const node of nodes) {
            await node.updateBestPositions();
        }

        await globalContract.computeGlobalOptimalPlan();
        let currentGlobalPlan = Array.from(await globalContract.getGlobalOptimalPlanArray());
        console.log(`Iteration ${iter + 1} - Global Plan:`, currentGlobalPlan.map(x => x.toString()));

        for (const node of nodes) {
            await node.updateVelocityAndPosition();
        }

        for (const node of nodes) {
            await node.updateBestPositions();
        }

        for (let i = 0; i < nodes.length; i++) {
            let posArray = Array.from(await nodes[i].getPosition());
            console.log(`Node ${i + 1} position:`, posArray.map(x => x.toString()));
        }
    }

    await globalContract.finalizePlan();
    console.log("✅ Plan finalized in contract.");
}



// Connect to DB, delete all contracts,
async function main() {
    console.log(`🌐 Connecting to MySQL at ${dbIp}, database: ${dbname}...`);


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

    // const SCALE = 1e6;
    // function scaleArray(arr, scale = SCALE) {
    //     return arr.map(val => Math.floor(val * scale)); // sau Math.round
    // }


    // for (let i = 0; i < nodeParams.length; i++) {
    //     const node = nodeParams[i];
    
    //     node.initialPosition = scaleArray(node.initialPosition);
    //     node.initialVelocity = scaleArray(node.initialVelocity);
    //     node.initialTariff = scaleArray(node.initialTariff);
    //     node.initialCapacity = scaleArray(node.initialCapacity);
    //     node.initialRenewableGeneration = scaleArray(node.initialRenewableGeneration);
    //     node.initialBatteryCapacity = scaleArray(node.initialBatteryCapacity);
    //     node.initialBatteryCharge = scaleArray(node.initialBatteryCharge);
    //     node.initialFlexibleLoad = scaleArray(node.initialFlexibleLoad);
    //     node.flexibilityAbove = scaleArray(node.flexibilityAbove);
    //     node.flexibilityBelow = scaleArray(node.flexibilityBelow);
    // }

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

        const code = await ethers.provider.getCode(node.target);
        console.log(`🔍 Contract code length for Node ${i + 1}: ${code.length}`);
        if (code.length <= 2) {
            console.error(`❌ Contractul pentru Node ${i + 1} NU a fost implementat corect la adresa ${node.target}`);
        } else {
            console.log(`✅ Contractul pentru Node ${i + 1} verificat on-chain la adresa ${node.target}`);
        }

        let ownerAddress = "0x0000000000000000000000000000000000000000";
        
        if(i === 0)
        {
            ownerAddress = "0x727d94033a8e61a8911ff9d84ae72222565eab09";
        }
        else if(i === 1)
        {
            ownerAddress = "0x09DB0a93B389bEF724429898f539AEB7ac2Dd55f";
        }
        else if(i === 2)
        {
            ownerAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
        }
        // Salvează nodul în baza de date
        InsertContract(`Node ${i + 1}`, node.target, ownerAddress , "Node");
    }

    // Save contracts in database using .target
    InsertContract("GlobalContract", globalContract.target, accounts[0].address, "GlobalContract");

  //  const TestContract = await ethers.getContractFactory("TestContract");
   // const testContract = await TestContract.connect(accounts[1]).deploy(100);
    //await testContract.waitForDeployment();
   // await InsertContractWithUUID("d00597e0-2e5c-4487-ac6c-72866ad3514c", "TestContract", testContract.target, accounts[1].address, "TestContract");

    console.log("===========================================");
    db.query('SELECT * FROM contracts', (err, results) => {
        if (err) {
            console.error("❌ Eroare la citirea contractelor din DB");
        } else {
            console.log("📜 Contractele existente în baza de date:");
            console.table(results);
        }
    });

    console.log("\n🚀 Running PSO optimization after deploy...");
    await runPSO(globalContract, nodes, 20);

    console.log("\n✅ PSO Optimization completed and frozen in blockchain.");

    // Opțional: verifici frozen cost-ul:
    const frozenCost = await globalContract.bestGlobalCost();
    console.log(`💰 Frozen best global cost after deploy optimization: ${frozenCost}`);
    
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
