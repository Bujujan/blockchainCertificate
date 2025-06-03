let web3;
let certificateContract;
let userManagementContract;

const HARDHAT_CHAIN_ID = '0x7a69'; // Chain ID 31337 in hex

async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            web3 = new Web3(window.ethereum);
            
            // Load contract configurations
            const response = await fetch('/contract-config.json');
            const config = await response.json();
            
            console.log('Contract addresses:', {
                certificate: config.certificateAddress,
                userManagement: config.userManagementAddress
            });

            // Initialize contracts
            certificateContract = new web3.eth.Contract(config.certificateABI, config.certificateAddress);
            userManagementContract = new web3.eth.Contract(config.userManagementABI, config.userManagementAddress);
            
            // Verify contract initialization
            const accounts = await web3.eth.getAccounts();
            console.log('Connected account:', accounts[0]);
            
            try {
                const role = await userManagementContract.methods.getUserRole(accounts[0]).call();
                console.log('User role:', role);
            } catch (error) {
                console.error('Error getting user role:', error);
                document.getElementById('message').textContent = 'Error: You may not be registered as a student. Please contact administrator.';
                document.getElementById('message').className = 'message error';
                return;
            }
            
            // Set up event listeners for form submission
            setupEventListeners();
            
            // Load existing certificates
            loadCertificates();
        } catch (error) {
            console.error('Error initializing Web3:', error);
            document.getElementById('message').textContent = 'Error connecting to blockchain. Please make sure MetaMask is installed and connected.';
            document.getElementById('message').className = 'message error';
        }
    } else {
        document.getElementById('message').textContent = 'Please install MetaMask to use this application.';
        document.getElementById('message').className = 'message error';
    }
}

async function setupEventListeners() {
    const form = document.getElementById('issueCertificateForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const courseName = document.getElementById('courseName').value;
        const certificateFile = document.getElementById('certificateFile').files[0];
        
        if (!certificateFile) {
            document.getElementById('message').textContent = 'Please select a certificate file.';
            document.getElementById('message').className = 'message error';
            return;
        }
        
        try {
            // Upload file to IPFS
            const formData = new FormData();
            formData.append('file', certificateFile);
            
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                const accounts = await web3.eth.getAccounts();
                const certificateId = web3.utils.randomHex(32);
                const issueDate = Math.floor(Date.now() / 1000); // Current timestamp in seconds
                
                console.log('Issuing certificate with params:', {
                    courseName,
                    certificateId,
                    issueDate,
                    ipfsHash: result.ipfsHash,
                    from: accounts[0]
                });

                try {
                    const gas = await certificateContract.methods.issueCertificate(
                        courseName,
                        certificateId,
                        issueDate,
                        result.ipfsHash
                    ).estimateGas({ from: accounts[0] });
                    
                    console.log('Estimated gas:', gas);

                    const tx = await certificateContract.methods.issueCertificate(
                        courseName,
                        certificateId,
                        issueDate,
                        result.ipfsHash
                    ).send({ 
                        from: accounts[0],
                        gas: Math.floor(gas * 1.2) // Add 20% buffer
                    });

                    console.log('Transaction receipt:', tx);
                    
                    document.getElementById('message').textContent = 'Certificate issued successfully!';
                    document.getElementById('message').className = 'message success';
                    
                    // Reload certificates
                    loadCertificates();
                } catch (error) {
                    console.error('Contract error:', error);
                    document.getElementById('message').textContent = `Contract error: ${error.message}`;
                    document.getElementById('message').className = 'message error';
                }
            }
        } catch (error) {
            console.error('Error issuing certificate:', error);
            document.getElementById('message').textContent = 'Error issuing certificate. Please try again.';
            document.getElementById('message').className = 'message error';
        }
    });
}

async function loadCertificates() {
    try {
        const accounts = await web3.eth.getAccounts();
        const certificates = await certificateContract.methods.getCertificatesByStudent(accounts[0]).call();
        
        const certificatesList = document.getElementById('certificatesList');
        certificatesList.innerHTML = '';
        
        certificates.forEach(cert => {
            const certElement = document.createElement('div');
            certElement.className = 'certificate-item';
            certElement.innerHTML = `
                <h4>${cert.courseName}</h4>
                <p>Issue Date: ${new Date(cert.issueDate * 1000).toLocaleDateString()}</p>
                <a href="${cert.ipfsHash}" target="_blank" class="btn">View Certificate</a>
            `;
            certificatesList.appendChild(certElement);
        });
    } catch (error) {
        console.error('Error loading certificates:', error);
    }
}

function logout() {
    window.location.href = '/login.html';
}

// Initialize when page loads
window.addEventListener('load', initializeWeb3);

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', function (accounts) {
        window.location.reload();
    });

    window.ethereum.on('chainChanged', function (chainId) {
        window.location.reload();
    });
} 