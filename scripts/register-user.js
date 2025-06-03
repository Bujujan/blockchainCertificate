const hre = require("hardhat");

async function main() {
    const UserManagement = await hre.ethers.getContractFactory("UserManagement");
    const userManagement = await UserManagement.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
    
    // Get the first account (which is the one we'll use)
    const [owner] = await hre.ethers.getSigners();
    
    // Hash the password using ethers.js (compatible with web3.js method)
    const password = "password123";
    const hashedPassword = hre.ethers.utils.keccak256(hre.ethers.utils.toUtf8Bytes(password));
    
    console.log('Original password:', password);
    console.log('Hashed password:', hashedPassword);
   
    try {
        // Register the user as a student (Role.Student = 0)
        const tx = await userManagement.registerUser(
            owner.address,
            "student1",
            hashedPassword, // Use hashed password
            0 // Role.Student
        );
       
        await tx.wait();
        console.log("✅ User registered successfully!");
        console.log("Address:", owner.address);
        console.log("Username: student1");
        console.log("Role: Student");
        console.log("Transaction hash:", tx.hash);
    } catch (error) {
        console.error("❌ Registration failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });