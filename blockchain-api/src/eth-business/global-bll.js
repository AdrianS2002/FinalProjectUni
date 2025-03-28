const globalDAO = require('../eth-dao/global-dao');
const contractDao = require('../db-dao/contracts-dao.js');
const enums = require('../models/enums');

async function getGlobalContract() {
    const globalOwnerAddress = process.env.GLOBAL_OWNER || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const contract = await contractDao.QueryContractByTypeAndOwner(enums.ContractType.GLOBAL, globalOwnerAddress);
    if (!contract) {
        throw new Error(`No GlobalContract found for owner: ${globalOwnerAddress}`);
    }
    return { contractAddress: contract.address, ownerAddress: globalOwnerAddress };
}

// 🔹 Compute global optimal plan
async function computeGlobalOptimalPlan() {
    try {
        let { contractAddress, ownerAddress } = await getGlobalContract();
        const tx = await globalDAO.computeGlobalOptimalPlan(contractAddress, ownerAddress);
        return { transaction: tx };
    } catch (e) {
        return Promise.reject(e);
    }
}

async function getGlobalPlanHistory() {
    const { contractAddress } = await getGlobalContract(); // folosește adresa principală
    return await globalDAO.getGlobalPlanHistory(contractAddress);
}

async function getGlobalOptimalPlanHour(hour) {
    try {
        let { contractAddress } = await getGlobalContract();
        const result = await globalDAO.getGlobalOptimalPlanHour(contractAddress, hour);
        return result;
    } catch (e) {
        return Promise.reject(e);
    }
}

async function getGlobalOptimalPlanArray() {
    try {
        let { contractAddress } = await getGlobalContract();
        const result = await globalDAO.getGlobalOptimalPlanArray(contractAddress);
        return result;
    } catch (e) {
        return Promise.reject(e);
    }
}

async function getLastUpdatedTimestamp() {
    try {
        let { contractAddress } = await getGlobalContract();
        const result = await globalDAO.getLastUpdatedTimestamp(contractAddress);
        return result;
    } catch (e) {
        return Promise.reject(e);
    }
}

async function updateNodeResult(newPosition, newScore, newFlexibilityWeight) {
    try {
        let { contractAddress, ownerAddress } = await getGlobalContract();
        const tx = await globalDAO.updateNodeResult(contractAddress, newPosition, newScore, newFlexibilityWeight, ownerAddress);
        return { transaction: tx };
    } catch (e) {
        return Promise.reject(e);
    }
}

async function getBestPosition(nodeAddress) {
    try {
        let { contractAddress } = await getGlobalContract();
        const result = await globalDAO.getBestPosition(contractAddress, nodeAddress);
        return result;
    } catch (e) {
        return Promise.reject(e);
    }
}

async function getFrozenGlobalCost() {
    try {
        let { contractAddress } = await getGlobalContract();
        const result = await globalDAO.getFrozenGlobalCost(contractAddress);
        return result;
    } catch (e) {
        return Promise.reject(e);
    }
}

async function getBestGlobalPlan() {
    try {
        let { contractAddress } = await getGlobalContract();
        const result = await globalDAO.getBestGlobalPlan(contractAddress);
        return result;
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
    getBestPosition,
    getFrozenGlobalCost,
    getBestGlobalPlan,
    getGlobalPlanHistory
};
