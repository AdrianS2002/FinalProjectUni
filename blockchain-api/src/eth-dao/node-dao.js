const abi = require('../../artifacts/contracts/Node.sol/Node.json').abi; // ABI-ul contractului compilat
const bin_data = require('../../artifacts/contracts/Node.sol/Node.json').bytecode;

let ErrorHandling = require('../models/error-handling');
const { getSignerForUser } = require('../utils/commons');
let EthErrors = require('../models/eth-errors.js');


async function setPosition(contract_address, ownerAddress, position) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        let tx = await contract.updateVelocityAndPosition(position);
        await tx.wait();
        return tx;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "setPosition", "updateVelocityAndPosition");
    }
}


async function getPosition(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.position();
        return {
            position: result
        };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPosition", "position");
    }
}


async function updatePeakDemandThreshold(contract_address, ownerAddress, threshold) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        let tx = await contract.updatePeakDemandThreshold(threshold);
        await tx.wait();
        return tx;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "updatePeakDemandThreshold", "updatePeakDemandThreshold");
    }
}


async function updatePenaltyRate(contract_address, ownerAddress, rate) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        let tx = await contract.updatePenaltyRate(rate);
        await tx.wait();
        return tx;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "updatePenaltyRate", "updatePenaltyRate");
    }
}


async function getPersonalBestScore(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.personalBestScore();
        return {
            personalBestScore: result
        };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPersonalBestScore", "personalBestScore");
    }
}


async function getPersonalBestPosition(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.personalBestPosition();
        return {
            personalBestPosition: result
        };
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPersonalBestPosition", "personalBestPosition");
    }
}

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
    setPosition,
    getPosition,
    updatePeakDemandThreshold,
    updatePenaltyRate,
    getPersonalBestScore,
    getPersonalBestPosition,
    updateBestPositions
};
