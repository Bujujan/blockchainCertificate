# Certificate Verification System using Blockchain and IPFS

This project implements a decentralized certificate verification system using Ethereum blockchain and IPFS. It allows institutions to issue digital certificates and anyone to verify their authenticity.

## Features

- Issue digital certificates with student details and certificate images
- Store certificate images on IPFS for decentralized storage
- Store certificate metadata on Ethereum blockchain for immutable verification
- Verify certificates using unique certificate IDs
- View certificate details and images during verification
- Modern and responsive UI

## Technology Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express.js
- **Blockchain**: Ethereum (Ganache for local development)
- **Smart Contract Development**: Solidity, Hardhat
- **Storage**: IPFS (InterPlanetary File System)
- **Web3 Integration**: Web3.js, MetaMask
- **Package Management**: npm

## Prerequisites

Before running this project, make sure you have the following installed:

1. Node.js (v14 or higher)
2. IPFS Desktop
3. Ganache
4. MetaMask browser extension
5. Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ARamesh-tech/CertificateVerification_Blockchain.git
cd CertificateVerification_Blockchain
```

2. Install dependencies:
```bash
npm install
```

3. Start IPFS Desktop and ensure it's running on port 5001

4. Start Ganache and ensure it's running on port 7545

5. Deploy the smart contract:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network ganache
```

6. Start the server:
```bash
node server.js
```

The application will be available at http://localhost:2444

## Configuration

1. **MetaMask Setup**:
   - Connect MetaMask to Ganache (Custom RPC)
   - Network Name: Ganache
   - RPC URL: http://127.0.0.1:7545
   - Chain ID: 1337
   - Import an account from Ganache using its private key

2. **IPFS Configuration**:
   - IPFS should be running locally on port 5001
   - The application automatically connects to the local IPFS node

## Usage

### Issuing a Certificate

1. Navigate to the "Issue Certificate" tab
2. Fill in the certificate details:
   - Student Name
   - Course Name
   - Certificate ID (unique identifier)
   - Issue Date
   - Upload certificate image
3. Click "Issue Certificate"
4. Confirm the transaction in MetaMask

### Verifying a Certificate

1. Navigate to the "Verify Certificate" tab
2. Enter the Certificate ID
3. Click "Verify Certificate"
4. View the certificate details and image

## Project Structure

```
testCert/
├── contracts/
│   └── CertificateVerification.sol    # Smart contract
├── scripts/
│   └── deploy.js                      # Deployment script
├── public/
│   ├── index.html                     # Frontend HTML
│   ├── style.css                      # Styling
│   ├── app.js                         # Frontend JavaScript
│   └── contract-config.json           # Contract ABI and address
├── server.js                          # Express server
├── hardhat.config.js                  # Hardhat configuration
└── package.json                       # Project dependencies
```

## Smart Contract Functions

### `issueCertificate`
```solidity
function issueCertificate(
    string memory studentName,
    string memory courseName,
    string memory certificateId,
    uint256 issueDate,
    string memory ipfsHash
) public onlyOwner
```

### `verifyCertificate`
```solidity
function verifyCertificate(string memory certificateId)
    public
    view
    returns (
        string memory studentName,
        string memory courseName,
        uint256 issueDate,
        string memory ipfsHash,
        bool isValid
    )
```

## Security Features

1. Only the contract owner can issue certificates
2. Certificate data is immutably stored on the blockchain
3. Certificate images are stored on IPFS ensuring integrity
4. Each certificate has a unique identifier
5. MetaMask ensures secure transaction signing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- OpenZeppelin for smart contract security patterns
- IPFS team for decentralized storage
- Hardhat team for development environment
- Ethereum community for blockchain infrastructure
