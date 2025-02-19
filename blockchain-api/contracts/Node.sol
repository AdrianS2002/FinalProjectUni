// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface GlobalContractInterface {
    function updateGlobalBestPosition(uint[] calldata newPosition, uint newScore) external;
    function getGlobalBestPosition() external view returns (uint[] memory);
}

contract Node {
    uint[] public position;                // Node's current position (e.g., energy usage)
    uint[] public velocity;                // Node's current velocity
    uint[] public personalBestPosition;    // Node's personal best position
    uint public personalBestScore = type(uint).max;  // Best score achieved by this node

    uint public w = 50;  // Inertia weight
    uint public c1 = 150;  // Cognitive coefficient
    uint public c2 = 150;  // Social coefficient

    GlobalContractInterface public globalContract;

    constructor(address globalContractAddress, uint[] memory initialPosition, uint[] memory initialVelocity) {
        globalContract = GlobalContractInterface(globalContractAddress);
        position = initialPosition;
        velocity = initialVelocity;
        personalBestPosition = initialPosition;
    }

    // Objective function to be minimized (e.g., energy cost)
    function objectiveFunction(uint[] memory pos) public pure returns (uint) {
        uint sum = 0;
        for (uint i = 0; i < pos.length; i++) {
            sum += pos[i] ** 2;  // Example: Sphere function
        }
        return sum;
    }

    // Update personal and global best if necessary
    function updateBestPositions() public {
        uint currentScore = objectiveFunction(position);

        // Update personal best
        if (currentScore < personalBestScore) {
            personalBestScore = currentScore;
            personalBestPosition = position;
        }

        // Check if this node has the global best score and update if necessary
        uint[] memory globalBestPosition = globalContract.getGlobalBestPosition();
        uint globalBestScore = objectiveFunction(globalBestPosition);

        if (currentScore < globalBestScore) {
            globalContract.updateGlobalBestPosition(position, currentScore);
        }
    }

    // Update velocity and position according to PSO formula
    function updateVelocityAndPosition() public {
        uint[] memory globalBestPosition = globalContract.getGlobalBestPosition();

        for (uint i = 0; i < position.length; i++) {
            uint r1 = uint(keccak256(abi.encodePacked(block.timestamp, i))) % 100;  // Random factor
            uint r2 = uint(keccak256(abi.encodePacked(block.timestamp, i + 1))) % 100;

            // Update velocity
            velocity[i] = (w * velocity[i] +
                           c1 * r1 * (personalBestPosition[i] - position[i]) / 100 +
                           c2 * r2 * (globalBestPosition[i] - position[i]) / 100) / 100;

            // Update position
            position[i] += velocity[i];
        }
    }
}
