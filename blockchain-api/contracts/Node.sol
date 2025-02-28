// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* INTERFAȚĂ PENTRU GLOBAL CONTRACT */
interface GlobalContractInterface {
    function updateNodeResult(
        int[] calldata newPosition,
        int newScore
    ) external;
    function getGlobalOptimalPlanArray() external view returns (int[] memory);
    function getLastUpdatedTimestamp() external view returns (uint);
}

/* CONTRACTUL PENTRU UN NOD (prosumer)
   Fiecare nod își gestionează planul de consum pe ore și îl actualizează folosind
   un algoritm PSO. Valorile privind flexibilitatea (flexibilityAbove și flexibilityBelow)
   sunt stocate on-chain, dar orice penalizare suplimentară (de exemplu, costuri mai mari)
   se calculează off-chain.
*/
contract Node {
    // Vectorii reprezintă planul de consum pe ore (ex: 24 de ore)
    int[] public position;
    int[] public velocity;
    int[] public personalBestPosition;
    int public personalBestScore = type(int).max;
    uint public lastKnownGlobalTimestamp; // Ultimul timestamp sincronizat

    // Parametrii PSO: w – inerție, c1 și c2 – coeficienți pentru componentele cognitivă și socială.
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

    // Valorile de flexibilitate, definite on-chain (date din CSV):
    // - flexibilityAbove: cât de mult poate crește consumul (de exemplu, dacă nodul poate consuma mai mult în anumite ore)
    // - flexibilityBelow: cât de mult poate scădea consumul (de exemplu, dacă nodul poate reduce consumul în orele cu tarif ridicat)
    uint[] public flexibilityAbove;
    uint[] public flexibilityBelow;

    GlobalContractInterface public globalContract;

    event BestPositionUpdated(address indexed node, int newScore);
    event NewPlanReceived(uint timestamp); // Semnalează primirea unui nou plan global

    // Constructor extins pentru a primi și valorile de flexibilitate
    constructor(
        address globalContractAddress,
        int[] memory initialPosition,
        int[] memory initialVelocity,
        uint[] memory initialTariff,
        uint[] memory initialCapacity,
        uint[] memory initialRenewableGeneration,
        uint[] memory initialBatteryCapacity,
        uint[] memory initialBatteryCharge,
        uint[] memory initialFlexibleLoad,
        uint[] memory _flexibilityAbove,
        uint[] memory _flexibilityBelow
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
        flexibilityAbove = _flexibilityAbove;
        flexibilityBelow = _flexibilityBelow;
    }

    // Funcția obiectiv calculează costul total de energie pe baza consumului, tarifului
    // și disponibilității energiei regenerabile. Penalizarea suplimentară (dacă nodul nu poate reduce consumul)
    // se calculează off-chain.
    function objectiveFunction(int[] memory pos) public view returns (int) {
        int totalCost = 0;
        uint len = pos.length;
        uint[] memory tempRenewable = renewableGeneration;
        uint[] memory tempBattery = batteryCharge;

        for (uint i = 0; i < len; i++) {
            int consumption = pos[i];
            // Prioritizăm consumul de energie regenerabilă
            if (consumption < 0) {
                // Exemplu: reward = - (consumption in absolute value * un factor)
                // Astfel, costul devine negativ, indicând un beneficiu.
                totalCost -= int(tariff[i]) * (-consumption);
            } else {
                // Tratarea consumului pozitiv (similar cu implementarea existentă)
                uint cons = uint(consumption);
                if (tempRenewable[i] >= cons) {
                    tempRenewable[i] -= cons;
                    cons = 0;
                } else {
                    cons -= tempRenewable[i];
                    tempRenewable[i] = 0;
                }
                if (tempBattery[i] >= cons) {
                    tempBattery[i] -= cons;
                    cons = 0;
                } else {
                    cons -= tempBattery[i];
                    tempBattery[i] = 0;
                }
                totalCost += int(tariff[i]) * int(cons);
            }
        } 
        return totalCost;
    }

    // Nodul își actualizează cea mai bună soluție personală și transmite rezultatul către GlobalContract.
    // Observație: Smart contractul transmite doar planul de consum și costul aferent (fără penalizare on-chain).
    // Algoritmul off-chain va calcula, ulterior, penalizarea dacă flexibilitatea nodului nu permite optimizarea.
    function updateBestPositions() public {
        int currentScore = objectiveFunction(position);
        if (currentScore < personalBestScore) {
            personalBestScore = currentScore;
            personalBestPosition = position;
            emit BestPositionUpdated(address(this), currentScore);
        }
        globalContract.updateNodeResult(position, currentScore);
    }

    // Actualizează viteza și poziția folosind planul global și algoritmul PSO.
    // Limitele de flexibilitate sunt aplicate on-chain pentru a restricționa valorile consumului,
    // dar orice penalizare suplimentară (costuri mai mari) se va calcula off-chain.
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
            uint r1 = uint(
                keccak256(abi.encodePacked(block.timestamp, i, position[i]))
            ) % 100;
            uint r2 = uint(
                keccak256(abi.encodePacked(block.timestamp, i + 1, velocity[i]))
            ) % 100;
            int randomFactor = (int(
                uint(
                    keccak256(abi.encodePacked(block.timestamp, i, velocity[i]))
                )
            ) % 101) - 50;

            int diffPersonal = personalBestPosition[i] - position[i];
            int diffGlobal = globalPlan[i] - position[i];

            velocity[i] =
                (w *
                    velocity[i] +
                    (c1 * int(r1) * diffPersonal) /
                    100 +
                    (c2 * int(r2) * diffGlobal) /
                    100 +
                    randomFactor) /
                100;

            position[i] = position[i] + velocity[i];

            // Aplicăm limitele de flexibilitate:
            // Se presupune că personalBestPosition reprezintă consumul de referință.
            int referenceConsumption = personalBestPosition[i];
            int minAllowed = referenceConsumption - int(flexibilityBelow[i]);
            int maxAllowed = referenceConsumption + int(flexibilityAbove[i]);

            if (position[i] < minAllowed) {
                position[i] = minAllowed;
            }
            if (position[i] > maxAllowed) {
                position[i] = maxAllowed;
            }
        }
    }
}
