// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
//modific in matrice ca sa tin cont de toti prosumerii si orele 
contract GlobalContract {
    uint[] public globalBestPosition;
    uint public globalBestScore = type(uint).max;

    constructor() {
        globalBestPosition = [10, 20, 30]; // Inițializare explicită
    }

    function updateGlobalBestPosition(uint[] calldata newPosition, uint newScore) external {
        if (newScore < globalBestScore) {
            globalBestScore = newScore;
            globalBestPosition = newPosition;
        }
    }

    function getGlobalBestPosition() external view returns (uint[] memory) {
        return globalBestPosition;
    }
}
