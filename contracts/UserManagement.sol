// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract UserManagement {
    enum Role { Student, Teacher }
    
    struct User {
        string username;
        string passwordHash;
        Role role;
        bool exists;
    }
    
    mapping(address => User) public users;

    event UserRegistered(address userAddress, string username, Role role);

    // Remove owner and onlyOwner since no longer needed for registration

    function registerUser(
        string memory username,
        string memory passwordHash,
        Role role
    ) public {
        require(!users[msg.sender].exists, "User already exists");
        require(role == Role.Student || role == Role.Teacher, "Invalid role");

        users[msg.sender] = User({
            username: username,
            passwordHash: passwordHash,
            role: role,
            exists: true
        });

        emit UserRegistered(msg.sender, username, role);
    }
    
    function login(string memory passwordHash) public view returns (bool success, uint8 userRole) {
        User memory user = users[msg.sender];
        if (user.exists && keccak256(abi.encodePacked(user.passwordHash)) == keccak256(abi.encodePacked(passwordHash))) {
            return (true, uint8(user.role));
        }
        return (false, 0);
    }
    
    function getUserRole(address userAddress) public view returns (Role) {
        require(users[userAddress].exists, "User does not exist");
        return users[userAddress].role;
    }
}
