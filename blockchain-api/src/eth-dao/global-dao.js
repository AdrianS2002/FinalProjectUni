const abi = require('../../artifacts/contracts/GlobalContract.sol/GlobalContract.json').abi; // ABI-ul contractului compilat
const bin_data = require('../../artifacts/contracts/GlobalContract.sol/GlobalContract.json').bytecode;

let ErrorHandling = require('../models/error-handling');
const { getSignerForUser } = require('../utils/commons');
let EthErrors = require('../models/eth-errors.js');

async function updateGlobalBestPosition(contract_address, ownerAddress, newPosition, newScore) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        let tx = await contract.updateGlobalBestPosition(newPosition, newScore);
        await tx.wait();
        return tx;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "updateGlobalBestPosition", "updateGlobalBestPosition");
    }
}

async function getGlobalBestPosition(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getGlobalBestPosition();
        return {
            globalBestPosition: result
        };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "getGlobalBestPosition", "getGlobalBestPosition");
    }
}

async function getGlobalBestScore(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.globalBestScore();
        return {
            globalBestScore: result
        };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "getGlobalBestScore", "getGlobalBestScore");
    }
}

module.exports = {
    updateGlobalBestPosition,
    getGlobalBestPosition,
    getGlobalBestScore
};
