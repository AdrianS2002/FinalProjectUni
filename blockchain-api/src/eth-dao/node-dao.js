const { ethers } = require("ethers");
const abi = require('../../artifacts/contracts/Node.sol/Node.json').abi;
const bin_data = require('../../artifacts/contracts/Node.sol/Node.json').bytecode;
const { loadNodeContract } = require('../utils/commons');
let ErrorHandling = require('../models/error-handling');
const { getSignerForUser } = require('../utils/commons');
let EthErrors = require('../models/eth-errors.js');
// const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545", {
//     name: "localnet",
//     chainId: 1337,
//     ensAddress: null,
// });
const { provider } = require('../utils/commons');


function convertResultToArray(result) {
    
    if (!result || typeof result !== 'object' || !result.length) return result;
    try {
        return [...result];
    } catch (e) {
        return Array.from(result);
    }
}

// ✅ Actualizează viteza și poziția (doar dacă timestamp-ul global s-a schimbat)
async function updateVelocityAndPosition(contract_address, ownerAddress, global_contract_address) {
    const signer = await getSignerForUser(ownerAddress);
    const contract = new ethers.Contract(contract_address, abi, signer);
    try {
        let lastKnownGlobalTimestamp = await getLastKnownGlobalTimestamp(contract_address);
        let lastUpdatedTimestamp = await getLastUpdatedTimestamp(global_contract_address);

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

async function getPosition(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        console.log(`🔍 Verificăm contractul Node la adresa: ${contract_address}`);
        
        // Verifică dacă contractul există
        const code = await provider.getCode(contract_address);
        if (code === "0x") {
            throw new Error(`❌ Contractul Node nu este implementat la ${contract_address}`);
        }

        let result = await contract.getPosition(); // Apelează noua metodă din Solidity
        console.log("✅ Poziție returnată:", result);
        return { position: result };
    } catch (e) {
        console.log("❌ Eroare în getPosition:", e);
        return new EthErrors.MethodCallError("Node", "getPosition", "position");
    }
}




async function getObjectiveFunctionResult(contract_address, position) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        // 🔧 Convertim Result într-un array normal
        const positionArray = Array.from(position);
        console.log("📤 Sending position to contract.objectiveFunction:", positionArray);

        let result = await contract.objectiveFunction(positionArray);
        return result;
    } catch (e) {
        console.log("❌ Eroare în getObjectiveFunctionResult:", e);
        return new EthErrors.MethodCallError("Node", "getObjectiveFunctionResult", "objectiveFunction");
    }
}

// ✅ Obține timestamp-ul global cunoscut de nod
async function getLastKnownGlobalTimestamp(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.lastKnownGlobalTimestamp();
        return result; // ✅ NU `{ lastKnownGlobalTimestamp: result }`
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getLastKnownGlobalTimestamp", "lastKnownGlobalTimestamp");
    }
}

// ✅ Obține timestamp-ul global actualizat
async function getLastUpdatedTimestamp(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getLastUpdatedTimestamp();
        return result; // ✅ NU `{ lastUpdatedTimestamp: result }`
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("GlobalContract", "getLastUpdatedTimestamp", "getLastUpdatedTimestamp");
    }
}

// ✅ Obține scorul cel mai bun personal
async function getPersonalBestScore(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.personalBestScore();
        return result;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPersonalBestScore", "personalBestScore");
    }
}

// ✅ Obține poziția cea mai bună personală
async function getPersonalBestPosition(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getPersonalBestPosition();
        return result;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getPersonalBestPosition", "personalBestPosition");
    }
}

// ✅ Actualizează cea mai bună poziție și trimite la Global Contract
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

async function getFrozenCost(contract_address) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getFrozenCost();
        return result;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getFrozenCost", "getFrozenCost");
    }
}

async function getEffectiveTariff(contract_address, hour, consumption) {
    const contract = new ethers.Contract(contract_address, abi, provider);
    try {
        let result = await contract.getEffectiveTariff(hour, consumption);
        return result;
    } catch (e) {
        console.log(e);
        return new EthErrors.MethodCallError("Node", "getEffectiveTariff", "getEffectiveTariff");
    }

    
    
}

async function getTariff(contractAddress) {
    try {
        const contract = loadNodeContract(contractAddress);
        const result = await contract.getTariff(); 
        return result;
    } catch (e) {
        console.error("❌ Eroare în getTariff:", e);
        throw e;
    }
}
async function getCapacity(contractAddress) {
    try{
        const contract = loadNodeContract(contractAddress);
        const result = await contract.getCapacity(); 
        return result;
    }
    catch (e) {
        console.error("❌ Eroare în getCapacity:", e);
        throw e;
    }
}

async function getBatteryCharge(contractAddress) {
    try{
        const contract = loadNodeContract(contractAddress);
        const result = await contract.getBatteryCharge(); 
        return result;
    }
    catch (e) {
        console.error("❌ Eroare în getBatteryCharge:", e);
        throw e;
    }
}

async function getBatteryCapacity(contractAddress) {
    try{
        const contract = loadNodeContract(contractAddress);
        const result = await contract.getBatteryCapacity(); 
        return result;
    }
    catch (e) {
        console.error("❌ Eroare în getBatteryCapacity:", e);
        throw e;
    }
}

async function getRenewableGeneration(contractAddress) {
    try {
      console.log(`🔌 [DAO] Loading contract at address: ${contractAddress}`);
      const contract = loadNodeContract(contractAddress);
  
      const result = await contract.getRenewableGeneration();
      console.log("📊 [DAO] Raw renewable generation (Result):", result);
  
      const converted = Array.from(result).map(Number); // sau convertResultToArray(result)
      console.log("✅ [DAO] Converted renewable generation:", converted);
  
      return converted;
    } catch (e) {
      console.error("❌ [DAO] Error in getRenewableGeneration:", e);
      throw e;
    }
  }
  

async function getFlexibilityAbove(contractAddress) {
    try{
        const contract = loadNodeContract(contractAddress);
        const result = await contract.getFlexibilityAbove(); 
        return convertResultToArray(result);
    }
    catch (e) {
        console.error("❌ Eroare în getFlexibilityAbove:", e);
        throw e;
    }
}

async function getFlexibilityBelow(contractAddress) {
    try{
        const contract = loadNodeContract(contractAddress);
        let result = await contract.getFlexibilityBelow();
        return convertResultToArray(result);
    }
    catch (e) {
        console.error("❌ Eroare în getFlexibilityBelow:", e);
        throw e;
    }
}

module.exports = {
    updateVelocityAndPosition,
    getPosition,
    getPersonalBestScore,
    getPersonalBestPosition,
    updateBestPositions,
    getLastKnownGlobalTimestamp,
    getLastUpdatedTimestamp,
    getObjectiveFunctionResult,
    getFrozenCost,
    getEffectiveTariff,
    getTariff,
    getCapacity,
    getBatteryCharge,
    getBatteryCapacity,
    getRenewableGeneration,
    getFlexibilityAbove,
    getFlexibilityBelow
};
