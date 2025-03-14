// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
/* CONTRACTUL GLOBAL
   Acest contract colectează rezultatele de la toate nodurile, stocate într-un mapping,
   și calculează planul optim global folosind un mapping (cheia fiind ora din zi).
   Astfel se elimină necesitatea de a gestiona explicit matrice 2D.
*/

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

contract GlobalContract {
    struct NodeResult {
        int[] bestPosition;
        int bestScore;
        uint[] flexibilityWeight;
        bool exists;
    }

    // Mapping de la adresa nodului la rezultatul său
    mapping(address => NodeResult) public nodeResults;
    // Lista adreselor nodurilor înregistrate
    address[] public nodeAddresses;
    // Mapping de la oră (index) la valoarea optimă agregată (planul global)
    mapping(uint => int) public globalOptimalPlan;
    // Numărul de ore pentru care se definește planul (ex.: 24)
    uint public numHours;

    uint public lastUpdatedTimestamp; // Momentul ultimei actualizări globale

    event NodeResultUpdated(address indexed node, int bestScore);
    event GlobalPlanComputed(int[] newPlan, uint timestamp);

    // Nodurile apelează această funcție pentru a-și transmite rezultatul optim.
    // Se folosește un mapping pentru a stoca rezultatele și o listă pentru a itera ulterior.
    function updateNodeResult(
        int[] calldata newPosition,
        int newScore,
        uint[] calldata newFlexibilityWeight
    ) external {
        if (!nodeResults[msg.sender].exists) {
            nodeResults[msg.sender] = NodeResult(
                newPosition,
                newScore,
                newFlexibilityWeight,
                true
            );
            nodeAddresses.push(msg.sender);
        } else {
            if (newScore < nodeResults[msg.sender].bestScore) {
                nodeResults[msg.sender].bestScore = newScore;
                nodeResults[msg.sender].bestPosition = newPosition;
                nodeResults[msg.sender]
                    .flexibilityWeight = newFlexibilityWeight;
            }
        }
        // Setează numărul de ore din planul de consum, dacă nu a fost deja stabilit.
        if (numHours == 0) {
            numHours = newPosition.length;
        } else {
            require(
                newPosition.length == numHours,
                "Dimensiune necorespunzatoare"
            );
        }
        emit NodeResultUpdated(msg.sender, newScore);
    }
    function getBestPosition(address _node) public view returns (int[] memory) {
        return nodeResults[_node].bestPosition;
    }
    // Returnează planul global complet sub formă de array.
    function getGlobalOptimalPlanArray() external view returns (int[] memory) {
        int[] memory copy = new int[](numHours);
        for (uint i = 0; i < numHours; i++) {
            copy[i] = globalOptimalPlan[i];
        }
        return copy;
    }

    // Calculează planul global optim. Pentru fiecare oră, se calculează media planurilor
    // optime ale nodurilor și se stochează în mapping-ul globalOptimalPlan.
    function computeGlobalOptimalPlan() public {
        require(nodeAddresses.length > 0, "Niciun nod inregistrat");
        require(numHours > 0, "numHours nu este setat");

        for (uint i = 0; i < numHours; i++) {
            int weightedSum = 0;
            uint totalWeight = 0;
            for (uint j = 0; j < nodeAddresses.length; j++) {
                if (nodeResults[nodeAddresses[j]].exists) {
                    uint weight = nodeResults[nodeAddresses[j]]
                        .flexibilityWeight[i];
                    weightedSum +=
                        int(weight) *
                        nodeResults[nodeAddresses[j]].bestPosition[i];
                    totalWeight += weight;
                }
            }
            if (totalWeight > 0) {
                globalOptimalPlan[i] = weightedSum / int(totalWeight);
            } else {
                globalOptimalPlan[i] = 5; // Evităm returnarea de 0
            }
        }
        lastUpdatedTimestamp = block.timestamp;
        emit GlobalPlanComputed(
            this.getGlobalOptimalPlanArray(),
            lastUpdatedTimestamp
        );
    }

    // Returnează valoarea planului global pentru o anumită oră.
    function getGlobalOptimalPlanHour(uint hour) external view returns (int) {
        require(hour < numHours, "Ora in afara intervalului");
        return globalOptimalPlan[hour];
    }

    function getLastUpdatedTimestamp() external view returns (uint) {
        return lastUpdatedTimestamp;
    }
}
