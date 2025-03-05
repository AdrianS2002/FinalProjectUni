const { ethers } = require('ethers');
const abi = require('../../artifacts/contracts/GlobalContract.sol/GlobalContract.json').abi;
const bin_data = require('../../artifacts/contracts/GlobalContract.sol/GlobalContract.json').bytecode;

let ErrorHandling = require('../models/error-handling');
const { getSignerForUser } = require('../utils/commons');
let EthErrors = require('../models/eth-errors.js');

// Funcție pentru a calcula planul global optim (tranzacție, necesită signer)
async function computeGlobalOptimalPlan(contract_address, ownerAddress) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        let tx = await contract.computeGlobalOptimalPlan();
        await tx.wait();
        return tx;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "computeGlobalOptimalPlan", "computeGlobalOptimalPlan");
    }
}

// Funcție pentru a obține valoarea planului global pentru o anumită oră (read)
async function getGlobalOptimalPlanHour(contract_address, hour, provider) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getGlobalOptimalPlanHour(hour);
        return { globalOptimalPlanHour: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "getGlobalOptimalPlanHour", "getGlobalOptimalPlanHour");
    }
}

// Funcție pentru a obține planul global complet sub formă de array (read)
async function getGlobalOptimalPlanArray(contract_address, provider) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getGlobalOptimalPlanArray();
        return { globalOptimalPlanArray: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "getGlobalOptimalPlanArray", "getGlobalOptimalPlanArray");
    }
}

// Funcție pentru a obține timestamp-ul ultimei actualizări din GlobalContract (read)
async function getLastUpdatedTimestamp(contract_address, provider) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getLastUpdatedTimestamp();
        return { lastUpdatedTimestamp: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "getLastUpdatedTimestamp", "getLastUpdatedTimestamp");
    }
}

module.exports = {
    computeGlobalOptimalPlan,
    getGlobalOptimalPlanHour,
    getGlobalOptimalPlanArray,
    getLastUpdatedTimestamp
};
