// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface GlobalContractInterface {
    function updateGlobalBestPosition(
        uint[] calldata newPosition,
        uint newScore
    ) external;
    function getGlobalBestPosition() external view returns (uint[] memory);
}

contract Node {
    // Consum de energie pe ore pt un  nod
    uint[] public position;

    // Ritmul de modificare a consumului de energie (ajustare a consumului în funcție de tarife și rețea)
    uint[] public velocity;

    // Cel mai eficient plan de consum al unui nod (ex: cel mai mic cost obținut anterior)
    uint[] public personalBestPosition;

    // Costul minim de energie obținut pentru un anumit plan de consum
    uint public personalBestScore = type(uint).max;

    // Parametrii PSO
    uint public w = 50; // Inerția
    uint public c1 = 150; // Coeficient cognitiv
    uint public c2 = 150; // Coeficient social

    // pret energiei per oră
    uint[] public tariff;

    // Capacitatea maximă a rețelei pe oră
    uint[] public capacity;

    // Penalizare pentru depășirea capacității rețelei
    uint public penaltyRate;

    // Generarea de energie regenerabilă disponibilă pe oră
    uint[] public renewableGeneration;

    // Capacitatea bateriei și nivelul actual de încărcare
    uint[] public batteryCapacity;
    uint[] public batteryCharge;

    // posibilitatea de a muta consumul în alte ore
    uint[] public flexibleLoad;

    // Pragul de cerere de vârf (setat dinamic din backend)
    uint public peakDemandThreshold;

    // Penalizare pentru depășirea pragului de cerere de vârf
    uint public peakDemandPenalty;

    GlobalContractInterface public globalContract;

    constructor(
        address globalContractAddress,
        uint[] memory initialPosition,
        uint[] memory initialVelocity,
        uint[] memory initialTariff,
        uint[] memory initialCapacity,
        uint[] memory initialRenewableGeneration,
        uint[] memory initialBatteryCapacity,
        uint[] memory initialBatteryCharge,
        uint[] memory initialFlexibleLoad,
        uint _penaltyRate,
        uint _peakDemandThreshold,
        uint _peakDemandPenalty
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
        penaltyRate = _penaltyRate;
        peakDemandThreshold = _peakDemandThreshold;
        peakDemandPenalty = _peakDemandPenalty;
    }

    // Permite backend-ului să actualizeze penalizarea dinamică
    function updatePenaltyRate(uint nodeId, uint _penaltyRate) external {
        require(nodeId < position.length, "Node ID invalid");
        penaltyRate = _penaltyRate;
    }

    // Permite backend-ului să actualizeze pragul de cerere de vârf
    function updatePeakDemandThreshold(
        uint nodeId,
        uint _peakDemandThreshold
    ) external {
        require(nodeId < position.length, "Node ID invalid");
        peakDemandThreshold = _peakDemandThreshold;
    }

    // Funcție obiectiv pentru optimizarea costurilor. calculeaza costul total de energie
    function objectiveFunction(uint[] memory pos) public view returns (uint) {
        uint totalCost = 0;

        uint[] memory tempRenewableGeneration = renewableGeneration;
        uint[] memory tempBatteryCharge = batteryCharge;

        for (uint i = 0; i < pos.length; i++) {
            uint actualConsumption = pos[i];

            // Utilizare energie regenerabilă
            if (tempRenewableGeneration[i] >= actualConsumption) {
                actualConsumption = 0;
                tempRenewableGeneration[i] -= pos[i];
            } else {
                actualConsumption -= tempRenewableGeneration[i];
                tempRenewableGeneration[i] = 0;
            }

            // Utilizare baterii
            if (tempBatteryCharge[i] >= actualConsumption) {
                tempBatteryCharge[i] -= actualConsumption;
                actualConsumption = 0;
            } else {
                actualConsumption -= tempBatteryCharge[i];
                tempBatteryCharge[i] = 0;
            }

            // Costuri dinamice pe baza tarifului
            uint cost = tariff[i] * actualConsumption;

            // Penalizare pentru cerere de vârf
            if (actualConsumption > peakDemandThreshold) {
                cost +=
                    (actualConsumption - peakDemandThreshold) *
                    peakDemandPenalty;
            }

            // Penalizare pentru depășirea capacității rețelei
            if (actualConsumption > capacity[i]) {
                cost += (actualConsumption - capacity[i]) * penaltyRate;
            }

            totalCost += cost;
        }

        return totalCost;
    }

    // Actualizare a celei mai bune poziții personale și globale
    function updateBestPositions() public {
        uint currentScore = objectiveFunction(position);

        // Actualizare a celei mai bune soluții personale
        if (currentScore < personalBestScore) {
            personalBestScore = currentScore;
            personalBestPosition = position;
        }

        // Comparare cu cea mai bună poziție globală
        uint[] memory globalBestPosition = globalContract
            .getGlobalBestPosition();
        uint globalBestScore = objectiveFunction(globalBestPosition);

        if (currentScore < globalBestScore) {
            globalContract.updateGlobalBestPosition(position, currentScore);
        }
    }
    function getPersonalBestPosition() public view returns (uint[] memory) {
        return personalBestPosition;
    }
    // Actualizare a vitezei și a poziției conform PSO
    function updateVelocityAndPosition() public {
        uint[] memory globalBestPosition = globalContract
            .getGlobalBestPosition();

        require(
            globalBestPosition.length == position.length,
            "Array length mismatch"
        );

        for (uint i = 0; i < position.length; i++) {
            uint r1 = uint(keccak256(abi.encodePacked(block.timestamp, i))) %
                100;
            uint r2 = uint(
                keccak256(abi.encodePacked(block.timestamp, i + 1))
            ) % 100;

            // Asigură-te că toate array-urile sunt sincronizate
            require(i < velocity.length, "Velocity index out of bounds");

            // Calculare nouă viteză conform formulei PSO
            velocity[i] =
                (w *
                    velocity[i] +
                    (c1 * r1 * (personalBestPosition[i] - position[i])) /
                    100 +
                    (c2 * r2 * (globalBestPosition[i] - position[i])) /
                    100) /
                100;

            // Actualizare poziție
            position[i] += velocity[i];

            // Aplicare flexibilitate (mutare consum în alte ore)
            if (position[i] > flexibleLoad[i]) {
                position[i] -= flexibleLoad[i];
            }
        }
    }
}
