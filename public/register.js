let web3;
let userManagementContract;
let isMetaMaskConnected = false;

const HARDHAT_CHAIN_ID = '0x7a69'; // Chain ID 31337 in hex
const HARDHAT_NETWORK = {
    chainId: HARDHAT_CHAIN_ID,
    chainName: 'Hardhat Network',
    nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
    },
    rpcUrls: ['http://127.0.0.1:8545']
};

// Helper function to hash passwords consistently
function hashPassword(password) {
    // Convert string to bytes and then hash
    return web3.utils.keccak256(web3.utils.utf8ToHex(password));
}

async function checkAndSwitchNetwork() {
    try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== HARDHAT_CHAIN_ID) {
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: HARDHAT_CHAIN_ID }],
                });
                return true;
            } catch (switchError) {
                if (switchError.code === 4902) {
                    try {
                        await window.ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [HARDHAT_NETWORK],
                        });
                        return true;
                    } catch (addError) {
                        console.error('Error adding Hardhat network:', addError);
                        return false;
                    }
                }
                console.error('Error switching to Hardhat network:', switchError);
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Error checking network:', error);
        return false;
    }
}

async function checkMetaMaskConnection() {
    const messageDiv = document.getElementById('message');
    const registerForm = document.getElementById('registerForm');
    const connectButton = document.getElementById('connectMetaMask');

    connectButton.style.display = 'none';

    if (typeof window.ethereum === 'undefined') {
        messageDiv.textContent = 'Please install MetaMask to use this application';
        messageDiv.className = 'message error';
        registerForm.style.display = 'none';
        return false;
    }

    try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            try {
                const networkSwitched = await checkAndSwitchNetwork();
                if (!networkSwitched) {
                    messageDiv.textContent = 'Please switch to Hardhat Network in MetaMask';
                    messageDiv.className = 'message error';
                    registerForm.style.display = 'none';
                    return false;
                }

                web3 = new Web3(window.ethereum);
                const response = await fetch('/contract-config.json');
                const config = await response.json();
                userManagementContract = new web3.eth.Contract(config.userManagementABI, config.userManagementAddress);
                
                isMetaMaskConnected = true;
                messageDiv.textContent = 'MetaMask Connected';
                messageDiv.className = 'message success';
                registerForm.style.display = 'block';
                return true;
            } catch (error) {
                console.error('Error initializing Web3:', error);
                messageDiv.textContent = 'Error connecting to blockchain. Make sure your local node is running.';
                messageDiv.className = 'message error';
                registerForm.style.display = 'none';
                return false;
            }
        } else {
            messageDiv.textContent = 'Please connect your MetaMask wallet';
            messageDiv.className = 'message error';
            connectButton.style.display = 'block';
            registerForm.style.display = 'none';
            return false;
        }
    } catch (error) {
        console.error('Error checking MetaMask connection:', error);
        messageDiv.textContent = 'Error connecting to MetaMask';
        messageDiv.className = 'message error';
        registerForm.style.display = 'none';
        return false;
    }
}

async function connectMetaMask() {
    const messageDiv = document.getElementById('message');
    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        await checkMetaMaskConnection();
    } catch (error) {
        console.error('User denied account access');
        messageDiv.textContent = 'Please connect MetaMask to continue';
        messageDiv.className = 'message error';
    }
}

document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const role = parseInt(document.getElementById('role').value); // 0 for Student, 1 for Teacher
    const messageDiv = document.getElementById('message');
    
    try {
        const accounts = await web3.eth.getAccounts();
        
        console.log('Registering with:', {
            address: accounts[0],
            username,
            role
        });

        // Hash the password before sending to contract
        const hashedPassword = hashPassword(password);
        console.log('Original password:', password);
        console.log('Hashed password:', hashedPassword);

        messageDiv.textContent = 'Registering user...';
        messageDiv.className = 'message';

        // Register the user using the current account
        const tx = await userManagementContract.methods.registerUser(
            accounts[0], // The user's address
            username,
            hashedPassword, // Send hashed password
            role // Role enum: 0 = Student, 1 = Teacher
        ).send({ 
            from: accounts[0] // Use the current account
        });
        
        console.log('Registration transaction:', tx);
        console.log('✅ User registered successfully!');
        console.log('Address:', accounts[0]);
        console.log('Username:', username);
        console.log('Role:', role === 0 ? 'Student' : 'Teacher');
        
        messageDiv.textContent = 'Registration successful! Redirecting to login...';
        messageDiv.className = 'message success';
        
        // Redirect to login page after 2 seconds
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
    } catch (error) {
        console.error('Registration error:', error);
        if (error.message.includes("Only owner")) {
            messageDiv.textContent = 'Error: Only the contract owner can register users. Please switch to the owner account.';
        } else if (error.message.includes("User already exists")) {
            messageDiv.textContent = 'Error: User already exists for this address.';
        } else {
            messageDiv.textContent = 'Error during registration. Please try again.';
        }
        messageDiv.className = 'message error';
    }
});

// Add event listener for the connect button
document.getElementById('connectMetaMask').addEventListener('click', connectMetaMask);

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', function (accounts) {
        checkMetaMaskConnection();
    });

    window.ethereum.on('chainChanged', function (chainId) {
        window.location.reload();
    });
}

// Initialize on page load
window.addEventListener('load', checkMetaMaskConnection);