// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* INTERFAȚĂ PENTRU GLOBAL CONTRACT */
interface GlobalContractInterface {
    function updateNodeResult(
        int[] calldata newPosition,
        int newScore,
        uint[] calldata newFlexibilityWeight
    ) external;
    function getGlobalOptimalPlanArray() external view returns (int[] memory);
    function getLastUpdatedTimestamp() external view returns (uint);
}

/* CONTRACTUL PENTRU UN NOD (prosumer)
   Fiecare nod își gestionează planul de consum pe ore și îl actualizează folosind un algoritm PSO.
   Pe lângă costul clasic (bazat pe consum, tarif, energie regenerabilă etc.), funcția obiectiv
   a fost extinsă pentru a influența costul final în funcție de cât de bine se aliniază
   planul local la planul global optim.
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
    int public c1 = 200;
    int public c2 = 200;

    // Date specifice nodului (preluate off-chain, de ex. din CSV)
    int[] public tariff; // Tarifele pe oră
    uint[] public capacity; // Capacitatea maximă a rețelei pe oră
    uint[] public renewableGeneration; // Energia regenerabilă disponibilă pe oră
    uint[] public batteryCapacity; // Capacitatea bateriei
    uint[] public batteryCharge; // Nivelul curent de încărcare al bateriei
    uint[] public flexibleLoad; // Limită de flexibilitate (mutare consum)

    // Penalizări locale (coeficienți pentru calculele inițiale)
    int constant ALPHA = 5; // Penalizare pentru consum peste capacitate
    int constant BETA = 3; // Penalizare pentru depășirea flexibilității
    int constant GAMMA = 2; // Penalizare pentru neutilizarea energiei regenerabile

    // Parametrii pentru influența planului global:
    int constant PENALTY_GLOBAL = 4; // Multiplicator pentru penalizarea suplimentară dacă nodul consumă peste planul global
    int constant REDEEM_GLOBAL = 2; // Multiplicator pentru bonusul de reducere a costului dacă nodul consumă sub planul global

    // Valorile de flexibilitate, definite on-chain (date din CSV)
    // - flexibilityAbove: cât de mult poate crește consumul
    // - flexibilityBelow: cât de mult poate scădea consumul
    uint[] public flexibilityAbove;
    uint[] public flexibilityBelow;

    GlobalContractInterface public globalContract;

    event BestPositionUpdated(address indexed node, int newScore);
    event NewPlanReceived(uint timestamp); // Semnalează primirea unui nou plan global

    // Constructor extins pentru a primi și valorile de flexibilitate și celelalte date
    constructor(
        address globalContractAddress,
        int[] memory initialPosition,
        int[] memory initialVelocity,
        int[] memory initialTariff,
        uint[] memory initialCapacity,
        uint[] memory initialRenewableGeneration,
        uint[] memory initialBatteryCapacity,
        uint[] memory initialBatteryCharge,
        uint[] memory initialFlexibleLoad,
        uint[] memory _flexibilityAbove,
        uint[] memory _flexibilityBelow
    ) {
        globalContract = GlobalContractInterface(globalContractAddress);

        // Copierea datelor pentru a evita problemele de read-only
        position = new int[](initialPosition.length);
        velocity = new int[](initialVelocity.length);
        personalBestPosition = new int[](initialPosition.length);
        tariff = new int[](initialTariff.length);
        capacity = new uint[](initialCapacity.length);
        renewableGeneration = new uint[](initialRenewableGeneration.length);
        batteryCapacity = new uint[](initialBatteryCapacity.length);
        batteryCharge = new uint[](initialBatteryCharge.length);
        flexibleLoad = new uint[](initialFlexibleLoad.length);
        flexibilityAbove = new uint[](_flexibilityAbove.length);
        flexibilityBelow = new uint[](_flexibilityBelow.length);

        for (uint i = 0; i < initialPosition.length; i++) {
            position[i] = initialPosition[i];
            personalBestPosition[i] = initialPosition[i];
            velocity[i] = initialVelocity[i];
            tariff[i] = initialTariff[i];
            capacity[i] = initialCapacity[i];
            renewableGeneration[i] = initialRenewableGeneration[i];
            batteryCapacity[i] = initialBatteryCapacity[i];
            batteryCharge[i] = initialBatteryCharge[i];
            flexibleLoad[i] = initialFlexibleLoad[i];
            flexibilityAbove[i] = _flexibilityAbove[i];
            flexibilityBelow[i] = _flexibilityBelow[i];
        }
    }

    /* 
       Funcția obiectiv calculează costul total de energie pentru un plan de consum.
       Se calculează:
         - Costul inițial pe baza consumului, tarifului și a resurselor de energie regenerabilă/baterie.
         - Penalizările locale (ex.: depășirea capacității, încălcarea flexibilității).
         - Ajustarea suplimentară bazată pe diferența față de planul global optim.
           Dacă abaterea față de planul global depășește un prag (10% din valoarea globală),
           se aplică o penalizare suplimentară dacă nodul consumă mai mult, sau se acordă bonus (răscumpărare) dacă consumul este sub planul global.
    */
    function objectiveFunction(int[] memory pos) public view returns (int) {
        int totalCost = 0;
        uint len = pos.length;
        // Copii temporare pentru valorile energetice care se consumă
        uint[] memory tempRenewable = renewableGeneration;
        uint[] memory tempBattery = batteryCharge;

        // Obține planul global optim din contractul global
        int[] memory globalPlan = globalContract.getGlobalOptimalPlanArray();

        for (uint i = 0; i < len; i++) {
            int consumption = pos[i];
            int localCost = 0;

            // Calculul costului inițial bazat pe consum:
            if (consumption < 0) {
                int effectiveTariff = getEffectiveTariff(i, consumption);
                localCost = -effectiveTariff * (-consumption);
            } else {
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
                localCost = int(tariff[i]) * int(cons);
            }

            // Calculul penalităților locale:
            int overConsumption = consumption > int(capacity[i])
                ? consumption - int(capacity[i])
                : int(0);
            int bestCons = personalBestPosition[i];
            int flex = int(flexibilityAbove[i] + flexibilityBelow[i]);
            int diff = consumption - bestCons;
            int absDiff = diff >= 0 ? diff : -diff;
            int flexibilityViolation = absDiff > flex ? absDiff - flex : int(0);
            int maxRenew = int(renewableGeneration[i]);
            int unusedRenewable = maxRenew > consumption
                ? maxRenew - consumption
                : int(0);
            int localPenalty = overConsumption *
                ALPHA +
                flexibilityViolation *
                BETA +
                unusedRenewable *
                GAMMA;

            // Ajustarea bazată pe diferența față de planul global:
            int globalAdjustment = 0;
            // Se aplică ajustarea doar dacă globalPlan are aceeași lungime ca și pos
            if (globalPlan.length == len) {
                int globalValue = globalPlan[i];
                int deviation = consumption - globalValue;
                int absDeviation = deviation >= 0 ? deviation : -deviation;
                int threshold = globalValue != 0 ? globalValue / 10 : int(0);
                if (absDeviation > threshold) {
                    if (deviation > 0) {
                        // Consum mai mare decât planul global
                        globalAdjustment = (absDeviation - threshold) * PENALTY_GLOBAL;
                    } else {
                        // Consum mai mic decât planul global
                        globalAdjustment = -((absDeviation - threshold) * REDEEM_GLOBAL);
                    }
                }
            }

            // Costul final pentru ora i include costul inițial, penalitățile locale și ajustarea globală
            int hourCost = localCost + localPenalty + globalAdjustment;
            totalCost += hourCost;
        }
        return totalCost;
    }

    // Funcția de calcul a tarifului efectiv (cu discounturi pentru injectare de energie)
    function getEffectiveTariff(
        uint hour,
        int consumption
    ) public view returns (int) {
        int base = int(tariff[hour]);
        if (consumption < 0) {
            uint absConsumption = uint(-consumption);
            uint extraDiscount = absConsumption / 2;
            uint totalDiscount = 20 + extraDiscount;
            if (totalDiscount > 40) {
                totalDiscount = 40;
            }
            return (base * int(100 - totalDiscount)) / 100;
        } else {
            return base;
        }
    }

    // Actualizează cea mai bună poziție și transmite rezultatul către GlobalContract.
    function updateBestPositions() public {
        int currentScore = objectiveFunction(position);
        if (currentScore < personalBestScore) {
            personalBestScore = currentScore;
            personalBestPosition = position;
            emit BestPositionUpdated(address(this), currentScore);
        }
        uint[] memory flexWeights = calculateFlexibilityWeight();
        globalContract.updateNodeResult(position, currentScore, flexWeights);
    }

    // Calculează "ponderile de flexibilitate" pentru fiecare oră.
    function calculateFlexibilityWeight()
        internal
        view
        returns (uint[] memory)
    {
        uint len = flexibilityAbove.length;
        uint[] memory weights = new uint[](len);
        for (uint i = 0; i < len; i++) {
            weights[i] = (flexibilityAbove[i] + flexibilityBelow[i]) / 2;
        }
        return weights;
    }

    // Actualizează viteza și poziția folosind planul global și algoritmul PSO.
    function updateVelocityAndPosition() public {
        uint globalTimestamp = globalContract.getLastUpdatedTimestamp();
        if (globalTimestamp > lastKnownGlobalTimestamp) {
            lastKnownGlobalTimestamp = globalTimestamp;
            emit NewPlanReceived(globalTimestamp);
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

            // Aplică limitele de flexibilitate
            int minAllowed = personalBestPosition[i] -
                int(flexibilityBelow[i]) *
                2;
            int maxAllowed = personalBestPosition[i] +
                int(flexibilityAbove[i]) *
                2;

            if (position[i] < minAllowed) {
                position[i] = minAllowed;
            }
            if (position[i] > maxAllowed) {
                position[i] = maxAllowed;
            }
        }
    }

    // Getter pentru poziție (copie a vectorului pentru siguranță)
    function getPosition() public view returns (int[] memory) {
        int[] memory copy = new int[](position.length);
        for (uint i = 0; i < position.length; i++) {
            copy[i] = position[i];
        }
        return copy;
    }
}
