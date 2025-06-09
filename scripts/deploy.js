const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    // Deploy UserManagement contract
    console.log("Deploying UserManagement contract...");
    const UserManagement = await hre.ethers.getContractFactory("UserManagement");
    const userManagement = await UserManagement.deploy();
    await userManagement.deployed();
    console.log("UserManagement deployed to:", userManagement.address);
   
    // Deploy CertificateVerification contract with UserManagement address
    console.log("Deploying CertificateVerification contract...");
    const CertificateVerification = await hre.ethers.getContractFactory("CertificateVerification");
    const certificateVerification = await CertificateVerification.deploy(userManagement.address);
    await certificateVerification.deployed();
    console.log("CertificateVerification deployed to:", certificateVerification.address);
   
    // Extract ABIs safely
    console.log("Extracting contract ABIs...");
    const userManagementABI = userManagement.interface.format(hre.ethers.utils.FormatTypes.json);
    const certificateABI = certificateVerification.interface.format(hre.ethers.utils.FormatTypes.json);
    
    // Parse ABIs to ensure they're valid JSON
    let parsedUserABI;
    let parsedCertABI;
    
    try {
      parsedUserABI = JSON.parse(userManagementABI);
      parsedCertABI = JSON.parse(certificateABI);
    } catch (parseError) {
      console.error("Error parsing ABI:", parseError);
      throw parseError;
    }
   
    // Create configuration object
    const config = {
      userManagementAddress: userManagement.address,
      certificateAddress: certificateVerification.address,
      userManagementABI: parsedUserABI,
      certificateABI: parsedCertABI
    };
   
    // Save configuration
    const configPath = path.join(__dirname, '../public/contract-config.json');
    
    // Ensure directory exists
    const publicDir = path.dirname(configPath);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Contract configuration saved to:", configPath);
    
    // Verify the saved file
    const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log("Configuration verification:");
    console.log("- UserManagement ABI items:", savedConfig.userManagementABI.length);
    console.log("- Certificate ABI items:", savedConfig.certificateABI.length);
    console.log("- UserManagement address:", savedConfig.userManagementAddress);
    console.log("- Certificate address:", savedConfig.certificateAddress);
    
  } catch (error) {
    console.error("Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => {
    console.log("Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment error:", error);
    process.exit(1);
  });