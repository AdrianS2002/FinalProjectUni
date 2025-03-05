// const { expect } = require("chai");
// const { ethers } = require("hardhat");
// const globalContractService = require("../src/eth-business/global-bll");
// const { getSignerForUser } = require('../src/utils/commons');



// describe("GlobalContract Service - computeGlobalOptimalPlan", function () {
//     let GlobalContract, globalContract;
//     let owner, provider, signer;

//     beforeEach(async function () {
//         [owner] = await ethers.getSigners();
//         provider = ethers.provider;
//         signer = await getSignerForUser(owner.address);
//         GlobalContract = await ethers.getContractFactory("GlobalContract");
//         globalContract = await GlobalContract.deploy();
//         await globalContract.waitForDeployment();
//     });

//     it("should compute global optimal plan and update timestamp", async function () {
//         // Pentru test, înregistrăm cel puțin un nod pentru ca computeGlobalOptimalPlan să nu reverteze
//         const newPosition = [10, 20, 30];
//         const newScore = 100;
//         await globalContract.connect(signer).updateNodeResult(newPosition, newScore);

//         // Apelează funcția din business logic folosind adresa contractului
//         const tx = await globalContractService.computeGlobalOptimalPlan(globalContract.address, signer.address);
//         expect(tx).to.exist;
        
//         // După tranzacție, verifică dacă timestamp-ul a fost actualizat
//         const { lastUpdatedTimestamp } = await globalContractService.getLastUpdatedTimestamp(globalContract.address, provider);
//         expect(Number(lastUpdatedTimestamp)).to.be.greaterThan(0);
//     });
    
// });
