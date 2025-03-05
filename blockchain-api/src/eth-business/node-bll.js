const { ethers } = require('ethers');
const abi = require('../../artifacts/contracts/Node.sol/Node.json').abi;
const bin_data = require('../../artifacts/contracts/Node.sol/Node.json').bytecode;

let ErrorHandling = require('../models/error-handling');
const { getSignerForUser } = require('../utils/commons');
let EthErrors = require('../models/eth-errors.js');

// Funcție pentru a actualiza viteza și poziția (metodă write)
async function updateVelocityAndPosition(contract_address, ownerAddress, global_contract_address, provider) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        // Obținem timestamp-ul local din contractul Node
        let { lastKnownGlobalTimestamp } = await getLastKnownGlobalTimestamp(contract_address, provider);
        // Obținem timestamp-ul global din GlobalContract
        const globalContractService = require('./globalContractService');
        let { lastUpdatedTimestamp } = await globalContractService.getLastUpdatedTimestamp(global_contract_address, provider);
        
        // Dacă nu există update nou, se revine fără tranzacție
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

// Funcție pentru a obține poziția curentă a nodului (read)
async function getPosition(contract_address, provider) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.position();
        return { position: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPosition", "position");
    }
}

// Funcție pentru a obține timestamp-ul cunoscut de nod (lastKnownGlobalTimestamp) (read)
async function getLastKnownGlobalTimestamp(contract_address, provider) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.lastKnownGlobalTimestamp();
        return { lastKnownGlobalTimestamp: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getLastKnownGlobalTimestamp", "lastKnownGlobalTimestamp");
    }
}

// Funcție pentru a obține cel mai bun scor personal (read)
async function getPersonalBestScore(contract_address, provider) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.personalBestScore();
        return { personalBestScore: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPersonalBestScore", "personalBestScore");
    }
}

// Funcție pentru a obține cea mai bună poziție personală (read)
async function getPersonalBestPosition(contract_address, provider) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.personalBestPosition();
        return { personalBestPosition: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPersonalBestPosition", "personalBestPosition");
    }
}

// Funcție pentru ca nodul să își actualizeze poziția optimă și să transmită rezultatul către GlobalContract (write)
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
    getLastKnownGlobalTimestamp,
    getPersonalBestScore,
    getPersonalBestPosition,
    updateBestPositions
};
