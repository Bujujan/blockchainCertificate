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
                const response = await fetch('/contract-config.json');
                if (!response.ok) {
                    throw new Error(`Failed to load contract config: ${response.status}`);
                }
                
                const config = await response.json();
                console.log('Loaded contract config:', config);
                
                // Validate ABI structure
                if (!config.userManagementABI || !Array.isArray(config.userManagementABI)) {
                    throw new Error('Invalid ABI structure in contract config');
                }
                
                // Initialize contract with proper error handling
                userManagementContract = new web3.eth.Contract(
                    config.userManagementABI, 
                    config.userManagementAddress
                );
                
                // Test contract connection
                try {
                    const owner = await userManagementContract.methods.owner().call();
                    console.log('Contract owner (test call):', owner);
                } catch (testError) {
                    console.error('Contract test call failed:', testError);
                    throw new Error('Contract not properly deployed or network issue');
                }
                
                isMetaMaskConnected = true;
                messageDiv.textContent = 'MetaMask Connected to Hardhat Network';
                messageDiv.className = 'message success';
                loginForm.style.display = 'block';
                return true;
                
            } catch (error) {
                console.error('Error initializing Web3:', error);
                messageDiv.textContent = `Error: ${error.message}`;
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

// Comprehensive debug function
async function debugContract() {
    try {
        console.log('=== COMPREHENSIVE CONTRACT DEBUG ===');
        
        if (!web3) {
            console.error('Web3 not initialized');
            return;
        }
        
        if (!userManagementContract) {
            console.error('Contract not initialized');
            return;
        }
        
        // 1. Basic contract info
        console.log('Contract address:', userManagementContract.options.address);
        console.log('Web3 version:', web3.version);
        
        // 2. Test network connection
        const networkId = await web3.eth.net.getId();
        console.log('Network ID:', networkId);
        
        const blockNumber = await web3.eth.getBlockNumber();
        console.log('Latest block:', blockNumber);
        
        // 3. Get accounts
        const accounts = await web3.eth.getAccounts();
        console.log('Available accounts:', accounts);
        const selectedAccount = accounts[0];
        
        // 4. Test contract methods
        console.log('\n=== TESTING CONTRACT METHODS ===');
        
        // Test owner method
        try {
            const owner = await userManagementContract.methods.owner().call();
            console.log('✓ Owner method works:', owner);
        } catch (error) {
            console.error('✗ Owner method failed:', error.message);
        }
        
        // Test getUserRole method
        try {
            console.log('Testing getUserRole with account:', selectedAccount);
            const userRole = await userManagementContract.methods.getUserRole(selectedAccount).call();
            console.log('✓ getUserRole works:', userRole);
        } catch (error) {
            console.error('✗ getUserRole failed:', error.message);
            console.error('Full error:', error);
        }
        
        // Test users mapping
        try {
            console.log('Testing users mapping with account:', selectedAccount);
            const userInfo = await userManagementContract.methods.users(selectedAccount).call();
            console.log('✓ Users mapping works:', userInfo);
        } catch (error) {
            console.error('✗ Users mapping failed:', error.message);
            console.error('Full error:', error);
        }
        
        // 5. Check if user is registered
        console.log('\n=== USER REGISTRATION CHECK ===');
        try {
            const userInfo = await userManagementContract.methods.users(selectedAccount).call();
            if (userInfo && userInfo.exists) {
                console.log('User is registered:', {
                    username: userInfo.username,
                    role: userInfo.role,
                    exists: userInfo.exists
                });
            } else {
                console.log('User is not registered or exists field is false');
            }
        } catch (error) {
            console.error('Could not check user registration:', error.message);
        }
        
    } catch (error) {
        console.error('Debug function error:', error);
    }
}

// Enhanced login function with better error handling
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
        
        // Hash the password
        const hashedPassword = hashPassword(password);
        console.log('Password hash:', hashedPassword);
        
        // Try login method
        try {
            console.log('Calling login method...');
            const loginResult = await userManagementContract.methods.login(hashedPassword).call({
                from: selectedAccount
            });
            
            console.log('Login result:', loginResult);
            
            // Handle different return formats
            let success, userRole;
            if (typeof loginResult === 'object' && loginResult !== null) {
                // If it's an object with named properties
                success = Boolean(loginResult.success);
                userRole = parseInt(loginResult.userRole);
            } else if (Array.isArray(loginResult)) {
                // If it's an array
                success = Boolean(loginResult[0]);
                userRole = parseInt(loginResult[1]);
            } else {
                throw new Error('Unexpected login result format');
            }
            
            if (success) {
                // Store user data
                sessionStorage.setItem('userRole', userRole.toString());
                sessionStorage.setItem('userAddress', selectedAccount);
                sessionStorage.setItem('username', username);
                
                messageDiv.textContent = 'Login successful! Redirecting...';
                messageDiv.className = 'message success';
                
                // Redirect based on role
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
            
        } catch (loginError) {
            console.error('Login method failed:', loginError);
            
            // Try alternative approach - check if user exists first
            try {
                console.log('Trying alternative approach - checking user existence...');
                const userInfo = await userManagementContract.methods.users(selectedAccount).call();
                console.log('User info:', userInfo);
                
                if (!userInfo.exists) {
                    messageDiv.textContent = 'Account not registered. Please register first.';
                    messageDiv.className = 'message error';
                } else {
                    messageDiv.textContent = 'Login failed. Please check your password.';
                    messageDiv.className = 'message error';
                }
            } catch (userCheckError) {
                console.error('User check also failed:', userCheckError);
                messageDiv.textContent = `Login error: ${loginError.message}`;
                messageDiv.className = 'message error';
            }
        }
        
    } catch (error) {
        console.error('Login process error:', error);
        messageDiv.textContent = `Error: ${error.message}`;
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
    
    // Auto-run debug function for development
    if (isMetaMaskConnected) {
        setTimeout(debugContract, 1000);
    }
});

// Expose debug function globally for console access
window.debugContract = debugContract;
window.performLogin = performLogin;