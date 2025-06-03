let web3;
let contract;
let contractConfig;

async function loadContractConfig() {
    try {
        const response = await fetch('/contract-config.json');
        contractConfig = await response.json();
        return true;
    } catch (error) {
        console.error('Error loading contract config:', error);
        return false;
    }
}

async function init() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Load contract config
            const configLoaded = await loadContractConfig();
            if (!configLoaded) {
                throw new Error('Failed to load contract configuration');
            }

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            web3 = new Web3(window.ethereum);
            contract = new web3.eth.Contract(contractConfig.abi, contractConfig.address);
        } catch (error) {
            console.error('Error initializing:', error);
            showStatus('Error initializing: ' + error.message, true);
        }
    } else {
        console.error('Please install MetaMask');
        showStatus('Please install MetaMask', true);
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`button[onclick="showTab('${tabName}')"]`).classList.add('active');
}

function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('issueStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message ' + (isError ? 'error' : 'success');
}

document.getElementById('issueForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const studentName = document.getElementById('studentName').value;
    const courseName = document.getElementById('courseName').value;
    const certificateId = document.getElementById('certificateId').value;
    const issueDate = new Date(document.getElementById('issueDate').value).getTime() / 1000;
    const certificateImage = document.getElementById('certificateImage').files[0];

    try {
        const accounts = await web3.eth.getAccounts();
        
        // Upload image to IPFS through our server
        const formData = new FormData();
        formData.append('certificateImage', certificateImage);
        formData.append('certificateId', certificateId);
        formData.append('studentName', studentName);
        formData.append('courseName', courseName);
        formData.append('issueDate', issueDate * 1000);

        const response = await fetch('http://localhost:2444/api/certificate', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message);
        }

        // Issue certificate on blockchain with IPFS hash
        await contract.methods.issueCertificate(
            studentName,
            courseName,
            certificateId,
            issueDate,
            result.ipfsHash
        ).send({ from: accounts[0] });

        showStatus('Certificate issued successfully!');
        e.target.reset();
    } catch (error) {
        console.error(error);
        showStatus('Error issuing certificate: ' + error.message, true);
    }
});

document.getElementById('verifyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const certificateId = document.getElementById('verifyCertificateId').value;
    const resultContainer = document.getElementById('verificationResult');

    try {
        // Verify on blockchain
        const blockchainResult = await contract.methods.verifyCertificate(certificateId).call();
        
        resultContainer.innerHTML = `
            <h3>Certificate Verified ✓</h3>
            <p><strong>Student Name:</strong> ${blockchainResult.studentName}</p>
            <p><strong>Course Name:</strong> ${blockchainResult.courseName}</p>
            <p><strong>Issue Date:</strong> ${new Date(blockchainResult.issueDate * 1000).toLocaleDateString()}</p>
            <img src="http://localhost:2444/api/certificate/${blockchainResult.ipfsHash}" alt="Certificate" class="certificate-image">
        `;
        resultContainer.classList.add('active');
    } catch (error) {
        console.error(error);
        resultContainer.innerHTML = '<p>Error verifying certificate: ' + error.message + '</p>';
        resultContainer.classList.add('active');
    }
});

init();
