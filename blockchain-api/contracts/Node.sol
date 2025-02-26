// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* INTERFAȚĂ PENTRU GLOBAL CONTRACT */
interface GlobalContractInterface {
    function updateNodeResult(
        int[] calldata newPosition,
        uint newScore
    ) external;
    function getGlobalOptimalPlanArray() external view returns (int[] memory);
    function getLastUpdatedTimestamp() external view returns (uint);
}

/* CONTRACTUL PENTRU UN NOD (prosumer)
   Fiecare nod își gestionează propriul plan de consum (pe ore), actualizează
   cea mai bună soluție personală și comunică rezultatul către contractul global.
*/
contract Node {
    // Vectorii reprezintă planul de consum pe ore (ex: 24 de ore)
    int[] public position;
    int[] public velocity;
    int[] public personalBestPosition;
    uint public personalBestScore = type(uint).max;
    uint public lastKnownGlobalTimestamp; // Ultimul timestamp sincronizat

    // Parametrii PSO: w – inerție, c1 și c2 – coeficienți pentru componentele
    // cognitivă și socială.
    int public w = 50;
    int public c1 = 150;
    int public c2 = 150;

    // Date specifice nodului (preluate off-chain, de ex. din CSV)
    uint[] public tariff; // Tarifele pe oră
    uint[] public capacity; // Capacitatea maximă a rețelei pe oră
    uint[] public renewableGeneration; // Energia regenerabilă disponibilă pe oră
    uint[] public batteryCapacity; // Capacitatea bateriei
    uint[] public batteryCharge; // Nivelul curent de încărcare al bateriei
    uint[] public flexibleLoad; // Limită de flexibilitate (mutare consum)

    GlobalContractInterface public globalContract;

    event BestPositionUpdated(address indexed node, uint newScore);
    event NewPlanReceived(uint timestamp); // Semnalează primirea unui plan nou

    constructor(
        address globalContractAddress,
        int[] memory initialPosition,
        int[] memory initialVelocity,
        uint[] memory initialTariff,
        uint[] memory initialCapacity,
        uint[] memory initialRenewableGeneration,
        uint[] memory initialBatteryCapacity,
        uint[] memory initialBatteryCharge,
        uint[] memory initialFlexibleLoad
    ) {
        globalContract = GlobalContractInterface(globalContractAddress);
        position = initialPosition;
        velocity = initialVelocity;
        personalBestPosition = initialPosition;
        tariff = initialTariff;
        capacity = initialCapacity;
        renewableGeneration = initialRenewableGeneration;
        batteryCapacity = initialBatteryCapacity;
        batteryCharge = initialBatteryCharge;
        flexibleLoad = initialFlexibleLoad;
    }

    // Funcția obiectiv calculează costul total (se poate interpreta ca penalizare
    // pentru consumul din rețea, în funcție de tarife și disponibilitatea regenerabilă).
    function objectiveFunction(int[] memory pos) public view returns (uint) {
        uint totalCost = 0;
        uint len = pos.length;
        uint[] memory tempRenewable = renewableGeneration;
        uint[] memory tempBattery = batteryCharge;

        for (uint i = 0; i < len; i++) {
            // Asigurăm că nu se lucrează cu valori negative
            uint consumption = pos[i] < 0 ? 0 : uint(pos[i]);
            // Prioritizăm consumul de energie regenerabilă
            if (tempRenewable[i] >= consumption) {
                tempRenewable[i] -= consumption;
                consumption = 0;
            } else {
                consumption -= tempRenewable[i];
                tempRenewable[i] = 0;
            }
            // Utilizăm energia din baterii dacă este necesar
            if (tempBattery[i] >= consumption) {
                tempBattery[i] -= consumption;
                consumption = 0;
            } else {
                consumption -= tempBattery[i];
                tempBattery[i] = 0;
            }
            uint cost = tariff[i] * consumption;
            totalCost += cost;
        }
        return totalCost;
    }

    // Nodul își actualizează cea mai bună soluție personală și o transmite contractului global.
    function updateBestPositions() public {
        uint currentScore = objectiveFunction(position);
        if (currentScore < personalBestScore) {
            personalBestScore = currentScore;
            personalBestPosition = position;
            emit BestPositionUpdated(address(this), currentScore);
        }
        globalContract.updateNodeResult(position, currentScore);
    }


   function updateVelocityAndPosition() public {
    uint globalTimestamp = globalContract.getLastUpdatedTimestamp();
    if (globalTimestamp > lastKnownGlobalTimestamp) {
        lastKnownGlobalTimestamp = globalTimestamp;
        emit NewPlanReceived(globalTimestamp);
    } else {
        return;
    }

    int[] memory globalPlan = globalContract.getGlobalOptimalPlanArray();
    require(globalPlan.length == position.length, "Dimensiuni inegale");

    for (uint i = 0; i < position.length; i++) {
        uint r1 = uint(keccak256(abi.encodePacked(block.timestamp, i, position[i]))) % 100;
        uint r2 = uint(keccak256(abi.encodePacked(block.timestamp, i + 1, velocity[i]))) % 100;
        int randomFactor = int(uint(keccak256(abi.encodePacked(block.timestamp, i, velocity[i])))) % 101 - 50; // Valori între -50 și 50

        int diffPersonal = personalBestPosition[i] - position[i];
        int diffGlobal = globalPlan[i] - position[i];

        // Nouă formulă pentru variație mai mare a vitezei
        velocity[i] = (w * velocity[i] + 
                      (c1 * int(r1) * diffPersonal) / 100 + 
                      (c2 * int(r2) * diffGlobal) / 100 +
                      randomFactor) / 100;

        // if (velocity[i] == 0) {
        //     velocity[i] = 5 + randomFactor % 5; // Evităm zero, dar adăugăm variație
        // }

        position[i] = position[i] + velocity[i];

        if (position[i] < 0) {
            position[i] = 0;
        }
        if (uint(position[i]) > flexibleLoad[i]) {
            position[i] = position[i] - int(flexibleLoad[i]);
        }
    }
}

}
