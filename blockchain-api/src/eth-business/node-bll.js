let enums = require('../models/enums');
let nodeDAO = require('../eth-dao/node-dao');
let accountDao = require('../db-dao/accounts-dao.js');
let contractDao = require('../db-dao/contracts-dao.js');
const globalContractService = require('./global-bll');

//Funcție auxiliară pentru a obține contractul Node asociat unui utilizator
async function getNodeContractForUser(username) {
    let account = await accountDao.QueryAccountAddressByUsername(username);
    if (!account || !account.address) {
        throw new Error(`⚠️ No account found for username: ${username}`);
    }

    let contract = await contractDao.QueryContractByTypeAndOwner(enums.ContractType.NODE, account.address);
    if (!contract || !contract.address) {
        throw new Error(`⚠️ No Node contract found for user: ${username}`);
    }

    console.log("✅ Found Node Contract:", contract.address);
    return { contractAddress: contract.address, ownerAddress: account.address };
}


//Actualizează viteza și poziția pentru un nod (doar dacă timestamp-ul global s-a schimbat)
async function updateVelocityAndPosition(username, global_contract_address) {
    try {
        let { contractAddress, ownerAddress } = await getNodeContractForUser(username);
        
        // Obținem timestamp-urile pentru sincronizare
        let lastKnownGlobalTimestamp = await nodeDAO.getLastKnownGlobalTimestamp(contractAddress);
        let lastUpdatedTimestamp = await globalContractService.getLastUpdatedTimestamp(global_contract_address);

        if (lastUpdatedTimestamp <= lastKnownGlobalTimestamp) {
            console.log(`⚠️ No new update for ${username}, skipping updateVelocityAndPosition.`);
            return { message: "No update needed", lastKnownGlobalTimestamp, lastUpdatedTimestamp };
        }

        let tx = await nodeDAO.updateVelocityAndPosition(contractAddress, ownerAddress);
        return Promise.resolve({ transaction: tx });
    } catch (e) {
        return Promise.reject(e);
    }
}

// Obține poziția curentă a unui nod
async function getPosition(username) {
    try {
        let { contractAddress } = await getNodeContractForUser(username);
        let positionData = await nodeDAO.getPosition(contractAddress);
        console.log("Fetched position from DAO:", positionData); // Debugging

        return positionData; // Acesta trebuie să fie { position: [10, 20, 30] }
    } catch (e) {
        return Promise.reject(e);
    }
}


// Obține timestamp-ul global cunoscut de nod
async function getLastKnownGlobalTimestamp(username) {
    try {
        let { contractAddress } = await getNodeContractForUser(username);
        let timestamp = await nodeDAO.getLastKnownGlobalTimestamp(contractAddress);
        return Promise.resolve({ timestamp });
    } catch (e) {
        return Promise.reject(e);
    }
}

// Obține cel mai bun scor personal al unui nod
async function getPersonalBestScore(username) {
    try {
        let { contractAddress } = await getNodeContractForUser(username);
        let score = await nodeDAO.getPersonalBestScore(contractAddress);
        return Promise.resolve({ score });
    } catch (e) {
        return Promise.reject(e);
    }
}

// Obține cea mai bună poziție personală a unui nod
async function getPersonalBestPosition(username) {
    try {
        let { contractAddress } = await getNodeContractForUser(username);
        let position = await nodeDAO.getPersonalBestPosition(contractAddress);
        return Promise.resolve({ position });
    } catch (e) {
        return Promise.reject(e);
    }
}

// Actualizează cea mai bună poziție a unui nod și o trimite la Global Contract
async function updateBestPositions(username) {
    try {
        let { contractAddress, ownerAddress } = await getNodeContractForUser(username);
        let tx = await nodeDAO.updateBestPositions(contractAddress, ownerAddress);
        return Promise.resolve({ transaction: tx });
    } catch (e) {
        return Promise.reject(e);
    }
}

//  Obține rezultatul funcției obiectiv pentru un nod
async function getObjectiveFunctionResult(username) {
    try {
        let { contractAddress } = await getNodeContractForUser(username);
        let result = await nodeDAO.getObjectiveFunctionResult(contractAddress);
        return Promise.resolve({ result });
    } catch (e) {
        return Promise.reject(e);
    }
}


// async function getNodePenalty(username) {
//     try {
//         let penaltyData = await calculateNodePenalty(username);
//         return Promise.resolve(penaltyData);
//     } catch (e) {
//         return Promise.reject(e);
//     }
// }

module.exports = {
    updateVelocityAndPosition,
    getPosition,
    getLastKnownGlobalTimestamp,
    getPersonalBestScore,
    getPersonalBestPosition,
    updateBestPositions,
    getObjectiveFunctionResult,
   // getNodePenalty
};
