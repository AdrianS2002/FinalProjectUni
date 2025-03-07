let enums = require('../models/enums');
let globalDAO = require('../eth-dao/global-dao');
let accountDao = require('../db-dao/accounts-dao.js');
let contractDao = require('../db-dao/contracts-dao.js');

// 📌 Funcție auxiliară pentru a obține contractul Global asociat unui utilizator
async function getGlobalContractForUser(username) {
    let account = await accountDao.QueryAccountAddressByUsername(username);
    let contract = await contractDao.QueryContractByTypeAndOwner(enums.ContractType.GLOBAL, account.address);

    if (!contract) {
        throw new Error(`No Global contract found for user: ${username}`);
    }
    return { contractAddress: contract.address, ownerAddress: account.address };
}

// 🔹 Calculează planul global optim
async function computeGlobalOptimalPlan(username) {
    try {
        let { contractAddress, ownerAddress } = await getGlobalContractForUser(username);
        let tx = await globalDAO.computeGlobalOptimalPlan(contractAddress, ownerAddress);
        return Promise.resolve({ transaction: tx });
    } catch (e) {
        return Promise.reject(e);
    }
}

// 🔹 Obține valoarea planului global pentru o anumită oră
async function getGlobalOptimalPlanHour(username, hour) {
    try {
        let { contractAddress } = await getGlobalContractForUser(username);
        let result = await globalDAO.getGlobalOptimalPlanHour(contractAddress, hour);
        return Promise.resolve(result);
    } catch (e) {
        return Promise.reject(e);
    }
}

// 🔹 Obține întregul plan global optim
async function getGlobalOptimalPlanArray(username) {
    try {
        let { contractAddress } = await getGlobalContractForUser(username);
        let result = await globalDAO.getGlobalOptimalPlanArray(contractAddress);
        return Promise.resolve(result);
    } catch (e) {
        return Promise.reject(e);
    }
}

// 🔹 Obține timestamp-ul global actualizat
async function getLastUpdatedTimestamp(username) {
    try {
        let { contractAddress } = await getGlobalContractForUser(username);
        let result = await globalDAO.getLastUpdatedTimestamp(contractAddress);
        return Promise.resolve(result);
    } catch (e) {
        return Promise.reject(e);
    }
}

// 🔹 Actualizează rezultatul unui nod în GlobalContract
async function updateNodeResult(username, newPosition, newScore, newFlexibilityWeight) {
    try {
        let { contractAddress, ownerAddress } = await getGlobalContractForUser(username);
        let tx = await globalDAO.updateNodeResult(contractAddress, newPosition, newScore, newFlexibilityWeight, ownerAddress);
        return Promise.resolve({ transaction: tx });
    } catch (e) {
        return Promise.reject(e);
    }
}

// 🔹 Obține cea mai bună poziție pentru un nod
async function getBestPosition(username, nodeAddress) {
    try {
        let { contractAddress } = await getGlobalContractForUser(username);
        let result = await globalDAO.getBestPosition(contractAddress, nodeAddress);
        return Promise.resolve(result);
    } catch (e) {
        return Promise.reject(e);
    }
}

module.exports = {
    computeGlobalOptimalPlan,
    getGlobalOptimalPlanHour,
    getGlobalOptimalPlanArray,
    getLastUpdatedTimestamp,
    updateNodeResult,
    getBestPosition
};
