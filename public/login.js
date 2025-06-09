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

async function checkContractDeployment(contractAddress) {
    try {
        const code = await web3.eth.getCode(contractAddress);
        if (code === '0x' || code === '0x0') {
            console.error('No contract code found at address:', contractAddress);
            return false;
        }
        console.log('Contract code found at address:', contractAddress);
        console.log('Code length:', code.length);
        return true;
    } catch (error) {
        console.error('Error checking contract deployment:', error);
        return false;
    }
}

async function validateABI(abi) {
    try {
        if (!Array.isArray(abi)) {
            console.error('ABI is not an array:', typeof abi);
            return false;
        }
        
        // Check if ABI has required structure
        for (let i = 0; i < abi.length; i++) {
            const item = abi[i];
            if (!item.type) {
                console.error(ABI item ${i} missing type:, item);
                return false;
            }
            
            // Check for common malformed data
            if (typeof item.type !== 'string') {
                console.error(ABI item ${i} has invalid type:, item.type);
                return false;
            }
        }
        
        console.log('ABI validation passed');
        return true;
    } catch (error) {
        console.error('ABI validation error:', error);
        return false;
    }
}

async function initializeContract(config) {
    try {
        console.log('Initializing contract with config:', {
            address: config.userManagementAddress,
            abiLength: config.userManagementABI?.length
        });

        // Validate ABI first
        if (!await validateABI(config.userManagementABI)) {
            throw new Error('Invalid ABI structure');
        }

        // Log the ABI structure for debugging
        console.log('ABI functions:', config.userManagementABI.map(item => ({
            name: item.name,
            type: item.type,
            inputs: item.inputs?.length || 0
        })));

        // Initialize contract with validated ABI
        userManagementContract = new web3.eth.Contract(
            config.userManagementABI, 
            config.userManagementAddress
        );

        // Test with a simple call first
        console.log('Testing contract connection...');
        const accounts = await web3.eth.getAccounts();
        const currentAccount = accounts[0];
        
        // Try calling the users mapping - this should be the safest test
        console.log('Calling users mapping for account:', currentAccount);
        const userInfo = await userManagementContract.methods.users(currentAccount).call();
        console.log('✓ Contract connection successful. User info:', userInfo);
        
        return true;
    } catch (error) {
        console.error('Contract initialization failed:', error);
        
        // More specific error handling
        if (error.message.includes('invalid type')) {
            throw new Error('ABI format error. Please redeploy the contract with a fresh ABI.');
        } else if (error.message.includes('revert')) {
            throw new Error('Contract call reverted. Check if the contract is properly deployed.');
        } else {
            throw new Error(Contract initialization failed: ${error.message});
        }
    }
}

async function checkMetaMaskConnection() {
    const messageDiv = document.getElementById('message');
    const loginForm = document.getElementById('loginForm');
    const connectButton = document.getElementById('connectMetaMask');
    const reconnectButton = document.getElementById('reconnectMetaMask');

    // Hide both buttons initially
    connectButton.style.display = 'none';
    reconnectButton.style.display = 'none';

    if (typeof window.ethereum === 'undefined') {
        messageDiv.textContent = 'Please install MetaMask to use this application';
        messageDiv.className = 'message error';
        loginForm.style.display = 'none';
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
                    reconnectButton.style.display = 'block';
                    loginForm.style.display = 'none';
                    return false;
                }

                web3 = new Web3(window.ethereum);
                
                // Load contract configuration
                console.log('Loading contract configuration...');
                const response = await fetch('/contract-config.json');
                if (!response.ok) {
                    throw new Error(Failed to load contract config: ${response.status});
                }
                
                const config = await response.json();
                console.log('Loaded contract config successfully');
                
                // Validate configuration
                if (!config.userManagementABI || !Array.isArray(config.userManagementABI)) {
                    throw new Error('Invalid ABI structure in contract config');
                }
                
                if (!config.userManagementAddress) {
                    throw new Error('Missing contract address in config');
                }
                
                // Check if contract is deployed
                const isDeployed = await checkContractDeployment(config.userManagementAddress);
                if (!isDeployed) {
                    throw new Error(Contract not deployed at address: ${config.userManagementAddress});
                }
                
                // Initialize contract
                await initializeContract(config);
                
                isMetaMaskConnected = true;
                messageDiv.textContent = 'MetaMask Connected to Hardhat Network';
                messageDiv.className = 'message success';
                loginForm.style.display = 'block';
                return true;
                
            } catch (error) {
                console.error('Error initializing Web3:', error);
                messageDiv.textContent = Error: ${error.message};
                messageDiv.className = 'message error';
                reconnectButton.style.display = 'block';
                loginForm.style.display = 'none';
                return false;
            }
        } else {
            messageDiv.textContent = 'Please connect your MetaMask wallet';
            messageDiv.className = 'message error';
            connectButton.style.display = 'block';
            loginForm.style.display = 'none';
            return false;
        }
    } catch (error) {
        console.error('Error checking MetaMask connection:', error);
        messageDiv.textContent = 'Error connecting to MetaMask. Click below to retry.';
        messageDiv.className = 'message error';
        reconnectButton.style.display = 'block';
        loginForm.style.display = 'none';
        return false;
    }
}

async function connectMetaMask() {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = 'Connecting to MetaMask...';
    messageDiv.className = 'message';

    try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        await checkMetaMaskConnection();
    } catch (error) {
        console.error('User denied account access or error occurred:', error);
        messageDiv.textContent = 'Connection failed. Please try again.';
        messageDiv.className = 'message error';
        document.getElementById('connectMetaMask').style.display = 'block';
        document.getElementById('reconnectMetaMask').style.display = 'block';
    }
}

async function reconnectMetaMask() {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = 'Attempting to reconnect...';
    messageDiv.className = 'message';
    
    try {
        if (window.ethereum) {
            web3 = new Web3(window.ethereum);
        }
        await checkMetaMaskConnection();
    } catch (error) {
        console.error('Reconnection failed:', error);
        messageDiv.textContent = 'Reconnection failed. Please try again.';
        messageDiv.className = 'message error';
    }
}

async function performLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const messageDiv = document.getElementById('message');
    
    if (!username || !password) {
        messageDiv.textContent = 'Please enter both username and password';
        messageDiv.className = 'message error';
        return;
    }
    
    try {
        const accounts = await web3.eth.getAccounts();
        const selectedAccount = accounts[0];
        
        console.log('=== LOGIN ATTEMPT ===');
        console.log('Account:', selectedAccount);
        console.log('Username:', username);
        
        messageDiv.textContent = 'Checking credentials...';
        messageDiv.className = 'message';
        
        const hashedPassword = web3.utils.keccak256(web3.utils.utf8ToHex(password));
        console.log('Password hash:', hashedPassword);
        
        // First check if user exists
        console.log('Checking if user exists...');
        const userInfo = await userManagementContract.methods.users(selectedAccount).call();
        console.log('User info:', userInfo);
        
        if (!userInfo.exists) {
            messageDiv.textContent = 'Account not registered. Please register first.';
            messageDiv.className = 'message error';
            return;
        }
        
        // Try login
        console.log('Attempting login...');
        const loginResult = await userManagementContract.methods.login(hashedPassword).call({
            from: selectedAccount
        });
        
        console.log('Login result:', loginResult);
        
        const success = loginResult.success || loginResult[0];
        const userRole = parseInt(loginResult.userRole || loginResult[1]);
        
        if (success) {
            sessionStorage.setItem('userRole', userRole.toString());
            sessionStorage.setItem('userAddress', selectedAccount);
            sessionStorage.setItem('username', username);
            
            messageDiv.textContent = 'Login successful! Redirecting...';
            messageDiv.className = 'message success';
            
            setTimeout(() => {
                if (userRole === 0) {
                    window.location.href = '/student.html';
                } else if (userRole === 1) {
                    window.location.href = '/teacher.html';
                } else {
                    console.error('Unknown user role:', userRole);
                    messageDiv.textContent = 'Unknown user role. Please contact administrator.';
                    messageDiv.className = 'message error';
                }
            }, 1500);
            
        } else {
            messageDiv.textContent = 'Invalid credentials. Please check your password.';
            messageDiv.className = 'message error';
        }
        
    } catch (error) {
        console.error('Login process error:', error);
        messageDiv.textContent = Login error: ${error.message};
        messageDiv.className = 'message error';
    }
}

// Event listener for login form
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!isMetaMaskConnected) {
        await connectMetaMask();
        if (!isMetaMaskConnected) return;
    }
    
    await performLogin();
});

// Event listeners for connection buttons
document.getElementById('connectMetaMask').addEventListener('click', connectMetaMask);
document.getElementById('reconnectMetaMask').addEventListener('click', reconnectMetaMask);

// MetaMask event listeners
if (window.ethereum) {
    window.ethereum.on('accountsChanged', function (accounts) {
        console.log('Accounts changed:', accounts);
        checkMetaMaskConnection();
    });

    window.ethereum.on('chainChanged', function (chainId) {
        console.log('Chain changed:', chainId);
        window.location.reload();
    });

    window.ethereum.on('disconnect', function (error) {
        console.log('MetaMask disconnected:', error);
        isMetaMaskConnected = false;
        checkMetaMaskConnection();
    });
}

// Initialize on page load
window.addEventListener('load', async function() {
    console.log('Page loaded, initializing...');
    await checkMetaMaskConnection();
}); 

window.onload = () => {
    document.getElementById('loginForm').style.display = 'block';
};