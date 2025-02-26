const abi = require('../../artifacts/contracts/Node.sol/Node.json').abi;
const bin_data = require('../../artifacts/contracts/Node.sol/Node.json').bytecode;

let ErrorHandling = require('../models/error-handling');
const { getSignerForUser } = require('../utils/commons');
let EthErrors = require('../models/eth-errors.js');

// Actualizează viteza și poziția conform metodei PSO din smart contract.
// Nu se transmit parametri, deoarece funcția updateVelocityAndPosition nu are argumente.
async function updateVelocityAndPosition(contract_address, ownerAddress) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        // Obține timestamp-urile pentru sincronizare
        let { lastKnownGlobalTimestamp } = await getLastKnownGlobalTimestamp(contract_address);
        let { lastUpdatedTimestamp } = await getLastUpdatedTimestamp(global_contract_address);

        // Dacă timestamp-ul global NU s-a schimbat, nu actualizăm viteza și poziția
        if (lastUpdatedTimestamp <= lastKnownGlobalTimestamp) {
            console.log("⚠️ No new update from GlobalContract, skipping updateVelocityAndPosition.");
            return { message: "No update needed", lastKnownGlobalTimestamp, lastUpdatedTimestamp };
        }
        let tx = await contract.updateVelocityAndPosition();
        await tx.wait();
        return tx;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "updateVelocityAndPosition", "updateVelocityAndPosition");
    }
}

// Obține poziția curentă din contract (variabila publică position)
async function getPosition(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.position();
        return { position: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPosition", "position");
    }
}

// Obține timestamp-ul global cunoscut de nod (lastKnownGlobalTimestamp)
async function getLastKnownGlobalTimestamp(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.lastKnownGlobalTimestamp();
        return { lastKnownGlobalTimestamp: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getLastKnownGlobalTimestamp", "lastKnownGlobalTimestamp");
    }
}


// Obține scorul cel mai bun personal (personalBestScore)
async function getPersonalBestScore(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.personalBestScore();
        return { personalBestScore: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPersonalBestScore", "personalBestScore");
    }
}

// Obține poziția cel mai bună personală (personalBestPosition)
async function getPersonalBestPosition(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.personalBestPosition();
        return { personalBestPosition: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPersonalBestPosition", "personalBestPosition");
    }
}

// Nodul își actualizează poziția optimă (cea mai bună soluție personală)
// și transmite rezultatul către contractul global.
async function updateBestPositions(contract_address, ownerAddress) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        let tx = await contract.updateBestPositions();
        await tx.wait();
        return tx;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "updateBestPositions", "updateBestPositions");
    }
}

module.exports = {
    updateVelocityAndPosition,
    getPosition,
    getPersonalBestScore,
    getPersonalBestPosition,
    updateBestPositions
};
