let web3;
let certificateContract;
let userManagementContract;

async function initializeWeb3() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            web3 = new Web3(window.ethereum);

            const response = await fetch('/contract-config.json');
            const config = await response.json();

            certificateContract = new web3.eth.Contract(config.certificateABI, config.certificateAddress);
            userManagementContract = new web3.eth.Contract(config.userManagementABI, config.userManagementAddress);

            const accounts = await web3.eth.getAccounts();
            console.log('Connected account:', accounts[0]);

            // Check user role - optional, but good to keep
            try {
                const role = await userManagementContract.methods.getUserRole(accounts[0]).call();
                console.log('User role:', role);
            } catch (error) {
                console.error('Error getting user role:', error);
                showMessage('Error: You may not be registered as a student. Please contact administrator.', 'error');
                return;
            }

            loadCertificates();

        } catch (error) {
            console.error('Error initializing Web3:', error);
            showMessage('Error connecting to blockchain. Please make sure MetaMask is installed and connected.', 'error');
        }
    } else {
        showMessage('Please install MetaMask to use this application.', 'error');
    }
}

async function loadCertificates() {
    try {
        const accounts = await web3.eth.getAccounts();
        let certificates = await certificateContract.methods.getCertificatesByStudent(accounts[0]).call();

        // Sort certificates by issueDate descending (newest first)
        certificates.sort((a, b) => b.issueDate - a.issueDate);

        const tbody = document.getElementById('certificatesBody');
        tbody.innerHTML = '';

        if (certificates.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3">No certificates found.</td></tr>`;
            return;
        }

        certificates.forEach(cert => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cert.courseName}</td>
                <td>${new Date(cert.issueDate * 1000).toLocaleDateString()}</td>
                <td><a href="${cert.ipfsHash}" target="_blank" class="btn">View</a></td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error loading certificates:', error);
        showMessage('Error loading certificates. Please try again.', 'error');
    }
}

function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = msg;
    messageDiv.className = `message ${type}`;
}

function logout() {
    window.location.href = '/login.html';
}

window.addEventListener('load', initializeWeb3);

if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => window.location.reload());
    window.ethereum.on('chainChanged', () => window.location.reload());
}
