const abi = require('../../artifacts/contracts/GlobalContract.sol/GlobalContract.json').abi;
const bin_data = require('../../artifacts/contracts/GlobalContract.sol/GlobalContract.json').bytecode;

let ErrorHandling = require('../models/error-handling');
const { getSignerForUser } = require('../utils/commons');
let EthErrors = require('../models/eth-errors.js');

// Funcție pentru a calcula planul global optim.
// Necesită o semnătură (signer), deoarece se trimite o tranzacție.
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

// Funcție pentru a obține valoarea planului global pentru o anumită oră.
async function getGlobalOptimalPlanHour(contract_address, hour) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getGlobalOptimalPlanHour(hour);
        return { globalOptimalPlanHour: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "getGlobalOptimalPlanHour", "getGlobalOptimalPlanHour");
    }
}

// Funcție pentru a obține planul global complet sub formă de array.
async function getGlobalOptimalPlanArray(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getGlobalOptimalPlanArray();
        return { globalOptimalPlanArray: result };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "getGlobalOptimalPlanArray", "getGlobalOptimalPlanArray");
    }
}

// Funcție pentru a obține timestamp-ul global actualizat din contractul global
async function getLastUpdatedTimestamp(contract_address) {
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
