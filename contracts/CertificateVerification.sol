// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./UserManagement.sol";

contract CertificateVerification {
    struct Certificate {
        string studentName;
        string courseName;
        uint256 issueDate;
        string certificateId;
        string ipfsHash;
        bool isVerified;
        bool isRejected;
        address studentAddress;
    }
    
    mapping(string => Certificate) public certificates;
    mapping(address => string[]) public studentCertificates;
    string[] public pendingCertificates;
    
    UserManagement public userManagement;
    address public owner;
    
    event CertificateIssued(
        string certificateId,
        string studentName,
        string courseName,
        uint256 issueDate,
        string ipfsHash,
        address studentAddress
    );
    
    event CertificateVerified(
        string certificateId,
        bool isApproved
    );
    
    constructor(address _userManagementAddress) {
        owner = msg.sender;
        userManagement = UserManagement(_userManagementAddress);
    }
    
    modifier onlyStudent() {
        require(userManagement.getUserRole(msg.sender) == UserManagement.Role.Student, "Only students can call this function");
        _;
    }
    
    modifier onlyTeacher() {
        require(userManagement.getUserRole(msg.sender) == UserManagement.Role.Teacher, "Only teachers can call this function");
        _;
    }
    
    function addressToString(address _addr) internal pure returns(string memory) {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }
    
    function issueCertificate(
        string memory courseName,
        string memory certificateId,
        uint256 issueDate,
        string memory ipfsHash
    ) public onlyStudent {
        require(certificates[certificateId].issueDate == 0, "Certificate ID already exists");
        
        certificates[certificateId] = Certificate({
            studentName: addressToString(msg.sender),
            courseName: courseName,
            issueDate: issueDate,
            certificateId: certificateId,
            ipfsHash: ipfsHash,
            isVerified: false,
            isRejected: false,
            studentAddress: msg.sender
        });
        
        studentCertificates[msg.sender].push(certificateId);
        pendingCertificates.push(certificateId);
        
        emit CertificateIssued(
            certificateId,
            addressToString(msg.sender),
            courseName,
            issueDate,
            ipfsHash,
            msg.sender
        );
    }
    
    function verifyCertificate(string memory certificateId, bool isApproved) public onlyTeacher {
        require(certificates[certificateId].issueDate != 0, "Certificate does not exist");
        require(!certificates[certificateId].isVerified && !certificates[certificateId].isRejected, "Certificate already verified or rejected");
        
        certificates[certificateId].isVerified = isApproved;
        certificates[certificateId].isRejected = !isApproved;
        
        // Remove from pending certificates
        for (uint i = 0; i < pendingCertificates.length; i++) {
            if (keccak256(bytes(pendingCertificates[i])) == keccak256(bytes(certificateId))) {
                pendingCertificates[i] = pendingCertificates[pendingCertificates.length - 1];
                pendingCertificates.pop();
                break;
            }
        }
        
        emit CertificateVerified(certificateId, isApproved);
    }
    
    function getCertificatesByStudent(address student) public view returns (Certificate[] memory) {
        string[] memory studentCertIds = studentCertificates[student];
        Certificate[] memory result = new Certificate[](studentCertIds.length);
        
        for (uint i = 0; i < studentCertIds.length; i++) {
            result[i] = certificates[studentCertIds[i]];
        }
        
        return result;
    }
    
    function getPendingCertificates() public view returns (Certificate[] memory) {
        Certificate[] memory result = new Certificate[](pendingCertificates.length);
        
        for (uint i = 0; i < pendingCertificates.length; i++) {
            result[i] = certificates[pendingCertificates[i]];
        }
        
        return result;
    }
    
    function getCertificate(string memory certificateId) public view returns (Certificate memory) {
        require(certificates[certificateId].issueDate != 0, "Certificate does not exist");
        return certificates[certificateId];
    }
}
