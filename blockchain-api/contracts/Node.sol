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
    function getBestGlobalPlan() external view returns (int[] memory);
    function frozenGlobalCost() external view returns (int);
}

/* CONTRACTUL PENTRU UN NOD (prosumer)
   Fiecare nod își gestionează planul de consum pe ore și își actualizează
   poziția și costul folosind un algoritm PSO. Se salvează snapshot-ul costului
   optim și al anumitor parametri (ex.: resurse regenerabile și nivelul bateriei)
   pentru a putea recalcula costul ulterior, în condiții identice.
*/
contract Node {
    // Vectorii pentru planul de consum (ex: 24 de ore)
    int[] public position;
    int[] public velocity;
    int[] public personalBestPosition;
    int public personalBestScore = type(int).max;
    uint public lastKnownGlobalTimestamp;

    // Parametrii PSO
    int public w = 50;
    int public c1 = 200;
    int public c2 = 200;

    // Date specifice nodului
    int[] public tariff;
    uint[] public capacity;
    uint[] public renewableGeneration;
    uint[] public batteryCapacity;
    uint[] public batteryCharge;
    uint[] public flexibleLoad;

    // Penalizări locale
    int constant ALPHA = 5;
    int constant BETA = 3;
    int constant GAMMA = 2;

    // Parametrii pentru influența planului global
    int constant PENALTY_GLOBAL = 4;
    int constant REDEEM_GLOBAL = 2;

    // Valorile de flexibilitate
    uint[] public flexibilityAbove;
    uint[] public flexibilityBelow;

    GlobalContractInterface public globalContract;

    event BestPositionUpdated(address indexed node, int newScore);
    event NewPlanReceived(uint timestamp);

    // changed: Adăugăm variabile pentru snapshot-ul parametrilor critici
    uint[] public frozenRenewableGeneration;
    uint[] public frozenBatteryCharge;

    // Constructor extins
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
       Funcția obiectiv calculează costul total de energie pentru un plan de consum,
       ținând cont de consum, tarife, penalizări locale și ajustări globale.
    */
    function objectiveFunction(int[] memory pos) public view returns (int) {
        int totalCost = 0;
        uint len = pos.length;
        // Copii locale ale valorilor curente
        uint[] memory tempRenewable = renewableGeneration;
        uint[] memory tempBattery = batteryCharge;

        int[] memory globalPlan = globalContract.getBestGlobalPlan();

        for (uint i = 0; i < len; i++) {
            int consumption = pos[i];
            int localCost = 0;

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

            int globalAdjustment = 0;
            if (globalPlan.length == len) {
                int globalValue = globalPlan[i];
                int deviation = consumption - globalValue;
                int absDeviation = deviation >= 0 ? deviation : -deviation;
                int threshold = globalValue != 0 ? globalValue / 10 : int(0);
                if (absDeviation > threshold) {
                    if (deviation > 0) {
                        globalAdjustment =
                            (absDeviation - threshold) *
                            PENALTY_GLOBAL;
                    } else {
                        globalAdjustment = -((absDeviation - threshold) *
                            REDEEM_GLOBAL);
                    }
                }
            }
            int hourCost = localCost + localPenalty + globalAdjustment;
            totalCost += hourCost;
        }
        return totalCost;
    }

    // Funcția de calcul a tarifului efectiv (cu discount)
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
            // : Salvăm și snapshot-ul valorilor critice la momentul obținerii celui mai bun cost.
            delete frozenRenewableGeneration;
            delete frozenBatteryCharge;
            for (uint i = 0; i < renewableGeneration.length; i++) {
                frozenRenewableGeneration.push(renewableGeneration[i]);
                frozenBatteryCharge.push(batteryCharge[i]);
            }
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
        int[] memory globalPlan = globalContract.getBestGlobalPlan();
        require(globalPlan.length == position.length, "Dimensiuni inegale");

        for (uint i = 0; i < position.length; i++) {
            uint r1 = uint(
                keccak256(abi.encodePacked(block.timestamp, i, position[i]))
            ) % 100;
            uint r2 = uint(
                keccak256(abi.encodePacked(block.timestamp, i + 1, velocity[i]))
            ) % 100;
            int randomFactor = (
                int(
                    uint(
                        keccak256(
                            abi.encodePacked(block.timestamp, i, velocity[i])
                        )
                    ) % 101
                )
            ) - 50;

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



    function objectiveFunctionFrozen(
        int[] memory pos
    ) public view returns (int) {
        int totalCost = 0;
        uint len = pos.length;
        // Copiem snapshot-ul valorilor salvate
        uint[] memory tempRenewable = new uint[](
            frozenRenewableGeneration.length
        );
        for (uint i = 0; i < frozenRenewableGeneration.length; i++) {
            tempRenewable[i] = frozenRenewableGeneration[i];
        }
        uint[] memory tempBattery = new uint[](frozenBatteryCharge.length);
        for (uint i = 0; i < frozenBatteryCharge.length; i++) {
            tempBattery[i] = frozenBatteryCharge[i];
        }
        int[] memory globalPlan = globalContract.getBestGlobalPlan();

        for (uint i = 0; i < len; i++) {
            int consumption = pos[i];
            int localCost = 0;

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

            int overConsumption = consumption > int(capacity[i])
                ? consumption - int(capacity[i])
                : int(0);
            int bestCons = personalBestPosition[i];
            int flex = int(flexibilityAbove[i] + flexibilityBelow[i]);
            int diff = consumption - bestCons;
            int absDiff = diff >= 0 ? diff : -diff;
            int flexibilityViolation = absDiff > flex ? absDiff - flex : int(0);
            // Folosim snapshot-ul pentru resurse regenerabile
            int maxRenew = int(frozenRenewableGeneration[i]);
            int unusedRenewable = maxRenew > consumption
                ? maxRenew - consumption
                : int(0);
            int localPenalty = overConsumption *
                ALPHA +
                flexibilityViolation *
                BETA +
                unusedRenewable *
                GAMMA;

            int globalAdjustment = 0;
            if (globalPlan.length == len) {
                int globalValue = globalPlan[i];
                int deviation = consumption - globalValue;
                int absDeviation = deviation >= 0 ? deviation : -deviation;
                int threshold = globalValue != 0 ? globalValue / 10 : int(0);
                if (absDeviation > threshold) {
                    if (deviation > 0) {
                        globalAdjustment =
                            (absDeviation - threshold) *
                            PENALTY_GLOBAL;
                    } else {
                        globalAdjustment = -((absDeviation - threshold) *
                            REDEEM_GLOBAL);
                    }
                }
            }
            int hourCost = localCost + localPenalty + globalAdjustment;
            totalCost += hourCost;
        }
        return totalCost;
    }
    function getPersonalBestPosition() public view returns (int[] memory) {
        return personalBestPosition;
    }

    // Convenience function: returnează costul calculat cu snapshot-ul
    function getFrozenCost() public view returns (int) {
        return objectiveFunctionFrozen(personalBestPosition);
    }

    // changed: Funcția applyFinalPlan nu mai modifică poziția sau costul,
    // păstrând snapshot-ul din iterația optimă.
    function applyFinalPlan() external {
        // Doar se poate seta un flag de finalizare dacă este nevoie.
    }

    function getPosition() public view returns (int[] memory) {
        int[] memory copy = new int[](position.length);
        for (uint i = 0; i < position.length; i++) {
            copy[i] = position[i];
        }
        return copy;
    }
}
