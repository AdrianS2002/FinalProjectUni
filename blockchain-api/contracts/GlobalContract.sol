// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GlobalContract {
    uint[] public globalBestPosition;
    uint public globalBestScore = type(uint).max;

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
