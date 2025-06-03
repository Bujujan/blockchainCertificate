const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Deploy UserManagement contract
  const UserManagement = await hre.ethers.getContractFactory("UserManagement");
  const userManagement = await UserManagement.deploy();
  await userManagement.deployed();
  console.log("UserManagement deployed to:", userManagement.address);
  
  // Deploy CertificateVerification contract with UserManagement address
  const CertificateVerification = await hre.ethers.getContractFactory("CertificateVerification");
  const certificateVerification = await CertificateVerification.deploy(userManagement.address);
  await certificateVerification.deployed();
  console.log("CertificateVerification deployed to:", certificateVerification.address);
  
  // Save contract addresses and ABIs
  const config = {
    userManagementAddress: userManagement.address,
    certificateAddress: certificateVerification.address,
    userManagementABI: JSON.parse(userManagement.interface.format('json')),
    certificateABI: JSON.parse(certificateVerification.interface.format('json'))
  };
  
  const configPath = path.join(__dirname, '../public/contract-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log("Contract configuration saved to:", configPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
