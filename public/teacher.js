let web3;
let certificateContract;
let userManagementContract;
let currentCertificateId;

async function init() {
    if (!localStorage.getItem('userRole') || localStorage.getItem('userRole') !== '1') {
        window.location.href = '/login.html';
        return;
    }

    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            
            const response = await fetch('/contract-config.json');
            const config = await response.json();
            
            certificateContract = new web3.eth.Contract(config.certificateABI, config.certificateAddress);
            userManagementContract = new web3.eth.Contract(config.userManagementABI, config.userManagementAddress);
            
            loadPendingCertificates();
        } catch (error) {
            console.error('Error initializing Web3:', error);
            document.getElementById('message').textContent = 'Error connecting to blockchain';
        }
    } else {
        document.getElementById('message').textContent = 'Please install MetaMask';
    }
}

async function loadPendingCertificates() {
    try {
        const pendingCertificates = await certificateContract.methods.getPendingCertificates().call();
        const pendingContainer = document.getElementById('pendingCertificates');
        pendingContainer.innerHTML = '';
        
        if (pendingCertificates.length === 0) {
            pendingContainer.innerHTML = '<p>No pending certificates</p>';
            return;
        }
        
        for (const cert of pendingCertificates) {
            const card = document.createElement('div');
            card.className = 'certificate-card';
            card.innerHTML = `
                <h4>${cert.courseName}</h4>
                <p>Student: ${cert.studentName}</p>
                <p>Date: ${new Date(cert.issueDate * 1000).toLocaleDateString()}</p>
                <button onclick="viewCertificate('${cert.certificateId}')" class="btn">View Details</button>
            `;
            pendingContainer.appendChild(card);
        }
    } catch (error) {
        console.error('Error loading pending certificates:', error);
    }
}

async function viewCertificate(certificateId) {
    try {
        const certificate = await certificateContract.methods.getCertificate(certificateId).call();
        currentCertificateId = certificateId;
        
        document.getElementById('studentName').textContent = certificate.studentName;
        document.getElementById('courseName').textContent = certificate.courseName;
        document.getElementById('submissionDate').textContent = 
            new Date(certificate.issueDate * 1000).toLocaleDateString();
        
        // Load certificate from IPFS
        document.getElementById('certificatePreview').src = `https://ipfs.io/ipfs/${certificate.ipfsHash}`;
        
        document.getElementById('certificateDetails').style.display = 'block';
    } catch (error) {
        console.error('Error viewing certificate:', error);
    }
}

async function verifyCertificate(isApproved) {
    if (!currentCertificateId) return;
    
    try {
        const accounts = await web3.eth.getAccounts();
        await certificateContract.methods.verifyCertificate(currentCertificateId, isApproved)
            .send({ from: accounts[0] });
        
        document.getElementById('certificateDetails').style.display = 'none';
        loadPendingCertificates();
    } catch (error) {
        console.error('Error verifying certificate:', error);
    }
}

function logout() {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userAddress');
    window.location.href = '/login.html';
}

// Initialize on page load
init(); 